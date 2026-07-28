'use strict';

/**
 * The whole parser lives inside this factory so the build script can serialize
 * the same implementation into the browser bundles. Keep runtime helpers
 * inside the factory and do not add Node-only APIs here.
 */
function createAddressParserEngine(divisionData, engineOptions = {}) {
  const PARSER_VERSION = '4.0.1';
  const DATA_VERSION = engineOptions.dataVersion || 'legacy-address-code-v1';
  const LEVELS = ['province', 'city', 'county', 'street'];
  const LEVEL_WEIGHT = {
    province: 0.22,
    city: 0.24,
    county: 0.3,
    street: 0.34,
  };
  const ADMIN_SUFFIX =
    /(?:特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|蒙古族藏族自治州|哈萨克自治州|自治州|自治县|自治旗|街道办事处|街道|民族乡|地区|林区|特区|新区|苏木|盟|省|市|区|县|旗|镇|乡)$/;
  const DETAIL_WORDS =
    /(?:路|街|巷|道|号|栋|幢|楼|室|单元|村|组|队|园|苑|城|厦|广场|中心|公司|商店|门店|学校|医院|小区|社区|大队|开发区)/;
  const GENERIC_ADMIN_NAMES = new Set([
    '省',
    '市',
    '区',
    '县',
    '旗',
    '街道',
    '镇',
    '乡',
    '苏木',
  ]);
  const LABEL_WORDS =
    /(?:收货地址|收件地址|退货地址|所在地区|所在地|联系地址|送货地址|详细地址|收货人|收件人|联系人|联系电话|手机号码|手机号|手机|电话|邮编|姓名|地址)\s*[:：]?/g;

  if (!Array.isArray(divisionData)) {
    throw new TypeError('division data must be an array');
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round3(value) {
    return Math.round(value * 1000) / 1000;
  }

  function normalizeText(input) {
    if (typeof input !== 'string') {
      throw new TypeError('input must be a string');
    }
    return input
      .normalize('NFKC')
      .replace(/[‐‑‒–—－_]/g, '-')
      .replace(/[，,；;|/\\\r\n\t]+/g, ' ')
      .replace(/[“”"'`<>《》【】\[\]{}()（）]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function canonicalName(node, depth, ancestors) {
    if (
      depth === 1 &&
      (node.name === '市辖区' || node.name === '县') &&
      ancestors[0] &&
      ['北京市', '天津市', '上海市', '重庆市'].includes(ancestors[0].name)
    ) {
      return ancestors[0].name;
    }
    return String(node.name || '').trim();
  }

  function aliasesFor(division) {
    const normalizedName = normalizeText(division.name);
    const aliases = new Set([normalizedName]);
    const stripped = normalizedName.replace(ADMIN_SUFFIX, '');
    if (stripped.length >= 2) aliases.add(stripped);

    if (division.level === 'province') {
      const commonProvinceAliases = [
        ['内蒙古', '内蒙古自治区'],
        ['新疆', '新疆维吾尔自治区'],
        ['广西', '广西壮族自治区'],
        ['宁夏', '宁夏回族自治区'],
        ['西藏', '西藏自治区'],
      ];
      for (const [alias, name] of commonProvinceAliases) {
        if (division.name === name) aliases.add(alias);
      }
    }

    const customAliases = engineOptions.aliases || {};
    const configured = customAliases[division.code];
    if (Array.isArray(configured)) {
      for (const alias of configured) {
        const normalized = normalizeText(String(alias));
        if (normalized.length >= 2) aliases.add(normalized);
      }
    }
    return [...aliases].filter((alias) => !GENERIC_ADMIN_NAMES.has(alias));
  }

  function pathIsPrefix(shorter, longer) {
    if (shorter.length > longer.length) return false;
    for (let index = 0; index < shorter.length; index += 1) {
      if (shorter[index].code !== longer[index].code) return false;
    }
    return true;
  }

  function pathsCompatible(left, right) {
    return pathIsPrefix(left, right) || pathIsPrefix(right, left);
  }

  function hashString(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
  }

  function isIdentityCard(value) {
    if (!/^\d{17}[\dX]$/i.test(value)) return false;
    const provinceCodes = new Set([
      '11', '12', '13', '14', '15', '21', '22', '23', '31', '32', '33',
      '34', '35', '36', '37', '41', '42', '43', '44', '45', '46', '50',
      '51', '52', '53', '54', '61', '62', '63', '64', '65', '71', '81',
      '82', '91',
    ]);
    if (!provinceCodes.has(value.slice(0, 2))) return false;
    const factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const parity = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    let sum = 0;
    for (let index = 0; index < 17; index += 1) {
      sum += Number(value[index]) * factors[index];
    }
    return parity[sum % 11] === value[17].toUpperCase();
  }

  function overlaps(span, spans) {
    return spans.some((current) => span.start < current.end && current.start < span.end);
  }

  function extractEntities(text, options) {
    const occupied = [];
    const result = {
      phone: undefined,
      idCard: undefined,
      postalCode: undefined,
      name: undefined,
      spans: occupied,
      warnings: [],
    };

    const identityPattern = /\d{17}[\dX]/gi;
    for (const match of text.matchAll(identityPattern)) {
      const value = match[0].toUpperCase();
      const span = { type: 'idCard', value, start: match.index, end: match.index + value.length };
      if (isIdentityCard(value)) {
        if (!result.idCard && options.extractIdCard !== false) result.idCard = value;
        occupied.push(span);
      }
    }

    const phonePatterns = [
      /(?:\+?86[\s-]?)?1[3-9]\d(?:[\s-]?\d){8}/g,
      /0\d{2,3}[\s-]?\d{7,8}(?:[\s-]\d{1,6})?/g,
    ];
    const phones = [];
    for (const pattern of phonePatterns) {
      for (const match of text.matchAll(pattern)) {
        const start = match.index;
        const end = start + match[0].length;
        if (/\d/.test(text[start - 1] || '') || /\d/.test(text[end] || '')) continue;
        const span = {
          type: 'phone',
          value: match[0].replace(/\D/g, '').replace(/^86(?=1\d{10}$)/, ''),
          start,
          end,
        };
        if (!overlaps(span, occupied)) phones.push(span);
      }
    }
    phones.sort((left, right) => left.start - right.start);
    if (phones.length > 0) {
      result.phone = phones[0].value;
      occupied.push(...phones);
      if (phones.length > 1) result.warnings.push('MULTIPLE_PHONES');
    }

    const postalPattern = /\d{6}/g;
    for (const match of text.matchAll(postalPattern)) {
      const start = match.index;
      const end = start + 6;
      if (/\d/.test(text[start - 1] || '') || /\d/.test(text[end] || '')) continue;
      const span = { type: 'postalCode', value: match[0], start, end };
      if (!overlaps(span, occupied)) {
        if (!result.postalCode) result.postalCode = span.value;
        occupied.push(span);
      }
    }

    const namePattern =
      /(?:收货人|收件人|联系人|姓名)\s*[:：]?\s*([\u3400-\u9fff·]{2,6})(?=\s|$|[,，;；|])/g;
    const nameMatch = namePattern.exec(text);
    if (nameMatch) {
      const relativeStart = nameMatch[0].lastIndexOf(nameMatch[1]);
      const start = nameMatch.index + relativeStart;
      const span = {
        type: 'name',
        value: nameMatch[1],
        start,
        end: start + nameMatch[1].length,
      };
      result.name = span.value;
      occupied.push(span);
    }

    occupied.sort((left, right) => left.start - right.start);
    return result;
  }

  function makeIndex(data) {
    const aliasMap = new Map();
    const divisionsByCode = new Map();
    let maxAliasLength = 2;

    function addAlias(alias, division, path) {
      if (!alias || alias.length < 2) return;
      if (!aliasMap.has(alias)) aliasMap.set(alias, []);
      aliasMap.get(alias).push({
        division,
        path,
        alias,
        fullName: alias === normalizeText(division.name),
      });
      maxAliasLength = Math.max(maxAliasLength, alias.length);
    }

    function walk(node, depth, ancestors) {
      if (depth >= LEVELS.length) return;
      const name = canonicalName(node, depth, ancestors);
      if (!name || node.code === undefined || node.code === null) return;
      const division = Object.freeze({
        code: String(node.code),
        name,
        level: LEVELS[depth],
      });
      const path = Object.freeze([...ancestors, division]);
      divisionsByCode.set(division.code, division);
      for (const alias of aliasesFor(division)) addAlias(alias, division, path);
      for (const child of node.children || []) walk(child, depth + 1, path);
    }

    for (const root of data) walk(root, 0, []);
    return { aliasMap, divisionsByCode, maxAliasLength };
  }

  const index = makeIndex(divisionData);

  function findDivisionMatches(text) {
    const matches = [];
    const seen = new Set();
    for (let start = 0; start < text.length; start += 1) {
      const maxEnd = Math.min(text.length, start + index.maxAliasLength);
      for (let end = start + 2; end <= maxEnd; end += 1) {
        const matchedText = text.slice(start, end);
        const entries = index.aliasMap.get(matchedText);
        if (!entries) continue;
        for (const entry of entries) {
          const key = `${start}:${end}:${entry.division.code}:${entry.alias}`;
          if (seen.has(key)) continue;
          seen.add(key);
          matches.push({
            ...entry,
            matchedText,
            start,
            end,
            explicitSuffix: ADMIN_SUFFIX.test(matchedText),
          });
        }
      }
    }
    return matches;
  }

  function chooseEvidence(path, allMatches) {
    const compatible = allMatches.filter((match) => pathsCompatible(path, match.path));
    const byLevel = new Map();
    for (const match of compatible) {
      const previous = byLevel.get(match.division.level);
      const quality =
        match.matchedText.length +
        (match.fullName ? 100 : 0) +
        (match.explicitSuffix ? 20 : 0);
      const previousQuality = previous
        ? previous.matchedText.length +
          (previous.fullName ? 100 : 0) +
          (previous.explicitSuffix ? 20 : 0)
        : -1;
      if (quality > previousQuality) byLevel.set(match.division.level, match);
    }
    return [...byLevel.values()].sort((left, right) => {
      const levelOrder = LEVELS.indexOf(left.division.level) - LEVELS.indexOf(right.division.level);
      return levelOrder || left.start - right.start;
    });
  }

  function scoreCandidate(path, evidence) {
    const reasons = [];
    let score = 0;
    for (const match of evidence) {
      score += LEVEL_WEIGHT[match.division.level];
      if (match.fullName) {
        score += 0.05;
        reasons.push(`FULL_${match.division.level.toUpperCase()}_MATCH`);
      } else {
        score -= 0.1;
        reasons.push(`ALIAS_${match.division.level.toUpperCase()}_MATCH`);
      }
      if (match.explicitSuffix) score += 0.02;
    }

    const matchedLevels = new Set(evidence.map((match) => match.division.level));
    const inferredParents = path
      .slice(0, Math.max(0, path.length - 1))
      .filter((division) => !matchedLevels.has(division.level)).length;
    if (inferredParents > 0) {
      score -= inferredParents * 0.03;
      reasons.push('INFERRED_PARENT_LEVELS');
    }

    let ordered = true;
    let adjacentPairs = 0;
    for (let index = 1; index < evidence.length; index += 1) {
      if (evidence[index].start < evidence[index - 1].start) ordered = false;
      const gap = evidence[index].start - evidence[index - 1].end;
      if (gap >= 0 && gap <= 2) adjacentPairs += 1;
    }
    if (evidence.length > 1 && ordered) {
      score += 0.05;
      reasons.push('ORDERED_LEVELS');
    }
    if (adjacentPairs > 0) {
      score += Math.min(0.06, adjacentPairs * 0.02);
      reasons.push('ADJACENT_LEVELS');
    }
    if (matchedLevels.size >= 3) reasons.push('STRONG_HIERARCHY');

    return {
      score,
      confidence: clamp(Math.round(score * 1000) / 1000, 0.01, 0.99),
      reasons,
      inferredParents,
    };
  }

  function markSpan(mask, span) {
    const start = clamp(span.start, 0, mask.length);
    const end = clamp(span.end, start, mask.length);
    for (let index = start; index < end; index += 1) mask[index] = true;
  }

  function looksLikeName(token) {
    return (
      /^[\u3400-\u9fff·]{2,4}$/.test(token) &&
      !DETAIL_WORDS.test(token) &&
      !ADMIN_SUFFIX.test(token)
    );
  }

  function assembleTextFields(text, entities, evidence) {
    const mask = new Array(text.length).fill(false);
    for (const span of entities.spans) markSpan(mask, span);
    for (const span of evidence) markSpan(mask, span);

    let residual = '';
    for (let index = 0; index < text.length; index += 1) {
      residual += mask[index] ? ' ' : text[index];
    }
    residual = residual
      .replace(LABEL_WORDS, ' ')
      .replace(/[:：,，;；|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let name = entities.name;
    let tokens = residual ? residual.split(' ') : [];
    if (!name && tokens.length > 1) {
      for (let index = tokens.length - 1; index >= 0; index -= 1) {
        if (looksLikeName(tokens[index])) {
          name = tokens[index];
          tokens = tokens.filter((_, tokenIndex) => tokenIndex !== index);
          break;
        }
      }
    }

    const detail = tokens.join('').trim() || undefined;
    return { name, detail };
  }

  function divisionResult(division, evidence, candidateConfidence) {
    const match = evidence.find((item) => item.division.level === division.level);
    return {
      code: division.code,
      name: division.name,
      confidence: match
        ? round3(clamp(candidateConfidence + (match.fullName ? 0.06 : 0), 0.01, 0.99))
        : round3(clamp(candidateConfidence * 0.72, 0.01, 0.99)),
      matched: Boolean(match),
      matchedText: match ? match.matchedText : undefined,
    };
  }

  function parseAddress(input, dataOrOptions = {}, customDataOptions = {}) {
    if (Array.isArray(dataOrOptions)) {
      const customParser = createAddressParserEngine(dataOrOptions, {
        ...engineOptions,
        dataVersion: customDataOptions.dataVersion || 'custom',
        aliases: customDataOptions.aliases,
      });
      return customParser.parseAddress(input, customDataOptions);
    }
    const options = dataOrOptions || {};
    const normalizedInput = normalizeText(input);
    if (!normalizedInput) return [];

    const entities = extractEntities(normalizedInput, options);
    const divisionMatches = findDivisionMatches(normalizedInput);
    if (divisionMatches.length === 0) return [];

    const fullMatches = divisionMatches.filter((match) => match.fullName);
    const contextualAliasMatches = divisionMatches.filter((match) => {
      if (match.fullName || match.matchedText.length < 3) return false;
      return fullMatches.some((fullMatch) => {
        if (!pathsCompatible(match.path, fullMatch.path)) return false;
        const gap = Math.max(
          0,
          fullMatch.start - match.end,
          match.start - fullMatch.end,
        );
        return gap <= 2;
      });
    });
    const strongMatches = [...fullMatches, ...contextualAliasMatches];
    const maximalFullMatches = strongMatches.filter(
      (match) =>
        !strongMatches.some(
          (other) =>
            other !== match &&
            other.start <= match.start &&
            other.end >= match.end &&
            other.end - other.start > match.end - match.start,
        ),
    );
    const anchorGroups = new Map();
    for (const match of maximalFullMatches) {
      const key = `${match.start}:${match.end}:${match.matchedText}`;
      if (!anchorGroups.has(key)) anchorGroups.set(key, []);
      anchorGroups.get(key).push(match);
    }

    const candidatePaths = new Map();
    for (const match of divisionMatches) {
      const key = match.path.map((division) => division.code).join('/');
      candidatePaths.set(key, match.path);
    }

    const allPaths = [...candidatePaths.values()];
    const paths = allPaths.filter((path) => {
      const satisfiesAnchors = [...anchorGroups.values()].every((group) =>
        group.some((match) => pathsCompatible(path, match.path)),
      );
      if (!satisfiesAnchors) return false;
      return !allPaths.some(
        (other) =>
          other.length > path.length &&
          pathIsPrefix(path, other) &&
          [...anchorGroups.values()].every((group) =>
            group.some((match) => pathsCompatible(other, match.path)),
          ),
      );
    });

    const minConfidence = Number.isFinite(options.minConfidence)
      ? clamp(options.minConfidence, 0, 1)
      : 0.18;
    const configuredLimit = Number.isInteger(options.maxCandidates)
      ? options.maxCandidates
      : 20;
    const maxCandidates = clamp(configuredLimit, 1, 100);

    const candidates = [];
    for (const path of paths) {
      const evidence = chooseEvidence(path, divisionMatches);
      const fullMatches = evidence.filter((match) => match.fullName).length;
      if (fullMatches === 0 && evidence.length < 2) continue;

      const scored = scoreCandidate(path, evidence);
      if (scored.confidence < minConfidence) continue;
      const textFields = assembleTextFields(normalizedInput, entities, evidence);
      const result = {
        candidateId: `asp-${hashString(path.map((division) => division.code).join('/'))}`,
        rank: 0,
        name: textFields.name,
        phone: entities.phone,
        idCard: options.extractIdCard === false ? undefined : entities.idCard,
        postalCode: entities.postalCode,
        detail: textFields.detail,
        confidence: scored.confidence,
        scoreReasons: scored.reasons,
        warnings: [...entities.warnings],
      };
      for (const division of path) {
        result[division.level] = divisionResult(division, evidence, scored.confidence);
      }
      if (scored.inferredParents > 0) result.warnings.push('INFERRED_ADMIN_LEVELS');
      if (scored.confidence < 0.5) result.warnings.push('LOW_CONFIDENCE');
      candidates.push(result);
    }

    candidates.sort(
      (left, right) =>
        right.confidence - left.confidence ||
        String(left.candidateId).localeCompare(String(right.candidateId)),
    );
    const ambiguous = candidates.length > 1;
    const truncated = candidates.length > maxCandidates;
    const results = candidates.slice(0, maxCandidates);
    results.forEach((candidate, index) => {
      candidate.rank = index + 1;
      if (ambiguous) candidate.warnings.push('AMBIGUOUS_ADDRESS');
      if (truncated) candidate.warnings.push('CANDIDATES_TRUNCATED');
      candidate.warnings = [...new Set(candidate.warnings)];
    });
    return results;
  }

  function parseAddressBatch(inputs, dataOrOptions = {}, customDataOptions = {}) {
    if (!Array.isArray(inputs)) throw new TypeError('inputs must be an array');
    if (Array.isArray(dataOrOptions)) {
      const customParser = createAddressParserEngine(dataOrOptions, {
        ...engineOptions,
        dataVersion: customDataOptions.dataVersion || 'custom',
        aliases: customDataOptions.aliases,
      });
      return customParser.parseAddressBatch(inputs, customDataOptions);
    }
    const options = dataOrOptions || {};
    return inputs.map((input, index) => ({
      index,
      results: parseAddress(input, options),
      warnings: [],
    }));
  }

  function createParser(options = {}) {
    const data = options.divisions || divisionData;
    return createAddressParserEngine(data, {
      ...engineOptions,
      ...options,
    });
  }

  return Object.freeze({
    parseAddress,
    parseAddressBatch,
    createParser,
    PARSER_VERSION,
    DATA_VERSION,
  });
}

module.exports = { createAddressParserEngine };

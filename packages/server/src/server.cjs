'use strict';

const http = require('node:http');
const { randomUUID } = require('node:crypto');

class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  });
  res.end(body);
}

function readJsonBody(req, bodyLimit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > bodyLimit) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        reject(new HttpError(413, 'PAYLOAD_TOO_LARGE', 'request body is too large'));
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new HttpError(400, 'INVALID_JSON', 'request body must be valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function safeParseOptions(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'INVALID_OPTIONS', 'options must be an object');
  }
  const options = {};
  if (value.minConfidence !== undefined) {
    if (
      typeof value.minConfidence !== 'number' ||
      value.minConfidence < 0 ||
      value.minConfidence > 1
    ) {
      throw new HttpError(
        400,
        'INVALID_OPTIONS',
        'minConfidence must be between 0 and 1',
      );
    }
    options.minConfidence = value.minConfidence;
  }
  if (value.maxCandidates !== undefined) {
    if (
      !Number.isInteger(value.maxCandidates) ||
      value.maxCandidates < 1 ||
      value.maxCandidates > 100
    ) {
      throw new HttpError(
        400,
        'INVALID_OPTIONS',
        'maxCandidates must be an integer between 1 and 100',
      );
    }
    options.maxCandidates = value.maxCandidates;
  }
  if (value.extractIdCard !== undefined) {
    if (typeof value.extractIdCard !== 'boolean') {
      throw new HttpError(400, 'INVALID_OPTIONS', 'extractIdCard must be boolean');
    }
    options.extractIdCard = value.extractIdCard;
  }
  return options;
}

function validateText(value, textLimit) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'INVALID_INPUT', 'text must be a non-empty string');
  }
  if (value.length > textLimit) {
    throw new HttpError(413, 'TEXT_TOO_LARGE', `text cannot exceed ${textLimit} characters`);
  }
  return value;
}

function createRequestHandler(config = {}) {
  const sdk = config.parser || require('address-smart-parse');
  const bodyLimit = config.bodyLimit || 256 * 1024;
  const batchLimit = config.batchLimit || 100;
  const textLimit = config.textLimit || 2000;
  const allowedOrigins = new Set(config.allowedOrigins || []);

  return async function requestHandler(req, res) {
    const requestId = req.headers['x-request-id'] || randomUUID();
    const origin = req.headers.origin;
    const corsHeaders =
      origin && allowedOrigins.has(origin)
        ? {
            'access-control-allow-origin': origin,
            vary: 'Origin',
          }
        : {};

    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'OPTIONS') {
        sendJson(
          res,
          204,
          {},
          {
            ...corsHeaders,
            'access-control-allow-methods': 'GET, POST, OPTIONS',
            'access-control-allow-headers': 'content-type, x-request-id',
          },
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/healthz') {
        sendJson(res, 200, { status: 'ok' }, corsHeaders);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/readyz') {
        sendJson(
          res,
          200,
          {
            status: 'ready',
            parserVersion: sdk.PARSER_VERSION,
            dataVersion: sdk.DATA_VERSION,
          },
          corsHeaders,
        );
        return;
      }
      if (req.method === 'GET' && url.pathname === '/version') {
        sendJson(
          res,
          200,
          {
            parserVersion: sdk.PARSER_VERSION,
            dataVersion: sdk.DATA_VERSION,
          },
          corsHeaders,
        );
        return;
      }

      if (req.method !== 'POST') {
        throw new HttpError(404, 'NOT_FOUND', 'route not found');
      }
      const contentType = String(req.headers['content-type'] || '').toLowerCase();
      if (!contentType.startsWith('application/json')) {
        throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'content-type must be application/json');
      }

      const body = await readJsonBody(req, bodyLimit);
      const parseOptions = safeParseOptions(body.options);

      if (url.pathname === '/v1/parse') {
        const text = validateText(body.text, textLimit);
        const results = sdk.parseAddress(text, parseOptions);
        sendJson(
          res,
          200,
          {
            requestId,
            data: {
              parserVersion: sdk.PARSER_VERSION,
              dataVersion: sdk.DATA_VERSION,
              results,
              warnings: results.length === 0 ? ['NO_MATCH'] : [],
            },
          },
          corsHeaders,
        );
        return;
      }

      if (url.pathname === '/v1/parse/batch') {
        if (!Array.isArray(body.items)) {
          throw new HttpError(400, 'INVALID_INPUT', 'items must be an array');
        }
        if (body.items.length > batchLimit) {
          throw new HttpError(
            413,
            'BATCH_TOO_LARGE',
            `items cannot contain more than ${batchLimit} entries`,
          );
        }
        const items = body.items.map((item, index) => {
          try {
            if (!item || typeof item !== 'object') {
              throw new HttpError(400, 'INVALID_INPUT', 'batch item must be an object');
            }
            const text = validateText(item.text, textLimit);
            const results = sdk.parseAddress(text, parseOptions);
            return {
              id: item.id === undefined ? String(index) : String(item.id),
              results,
              warnings: results.length === 0 ? ['NO_MATCH'] : [],
            };
          } catch (error) {
            return {
              id: item && item.id !== undefined ? String(item.id) : String(index),
              results: [],
              error: {
                code: error.code || 'INVALID_INPUT',
                message: error.message,
              },
            };
          }
        });
        sendJson(
          res,
          200,
          {
            requestId,
            data: {
              parserVersion: sdk.PARSER_VERSION,
              dataVersion: sdk.DATA_VERSION,
              items,
            },
          },
          corsHeaders,
        );
        return;
      }

      throw new HttpError(404, 'NOT_FOUND', 'route not found');
    } catch (error) {
      const statusCode = error.statusCode || 500;
      sendJson(
        res,
        statusCode,
        {
          requestId,
          error: {
            code: error.code || 'INTERNAL_ERROR',
            message: statusCode === 500 ? 'internal server error' : error.message,
          },
        },
        corsHeaders,
      );
    }
  };
}

function createSmartParseServer(config = {}) {
  const host = config.host || '127.0.0.1';
  const port = Number(config.port || 1399);
  const handler = createRequestHandler(config);
  const server = http.createServer(handler);

  return {
    server,
    start() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.removeListener('error', reject);
          resolve({ host, port });
        });
      });
    },
    stop() {
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

module.exports = {
  createRequestHandler,
  createSmartParseServer,
};

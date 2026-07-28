FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/sdk/dist packages/sdk/dist
COPY packages/sdk/README.md packages/sdk/README.md
COPY packages/sdk/LICENSE packages/sdk/LICENSE
COPY packages/server/package.json packages/server/package.json
COPY packages/server/src packages/server/src
COPY packages/server/bin packages/server/bin
RUN npm install --omit=dev

USER node
EXPOSE 1399
CMD ["node", "packages/server/bin/smart-parse-server.cjs"]

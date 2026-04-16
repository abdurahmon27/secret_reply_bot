FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S anonbot && adduser -S anonbot -G anonbot \
 && mkdir -p /app/logs && chown -R anonbot:anonbot /app

COPY --from=deps --chown=anonbot:anonbot /app/node_modules ./node_modules
COPY --chown=anonbot:anonbot package.json ./
COPY --chown=anonbot:anonbot src ./src

USER anonbot

CMD ["node", "src/app.js"]

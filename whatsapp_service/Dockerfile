# Pharvix WhatsApp service — Baileys (no browser needed, unlike whatsapp-web.js).
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Baileys writes its pairing credentials here via useMultiFileAuthState.
# docker-compose mounts a named volume over it — without that, every container
# restart loses the pairing and the QR has to be scanned again.
RUN mkdir -p /app/auth_info_baileys \
    && addgroup -g 10001 -S pharvix && adduser -u 10001 -S pharvix -G pharvix \
    && chown -R pharvix:pharvix /app
USER pharvix

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://localhost:3001/health || exit 1

CMD ["npm", "start"]

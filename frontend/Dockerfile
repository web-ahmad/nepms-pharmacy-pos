# Pharvix frontend — Next.js 16 (standalone server output).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined at build time, so they must be present here
# and not only at runtime. Empty API URL on purpose: nginx serves the app and
# the API from the same origin, so the browser can use relative paths.
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# `next build` evaluates next.config.ts and serialises the rewrite destinations
# into the standalone output, so BACKEND_ORIGIN has to be right HERE — setting
# it only at runtime leaves the 127.0.0.1 fallback baked in, and every proxied
# request dies with ECONNREFUSED inside the container.
ARG BACKEND_ORIGIN="http://backend:8000"
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -g 10001 -S pharvix && adduser -u 10001 -S pharvix -G pharvix

# `output: 'standalone'` emits a self-contained server plus only the node_modules
# it actually needs — a fraction of a full install.
COPY --from=builder --chown=pharvix:pharvix /app/.next/standalone ./
COPY --from=builder --chown=pharvix:pharvix /app/.next/static ./.next/static
COPY --from=builder --chown=pharvix:pharvix /app/public ./public

USER pharvix
EXPOSE 3000
CMD ["node", "server.js"]

# Copyright (c) 2026 Eduardo Emiliano Alaniz - AllSafe Security Solutions
# SPDX-License-Identifier: AGPL-3.0-only

# Stage 1: build frontend
FROM node:24-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# Stage 2: backend runtime
FROM node:24-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production --silent
COPY backend/ ./
COPY --from=frontend-builder /app/dist /frontend/dist
# Certificado autofirmado propio de cada build para la trampa HTTPS (:443). Sin él, el 443 queda apagado.
RUN apk add --no-cache openssl \
 && mkdir -p ssl \
 && [ -f ssl/key.pem ] || openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem \
      -days 3650 -nodes -subj "/CN=localhost" 2>/dev/null
EXPOSE 3005 80 443
CMD ["node", "server.js"]

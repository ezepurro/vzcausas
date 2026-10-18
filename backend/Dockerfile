# ─────────────────────────────
# 0. Base
# ─────────────────────────────

FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# ─────────────────────────────
# 1. Development
# ─────────────────────────────

FROM base AS development
ENV NODE_ENV=development

RUN npm ci

# Sin COPY del código ni prisma generate: en desarrollo docker-compose monta
# ../backend sobre /app, así que de la imagen solo se usa node_modules. Copiar
# el código solo servía para que cualquier cambio invalidara la caché del
# build. El cliente de Prisma (src/generated) lo genera el servicio migrate al
# levantar. Un stage de producción, si se agrega, sí necesita ambos pasos.

EXPOSE 3000
CMD ["npm", "run", "start:dev"]

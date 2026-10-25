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
# levantar. El stage de producción (más abajo) sí necesita ambos pasos.

EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ─────────────────────────────
# 2. Build
# ─────────────────────────────

FROM base AS build

RUN npm ci
COPY . .

# prisma.config.ts lee DATABASE_URL al cargarse, aunque generate no se
# conecta a la base. La URL es un placeholder que vive solo en este RUN: no
# queda en ninguna capa de la imagen final.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate
RUN npm run build
# El seed corre en cada deploy (catálogo y bootstrap del primer
# administrador). En desarrollo lo ejecuta ts-node, que es devDependency:
# acá se compila a JS para correrlo con node en la imagen final.
RUN npx tsc -p tsconfig.seed.json
RUN npm prune --omit=dev

# ─────────────────────────────
# 3. Production
# ─────────────────────────────

# Último stage a propósito: sin --target (como construye Render) Docker arma
# este. docker-compose pide development por nombre, así que no lo afecta.
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-seed ./dist-seed
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./

USER node

# migrate deploy solo aplica migraciones ya creadas; nunca resetea la base.
# El seed carga el catálogo y, si están las BOOTSTRAP_ADMIN_*, el primer
# administrador; el fixture de desarrollo lo gatea NODE_ENV. Si cualquiera
# de los dos pasos falla, la app no arranca.
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist-seed/prisma/seed.js && node dist/main.js"]

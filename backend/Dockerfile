ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

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

COPY . .

# prisma.config needs a DATABASE_URL to load during build,
#   this variable will be overridden by docker-compose at runtime
ARG DATABASE_URL

RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "run", "start:dev"]

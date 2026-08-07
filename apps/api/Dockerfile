FROM node:22-alpine AS dependencies

WORKDIR /app

COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY apps/api/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

RUN addgroup -S pamilo && adduser -S pamilo -G pamilo

COPY --from=build --chown=pamilo:pamilo /app/package.json /app/package-lock.json ./
COPY --from=build --chown=pamilo:pamilo /app/node_modules ./node_modules
COPY --from=build --chown=pamilo:pamilo /app/dist ./dist

USER pamilo

EXPOSE 3000

CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seedDemo.js && node dist/server.js"]

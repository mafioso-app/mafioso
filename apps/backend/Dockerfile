FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/engine/package.json ./packages/engine/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile --filter @mafioso/backend...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/engine/node_modules ./packages/engine/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY . .
RUN pnpm --filter @mafioso/types run build
RUN pnpm --filter @mafioso/engine run build
RUN pnpm --filter @mafioso/backend run prisma:generate
RUN pnpm --filter @mafioso/backend run build
RUN echo "node-linker=hoisted" >> .npmrc
RUN pnpm --filter @mafioso/backend deploy --prod /app/backend-deploy
RUN PRISMA_BIN=$(find /app/node_modules/.pnpm -path "*/prisma/build/index.js" 2>/dev/null | head -1) \
    && cd /app/backend-deploy \
    && node "$PRISMA_BIN" generate --schema=prisma/schema.prisma

FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache openssl
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=build /app/backend-deploy/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/prisma ./prisma

USER nestjs
EXPOSE 3001
CMD ["node", "dist/main"]

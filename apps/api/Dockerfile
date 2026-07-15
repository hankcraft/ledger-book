# =============================================================================
# API Dockerfile — Bun + Prisma (multi-stage)
# =============================================================================

# --- Builder Stage ------------------------------------------------------------
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json bun.lock ./

# Copy workspace packages needed for the build
COPY packages/contracts/ packages/contracts/
COPY apps/api/ apps/api/

# Install dependencies (--ignore-scripts avoids lefthook needing git)
RUN bun install --ignore-scripts

# Generate Prisma client
WORKDIR /app/apps/api
RUN bunx prisma generate

# Build the API bundle (externalize prisma for runtime resolution)
RUN bun build ./src/index.ts --outdir ./dist --target bun --external @prisma/client --external .prisma

# --- Runtime Stage ------------------------------------------------------------
FROM oven/bun:1-slim

WORKDIR /app

# Preserve the bun workspace structure so prisma resolves engines via relative paths
# apps/api/node_modules/.bin/prisma → ../../node_modules/.bun/@prisma+engines@...
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 3000

# Run db push using the workspace's prisma (6.9.0), then start server
CMD ["sh", "-c", "./node_modules/.bin/prisma db push --schema ./prisma/schema.prisma --accept-data-loss --skip-generate && bun run dist/index.js"]

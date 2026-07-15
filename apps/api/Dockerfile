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

# Install all dependencies (including prisma devDep for generate)
RUN bun install --frozen-lockfile

# Generate Prisma client
WORKDIR /app/apps/api
RUN bunx prisma generate

# Build the API bundle
RUN bun build ./src/index.ts --outdir ./dist --target bun --external @prisma/client --external .prisma

# --- Runtime Stage ------------------------------------------------------------
FROM oven/bun:1-slim

WORKDIR /app

# Copy Prisma schema and generated client
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/apps/api/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built API bundle
COPY --from=builder /app/apps/api/dist ./dist

# Copy prisma CLI for migrations (optional: run migrate deploy on start)
COPY --from=builder /app/apps/api/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/apps/api/node_modules/.bin/prisma ./node_modules/.bin/prisma

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "bunx prisma migrate deploy --schema ./prisma/schema.prisma && bun run dist/index.js"]

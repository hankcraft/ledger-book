# =============================================================================
# API Dockerfile - Multi-stage build with Bun
# =============================================================================

# --- Builder Stage ------------------------------------------------------------
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json bun.lock ./

# Copy workspace packages
COPY packages/contracts/ packages/contracts/
COPY apps/api/ apps/api/

# Install dependencies
RUN bun install --frozen-lockfile

# Build the API
WORKDIR /app/apps/api
RUN bun build ./src/index.ts --outdir ./dist --target bun

# --- Runtime Stage ------------------------------------------------------------
FROM oven/bun:1-slim

WORKDIR /app

# Copy built artifact
COPY --from=builder /app/apps/api/dist/index.js ./dist/index.js

# Copy demo CSV data
COPY --from=builder /app/apps/api/src/data/ ./src/data/

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]

# Use a pinned Bun image for reproducible builds
FROM oven/bun:1.2.21 AS base
WORKDIR /usr/src/app

# -------------------------
# Install dependencies (cached)
# -------------------------
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Production-only deps
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# -------------------------
# Build & test
# -------------------------
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN bun test
RUN bun run build  # produces ./dist (client bundle)

# -------------------------
# Final runtime image
# -------------------------
FROM base AS release
ENV NODE_ENV=production
# If your app reads this, keep it here; otherwise remove.
ENV DB_PATH=/usr/src/app/data/recipe-box.sqlite

# App deps (prod only)
COPY --from=install /temp/prod/node_modules node_modules

# Server/source and config
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/tsconfig.json .
COPY --from=prerelease /usr/src/app/src src

# Client build artifacts
COPY --from=prerelease /usr/src/app/dist dist

# Ancillary data
COPY seed seed

# Create writable data directory for SQLite (if used)
RUN mkdir -p /usr/src/app/data && chown -R bun:bun /usr/src/app

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "start"]

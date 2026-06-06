# ---- Build Stage ----
FROM oven/bun:1 AS build
WORKDIR /app

# Install workspace dependencies
COPY package.json bun.lockb ./
COPY server/package.json server/
COPY client/package.json client/
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN cd client && bun run build

# ---- Runtime Stage ----
FROM oven/bun:1-slim
WORKDIR /app

# Copy workspace config and node_modules
COPY --from=build /app/package.json /app/bun.lockb ./
COPY --from=build /app/node_modules ./node_modules

# Copy server source and deps
COPY --from=build /app/server/package.json ./server/
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/src ./server/src
COPY --from=build /app/server/prisma ./server/prisma

# Copy built frontend
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000
CMD ["bun", "run", "server/src/main.ts"]

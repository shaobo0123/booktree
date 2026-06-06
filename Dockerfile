# ---- Build Stage ----
FROM oven/bun:1 AS build
WORKDIR /app

# Install workspace dependencies
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN bun install

# Copy source and build frontend
COPY . .
RUN cd client && bun run build

# ---- Runtime Stage ----
FROM oven/bun:1-slim
WORKDIR /app

# Copy node_modules and server source
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/src ./server/src

# Copy built frontend
COPY --from=build /app/client/dist ./client/dist

ENV SERVE_STATIC=/app/client/dist
EXPOSE 3000
CMD ["bun", "run", "server/src/main.ts"]

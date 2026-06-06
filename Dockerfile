# ---- Build Stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Install workspace dependencies (npm, not bun)
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

# Copy source and build frontend
COPY . .
RUN cd client && npm run build

# ---- Runtime Stage ----
FROM oven/bun:1-slim
WORKDIR /app

# Copy hoisted node_modules (all workspace deps)
COPY --from=build /app/node_modules ./node_modules

# Copy server source and prisma schema
COPY --from=build /app/server/src ./server/src
COPY --from=build /app/server/prisma ./server/prisma

# Copy built frontend
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000
CMD ["bun", "run", "server/src/main.ts"]

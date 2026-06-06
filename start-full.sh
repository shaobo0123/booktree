#!/bin/bash
# === 前后端一起跑（单端口 3000，无需 nginx） ===
cd "$(dirname "$0")"

# 如果前端还没构建，先构建
if [ ! -d "client/dist" ]; then
  echo "Building client..."
  cd client && npm install && npm run build && cd ..
fi

# 设置静态文件目录，启动后端
SERVE_STATIC="$(pwd)/client/dist" bun run server/src/main.ts

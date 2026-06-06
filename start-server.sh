#!/bin/bash
# === 只跑后端 API（配合 nginx 或 1Panel 反向代理） ===
cd "$(dirname "$0")/server"
bun run src/main.ts

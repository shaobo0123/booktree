# Tree Bookmarks

在线书签管理器，支持无限嵌套文件夹、拖拽排序、导入导出。

## 快速开始

```bash
npm install
npm run dev
```

前端：http://localhost:5173  
后端：http://localhost:3000

## 权限控制

单账号模式，默认密码 `admin123`（可通过 `server/.env` 的 `ADMIN_PASSWORD` 修改）。

- **未登录**：只读模式，仅可浏览公开书签、搜索
- **登录后**：创建、编辑、删除、拖拽排序、导入、导出、设置书签阅读权限

每个书签可设为 `public`（公开）或 `private`（仅登录后可见）。

## 脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 同时启动前端（Vite :5173）和后端（Bun :3000） |
| `npm run dev:client` | 仅前端 |
| `npm run dev:server` | 仅后端 |
| `npm run build` | 构建前后端 |

## 部署到服务器

### 仅后端（配合 1Panel 或 nginx 反向代理）

```bash
./start-server.sh          # Bun 跑在 :3000，前端由 nginx serve
```

### 前后端一体（单端口，无需 nginx）

```bash
./start-full.sh            # 一个端口同时提供 API + 前端页面
```

### 通用部署步骤

1. 本地构建：`npm run build`
2. 把 `server/`、`client/dist/`、`start-server.sh`、`start-full.sh` 上传到服务器
3. 服务器安装 Bun：`curl -fsSL https://bun.sh/install | bash`
4. `cd server && bun install`
5. 启动：
   - 前后端一体：`./start-full.sh`
   - 仅后端（配合 nginx 反向代理）：`./start-server.sh`

### 环境变量（`server/.env`）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `DATABASE_URL` | `file:./prisma/dev.db` | SQLite 数据库路径 |
| `ADMIN_PASSWORD` | `admin` | 管理员登录密码 |
| `JWT_SECRET` | 内置开发密钥 | JWT 签名密钥 |
| `SERVE_STATIC` | 空 | 设为 `client/dist` 时后端直接 serve 前端 |

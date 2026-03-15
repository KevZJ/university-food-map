# 部署说明：让别人通过域名访问你的网站

本项目可**一键部署**到云平台，获得一个公网域名（如 `https://xxx.onrender.com`），任何人打开链接即可使用。

---

## 方式一：Render 部署（推荐，免费）

[Render](https://render.com) 提供免费档，适合前后端一体的 Node 应用。

### 1. 准备代码

- 确保项目已推送到 **GitHub**（见之前部署到 GitHub 的步骤）。
- 本地不要提交 `.env`（已加入 .gitignore），密钥在 Render 网页里配置。

### 2. 在 Render 创建 Web Service

1. 打开 [https://render.com](https://render.com) 并登录（可用 GitHub 登录）。
2. 点击 **New** → **Web Service**。
3. 连接你的 GitHub 仓库（如 `university-food-map`），选好仓库后点 **Connect**。
4. 填写：
   - **Name**：例如 `university-food-map`
   - **Region**：选离你近的（如 Singapore）
   - **Runtime**：**Node**
   - **Build Command**：`npm install && npm run build`
   - **Start Command**：`npm run start`
   - **Instance Type**：选 **Free**

### 3. 配置环境变量

在同一个页面下方 **Environment** 里添加变量（用 **Add Environment Variable**）：

| Key | Value（示例） |
|-----|----------------|
| `NODE_ENV` | `production` |
| `VITE_AI_API` | `/api/ai-assistant` |
| `VITE_BASE_API` | `/api` |
| `VITE_AMAP_KEY` | 你的高德 Key |
| `VITE_AMAP_WEB_KEY` | 你的高德 Web 服务 Key |
| `VITE_AMAP_SECURITY_CODE` | 你的高德安全密钥 |
| `VITE_UNIVERSITIES` | `[{"name":"北航","center":"116.270541,40.15354"},{"name":"矿大","center":"116.261576,40.152721"},{"name":"北师大","center":"116.263685,40.149461"}]` |
| `BAILIAN_API_KEY` | 你的百炼 API Key（可选，不填则 AI 推荐用规则兜底） |

说明：`VITE_AI_API`、`VITE_BASE_API` 用相对路径 `/api/...`，部署后和网站在同一域名，无需改成具体域名。

### 4. 部署

点击 **Create Web Service**。Render 会拉代码、执行 build、再执行 start。完成后会给你一个地址，例如：

- `https://university-food-map-xxxx.onrender.com`

把这个链接发给别人，即可直接访问你的网站。

### 5. 免费档说明

- 免费实例一段时间无访问会休眠，首次打开可能等几十秒。
- 如需自定义域名，在 Render 该服务的 **Settings** → **Custom Domains** 里添加并按提示解析 DNS。

---

## 方式二：Railway 部署

1. 打开 [https://railway.app](https://railway.app)，用 GitHub 登录。
2. **New Project** → **Deploy from GitHub repo**，选择本仓库。
3. 在项目里点进服务 → **Variables** 添加上述环境变量（同上表），并加 `NODE_ENV=production`。
4. **Settings** → **Build**：Build Command 填 `npm run build`，Start Command 填 `npm run start`（或 Root Directory 等按需设置）。
5. 部署完成后在 **Settings** → **Networking** 里生成 **Public URL**，即你的访问域名。

---

## 本地先验证“生产模式”

部署前可在本机模拟生产环境，确保同一端口既能打开页面又能调接口：

```bash
# 构建前端
npm run build

# 以生产方式启动（会托管 dist 并提供 API）
NODE_ENV=production npm run start
```

浏览器打开 [http://localhost:3000](http://localhost:3000)，应能正常打开页面并使用推荐、AI 等功能。

---

## 小结

| 步骤 | 说明 |
|------|------|
| 1. 代码推 GitHub | 不提交 `.env`，密钥在云平台配置 |
| 2. Render / Railway 新建服务 | 连 GitHub 仓库，Build = `npm run build`，Start = `npm run start` |
| 3. 配置环境变量 | `NODE_ENV=production`，`VITE_AI_API=/api/ai-assistant`，`VITE_BASE_API=/api`，以及高德、百炼等 Key |
| 4. 获得域名 | 平台提供的 URL 即为你的网站，别人通过该域名即可访问 |

按上述任选一种方式部署后，你的 Web App 即可通过域名对外访问。

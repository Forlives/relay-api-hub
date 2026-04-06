# API Relay Hub

> AI API 中转站自动化评测平台 —— 延迟测试、掺水检测、实时排行

国内使用 Claude / GPT / Gemini 等 AI API 需要通过中转站，但中转站水很深——延迟高、模型掺水、稳定性差……
**API Relay Hub** 帮你自动测试各中转站的接口质量，用数据说话。

## 功能

- **仪表盘总览** — 站点数、测试次数、在线率、平均延迟一目了然
- **排行榜** — 基于延迟、成功率、速度、掺水率的综合评分排名，支持按模型筛选
- **一键测试** — 输入 API Key，单站或全站批量测试，实时出结果
- **掺水检测** — 比对请求模型与响应模型，自动标记可疑掺水
- **Key 管理** — 服务器本地加密存储，方便反复测试，不上传第三方
- **站点管理** — 自由添加/删除中转站，预置主流站点

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |
| 动画 | Framer Motion |
| 图表 | Recharts |
| 图标 | Lucide React |

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 pnpm

### 安装

```bash
git clone https://github.com/Forlives/relay-api-hub.git
cd relay-api-hub
npm install
```

### 开发模式

同时启动前端开发服务器和后端 API 服务器：

```bash
npm run dev:all
```

- 前端: http://localhost:5173
- 后端: http://localhost:3721

### 生产部署

```bash
# 构建前端
npm run build

# 启动服务器（会同时托管静态文件）
npm run server
```

访问 http://localhost:3721 即可。

## 项目结构

```
relay-api-hub/
├── src/                    # 前端源码
│   ├── components/         # 通用组件
│   ├── pages/              # 页面组件
│   ├── lib/                # 工具函数 & API 客户端
│   ├── App.tsx             # 路由配置
│   ├── main.tsx            # 入口
│   └── index.css           # 全局样式
├── server/
│   └── index.mjs           # Express 后端服务
├── public/                 # 静态资源
├── data/                   # SQLite 数据库（自动创建）
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard` | 获取仪表盘数据 |
| GET | `/api/sites` | 获取所有站点 |
| POST | `/api/sites` | 添加新站点 |
| DELETE | `/api/sites/:id` | 删除站点 |
| GET | `/api/rankings` | 获取排行榜（?model= 可选） |
| GET | `/api/models` | 获取已测试过的模型列表 |
| POST | `/api/test` | 单站测试 |
| POST | `/api/test/batch` | 全站批量测试 |
| GET | `/api/tests` | 获取测试历史 |
| GET | `/api/keys` | 获取已保存的 Key（脱敏） |
| POST | `/api/keys` | 保存 API Key |
| DELETE | `/api/keys/:id` | 删除 API Key |

## 预置站点

项目预置了以下主流中转站（基于 [relayAPI](https://github.com/zzsting88/relayAPI) 推荐）：

- PackyCode — 老牌站点，质量稳定
- AI派 — 价格便宜，不注水
- 云雾AI — 支持模型多，面向企业
- RightCode — 编程专用，文档清晰
- Chintao AI — 新站质量好
- SparkCode — 多模型支持
- BUZZ — 价格清晰
- ZeroCode — VIP 分等级

## 安全说明

- API Key 仅存储在本地 SQLite 数据库
- 不会将 Key 上传到任何第三方服务
- 建议在自己的服务器上部署，不要暴露到公网
- 定期清理不再使用的 Key

## 致谢

灵感来源于 [zzsting88/relayAPI](https://github.com/zzsting88/relayAPI) 和 [hvoy.ai](https://hvoy.ai/)

## License

MIT

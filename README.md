# API 纯净度检测器

> 你买的 AI API 掺水了吗？一键检测，用数据说话。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

---

## 这是什么？

买了 Claude / GPT / Gemini 的 API 中转服务，不确定商家有没有拿廉价模型冒充高端模型？

**粘贴你的 API 地址和 Key，点一下，10 秒出结果。**

检测器会自动向你的 API 发送 5 个精心设计的探针请求，从多个维度验证你拿到的到底是不是正品：

| 探针 | 检测什么 | 原理 |
|------|----------|------|
| 🪪 **身份验证** | 模型是否是你买的那个 | 让模型自报身份，对比请求模型和返回头中的模型标识 |
| 🧮 **数学推理** | 模型智力水平 | 简单但需要理解力的数学题，廉价模型容易答错 |
| 🧩 **逻辑推理** | 是否是高端模型 | 经典思维陷阱题，区分高端和低端模型 |
| 💻 **代码质量** | 生成水平是否达标 | 让模型写代码，评估类型标注、边界处理、算法优化 |
| 🌏 **中文理解** | 是否用国产模型替换 | 测试对中文俚语/网络用语的理解深度 |

## 检测结果

- ✅ **检测通过** — 各项探针均未发现掺水迹象
- ⚠️ **轻微异常** — 有一项不太正常，可能是版本差异
- 🟠 **存在可疑迹象** — 多项异常，建议谨慎
- 🔴 **高度疑似掺水** — 检测到严重问题，大概率被偷换模型

## 快速使用

### 环境要求

- Node.js >= 18

### 三步启动

```bash
git clone https://github.com/Forlives/relay-api-hub.git
cd relay-api-hub
npm install
npm run dev:all
```

打开 http://localhost:5173 ，粘贴你的 API 信息，点击"开始检测"。

### 生产部署（单命令）

```bash
npm run build && npm run server
```

访问 http://localhost:3721

## 隐私安全

- **Key 不会被存储** — 仅在检测时实时使用，用完即丢
- **不发送到第三方** — 所有请求直接从你的服务器发往中转站
- **完全开源** — 代码就在这里，随时审查
- **总消耗 < 500 token** — 5 个探针请求加起来花不了几分钱

## 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS + Framer Motion
- **后端**: Node.js + Express（无数据库，纯无状态）
- **检测**: 5 个并行探针 + 模型指纹比对 + 综合评分算法

## API

只有两个接口，简单明了：

```
POST /api/detect    — 完整检测（5 个探针）
POST /api/ping      — 快速连通性测试
```

### /api/detect 请求体

```json
{
  "api_base": "https://api.example.com/v1",
  "api_key": "sk-...",
  "model": "claude-sonnet-4-6-20250514"
}
```

### 返回结果

```json
{
  "status": "pass | caution | suspect | fail",
  "verdict": "检测通过",
  "score": 95,
  "avgLatency": 1200,
  "issues": [],
  "probes": { ... }
}
```

## 灵感来源

- [zzsting88/relayAPI](https://github.com/zzsting88/relayAPI) — AI API 中转站推荐与评测
- [hvoy.ai](https://hvoy.ai/) — 中转站实时排行

## License

MIT

# API 纯净度检测器

> 你买的 API 掺水了吗？用 6 个维度对比官方基线，告诉你 API 到底纯不纯。

<p align="center">
  <img src="public/favicon.svg" width="64" alt="icon" />
</p>

## 工作原理

与传统的「问几道题」式检测不同，本工具采用 **协议级指纹分析**，将被测 API 与**真实官方 API 的已知行为基线**做 1:1 对比。

### 6 大检测维度

| 维度 | 满分 | 检测内容 | 为什么有效 |
|------|------|---------|-----------|
| **SSE 协议指纹** | 100 | 流式响应的 SSE 事件链结构 | 官方 Anthropic 有独特的 `message_start → content_block_start → content_block_delta → message_delta → message_stop` 完整事件链，掺水站很难完美伪造 |
| **模型身份验证** | 100 | 返回头 model 字段 + 自我声明 | 官方 API 会在 HTTP 返回头中标识正确模型名，且模型能正确自我介绍身份 |
| **知识截止验证** | 100 | 训练数据截止时间 | 每个模型版本有固定的知识截止日期（如 Claude 4.6 = 2025 年 5 月），替换模型会暴露不同日期 |
| **推理能力基线** | 100 | 数学陷阱 + 逻辑推理 | 高端模型（Claude 4.6/GPT-5.4）的基础推理正确率 100%，低端替代模型做不到 |
| **代码生成质量** | 100 | 类型标注/边界处理/算法优化 | 官方高端模型的代码质量有已知特征（类型标注、sqrt 优化等），廉价模型缺少这些 |
| **响应一致性** | 100 | 多次请求的模型标识和延迟 | 正规 API 多次请求的 model 字段完全一致，延迟波动在合理范围内 |

### 综合评定

- **检测通过** — 各项维度均与官方基线匹配
- **轻微异常** — 多个维度存在偏差（可能是版本差异）
- **存在可疑** — 某维度严重异常
- **高度疑似掺水** — 2 个以上维度严重不达标

## 快速使用

```bash
# 克隆并安装
git clone https://github.com/percyyuan/pian_key.git
cd pian_key
npm install

# 启动（前后端同时）
npm run dev
```

打开 `http://localhost:5173`，输入你的 API 地址、Key 和购买的模型，点击「开始深度检测」。

## 隐私安全

- API Key **不会被存储**，仅在检测过程中临时使用
- 后端完全 **无状态**，不使用任何数据库
- 所有检测请求都在你的 **本地服务器** 发出

## 技术栈

**前端**: React 18 + TypeScript + Tailwind CSS + Framer Motion
**后端**: Node.js + Express（无状态）

## 支持的模型家族

| 家族 | 示例模型 | 检测维度 |
|------|---------|---------|
| Claude (Anthropic) | claude-sonnet-4-6, claude-opus-4-6 | 全部 6 维度（含 SSE 协议指纹） |
| GPT (OpenAI) | gpt-5.4 | 5 维度（SSE 指纹不适用） |
| Gemini (Google) | gemini-3.1-pro | 5 维度 |
| DeepSeek | deepseek-r1 | 5 维度 |

## API

```
POST /api/detect
{
  "api_base": "https://api.example.com/v1",
  "api_key": "sk-...",
  "model": "claude-sonnet-4-6-20250514"
}
```

返回 6 维度的详细分数、官方基线对比和综合评定结果。

## License

MIT

<p align="center">
  <img src="web/public/logo.svg" width="88" alt="AI 创作工作台 logo">
</p>

<h1 align="center">AI 创作工作台</h1>

<p align="center">
  <strong>Trae 应用大赛参赛作品</strong><br/>
  无限画布 · 图片生成 · 视频生成 · BYOK · Agent 原生
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-0.0.1-f97316?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-2ea44f?style=flat-square" />
  <img alt="stack" src="https://img.shields.io/badge/React%2019%20%2B%20Vite%207%20%2B%20TypeScript-3178c6?style=flat-square" />
</p>

> 本项目基于 [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas)（MIT）二次开发，保留原作者版权声明，并在其画布与生成能力之上补充了面向个人创作者的轻量化 UI、Agent Graph 接口和万相 3.0 视频协议。

---

## 项目简介

这是一个**个人自托管 AI 创作 WebUI**，把无限画布、图片生成、视频生成、模型配置和 Agent 操作接口放在同一套界面里。它不绑定特定厂商：用户自己填 `Base URL`、`API Key` 和模型名，即可接入任意 OpenAI 兼容服务、Gemini，或通过自定义脚本接入万相 3.0 等非标准协议。

项目目标不是做又一个 ComfyUI，而是把「一句话 → 图片 → 视频」的常用链路做得足够短：打开首页输入想法，或从 4 个预设画布模板开始，用少量节点完成创作。

## 为什么做这个

- 通用 AI 创作工具往往要么是纯聊天，要么是重型节点编辑器，个人用起来成本高。
- 图片、视频、参考图、提示词、素材经常散落在不同工具里，切换成本高。
- 厂商 API 格式不统一，换一个模型就要改代码。
- Agent 能写代码，却很难直接操作一个可视化创作画布。

本项目用「轻量画布 + 预设模板 + 统一 Provider + JSON Graph Agent 接口」解决这四个问题。

## 参赛亮点

### 1. Agent 原生，而不是只给人类用的画布

画布状态是一个可序列化的 JSON Graph（`nodes` + `connections`）。仓库额外提供一个零依赖 Node 服务，对外暴露：

- `list_canvases`
- `read_canvas`
- `apply_patch`
- `run_node`
- `run_graph`
- `get_task_status`
- `describe_node_types`

支持 **REST** 和 **MCP stdio** 两种形态。Agent 不需要打开浏览器，也不依赖 React 组件状态，直接对服务端 Graph 增删节点、改连线、触发执行、查询任务。前端会与服务端双向同步，Agent 的修改会在数秒内出现在画布上。

### 2. 足够简单的画布

空画布只展示一句话和 4 个模板，不默认铺满工具栏：

- 文生图
- 图片编辑
- 全民嗨跳（文本 → 图片 → 视频）
- 多图生视频（多张参考图 → 视频）

点击模板自动创建节点与连线，并自动缩放到全部可见。画布侧栏默认收起，空画布隐藏底部工具栏。

### 3. BYOK，不绑定厂商

- 渠道级配置：`Base URL`、`API Key`、协议、模型列表
- 支持 OpenAI 兼容、Gemini，以及「自定义脚本」协议
- 图片、视频、文本、音频模型都可单独指定能力
- 自定义脚本可直接用 `fetch`/`request` 调用任意 HTTP API，并在脚本内完成轮询
- Key 保存在浏览器本地；Agent 服务支持从环境变量读取，避免在工具参数里传 Key

### 4. 万相 3.0 视频已接入并实测

内置「万相 3.0 视频」调用脚本，支持：

- 文生视频
- 首帧 / 首尾帧
- 全能参考：参考图、参考视频、参考音频
- 视频编辑、视频延长
- 异步任务创建与轮询

配置页提供「添加万相 3.0 渠道」一键预设，同时加入 `wan3.0-video` 和 `wan3.0-video-prime`，默认选中 prime。万相 3.0 的 `duration` 最小为 **2 秒**，1 秒会被接口拒绝。

### 5. 轻量、可自托管

- 前端是 Vite + React 单页应用
- Agent 服务零 npm 依赖，只监听本地 `127.0.0.1`
- 不依赖本地 GPU；数字人能力暂缓，不引入 ComfyUI 复杂节点图
- 支持 Docker 部署，也支持本地 Node 直接运行

### 6. 用 Trae 完成开发

本版本的需求调研、开源项目选型、UI 改造、Agent Graph 服务、万相 3.0 协议接入和实测，均在 Trae 中完成。选型过程与取舍记录在 [技术选型评估](docs/技术选型评估.md)。

## 功能清单

- 无限画布：拖拽、缩放、连线、框选、小地图、撤销重做、分组、导入导出
- 节点类型：文本、图片、视频、音频、配置、分组
- 图片：文生图、图生图、参考图编辑、裁剪、遮罩重绘、切图、超分
- 视频：文生视频、图生视频、首尾帧、全能参考、异步任务轮询
- 图片工作台：左配置、右结果，生成按钮固定在底部，历史记录抽屉
- 视频工作台：同一套双栏布局，支持参考图/参考视频/参考音频
- 资产与提示词：我的素材、提示词库、生成历史
- 模型配置：多渠、多模型、能力标注、自定义调用脚本、本地代理
- Agent：JSON Graph 服务 + REST/MCP + 前端双向同步

## 技术架构

```text
┌──────────────────────────────────────────────┐
│  Web (Vite + React 19 + TypeScript)          │
│  首页 / 图片工作台 / 视频工作台 / 无限画布    │
│  Zustand 状态 · localforage 本地持久化       │
└───────────────┬──────────────────────────────┘
                │ 浏览器直连 Provider（BYOK）
                │ 可选：JSON Graph 双向同步
┌───────────────▼──────────────────────────────┐
│  agent-server（零依赖 Node）                  │
│  JSON Graph 文件存储 · revision 乐观锁        │
│  REST /api/canvas · /api/tasks               │
│  MCP stdio: read_canvas / apply_patch / ...  │
│  OpenAI 兼容图片/视频执行                     │
└──────────────────────────────────────────────┘
```

## 快速开始

需要 Node.js 20+ 和 pnpm（Windows PowerShell）：

```powershell
# 进入项目根目录：本仓库为 app/；解压归档 zip 后直接就是该目录
cd app            # 解压归档时跳过这一行

# 终端 1：Web（必须）
cd web
pnpm install      # 首次运行
pnpm run dev      # http://localhost:3000
```

```powershell
# 终端 2：Agent Graph 服务（可选）
cd agent-server
npm start         # http://127.0.0.1:8787
# npm run mcp     # 需要 MCP stdio 时
```

停止服务：在对应终端按 `Ctrl+C`。只启动 Web 也能正常使用浏览器本地流程。

## 配置模型

1. 打开「配置」页或左下角设置图标。
2. 新增渠道，填写 `Base URL`、`API Key`。
3. 选择协议：OpenAI / Gemini / 自定义脚本。
4. 选择或手动添加模型，并标注能力（图片/视频/文本/音频）。
5. 如果接口不是 OpenAI/Gemini 标准格式，打开该模型的「调用脚本」，选择模板或自行编写。

图片、视频、文本、音频的默认模型分别在「偏好设置」里选择。

## 接入千问万相 3.0

1. 配置 → 渠道 → 新增渠道，Base URL 填 `https://maas.qianwenaiapi.com/api/v1`，API Key 填千问 AI 平台 Key。
2. 手动添加 `wan3.0-video` 或 `wan3.0-video-prime`，能力选「视频」。
3. 打开该模型的「调用脚本」，选择「万相 3.0 视频」模板并保存。
4. 或在配置页直接点击「添加万相 3.0 渠道」，会同时加入两个模型并默认选中 prime。

补充说明：

- `duration` 最小 2 秒，1 秒会被接口拒绝。
- 参考视频优先使用 Base64 data URL；公网 URL 可能被平台拒绝下载。
- 如果 `wan3.0-video` 返回 `403 Free quota exhausted`，可改用 `wan3.0-video-prime`。

## Agent Graph 服务

启动后进入「配置 → Agent 画布服务」填入 `http://127.0.0.1:8787` 并保存，打开画布即可双向同步。

```powershell
cd app/agent-server
npm start
npm run mcp
```

服务端也支持从环境变量读取模型凭据：

```powershell
$env:OPENAI_BASE_URL="https://api.example.com/v1"
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_IMAGE_MODEL="gpt-image-1"
$env:OPENAI_VIDEO_MODEL="your-video-model"
npm start
```

> 不要把自己的 API Key 写进代码或提交到仓库。项目不包含任何真实 Key。

## 目录结构

```text
项目根目录/
├── web/                  # React 前端
│   └── src/
│       ├── pages/        # 首页、图片、视频、画布、配置
│       ├── components/   # 画布、布局、工作台组件
│       ├── services/     # Provider 调用、脚本运行时、Graph 客户端
│       └── stores/       # 配置、画布、主题、Agent 状态
├── agent-server/         # 零依赖 Node Graph 服务 + MCP
├── docs/                 # 技术选型与项目文档
├── canvas-agent/         # 上游浏览器 Agent（保留）
└── canvas-proxy/         # 上游本地 CORS 代理（保留）
```

## 已实现 / 暂未实现

已实现：

- 首页、图片工作台、视频工作台、极简画布与 4 个模板
- 多渠 BYOK、OpenAI/Gemini/自定义脚本
- 万相 3.0 文生视频、首尾帧、全能参考、编辑、延长
- Agent JSON Graph 服务、REST/MCP、前端同步
- 画布内生成状态、失败提示、重试入口（复用上游能力）

暂未实现：

- 数字人（按计划暂缓，不引入本地 GPU 推理）
- 多 Agent 同时编辑的节点级合并（当前冲突后重新加载）
- 面向团队的权限、计费和云同步

## 开发过程与选型

完整的技术选型矩阵、候选项目对比、许可证风险和缺口分析见 [技术选型评估](docs/技术选型评估.md)。

## 开源协议与致谢

本项目基于 [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas) 二次开发，原项目使用 MIT License。

- 原始版权：Copyright (c) 2026 basketikun
- 本版本修改：Copyright (c) 2026 AI 创作工作台 contributors
- 许可证全文见 [LICENSE](LICENSE)

MIT License 允许使用、复制、修改、合并、发布、分发、再许可和销售，但需要在副本或实质性部分中保留上述版权声明和许可声明。二次开发请继续保留原作者信息与前端页面标识。

感谢原项目作者及社区提供画布、Provider 适配、素材与提示词等基础能力。

## 安全说明

- 项目不包含任何真实 API Key。
- Key 默认只保存在浏览器本地；Agent 服务支持环境变量读取，不写入任务记录和日志。
- Agent 服务默认只监听 `127.0.0.1`，不要直接暴露到公网。
- 如使用过测试 Key，请在模型平台控制台删除或轮换。

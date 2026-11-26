# siyuan-widget-gist 开发约束 (AGENTS.md)

## 1. 思源官方源码核实

- 制定技术方案、调用宿主 API 或判断思源底层挂件（`NodeWidget`）行为时，必须对照本地官方源码 `$(ghq root)/github.com/siyuan-note/siyuan`（及 `$(ghq root)/github.com/siyuan-note/widget-sample`）进行核实，重点覆盖前端 `app/src/protyle/`（如 `app/src/protyle/hint/extend.ts`、`app/src/protyle/render/mediaResize.ts`、`app/src/protyle/gutter/height.ts`）与后端 `kernel/api/attr.go`、`kernel/model/`。
- 讨论方案或编写代码时，必须严格区分源码已确认事实（附路径与行号）与拟议草案，严禁将未落地的示例符号当作现成 API 使用。
- 块属性持久化必须以内核接口（`/api/attr/getBlockAttrs`、`/api/attr/setBlockAttrs`）返回 `code === 0` 为准，不以前端 DOM 属性或本地临时状态推断落盘完成。

## 2. 文档体系与 Spec-First 约束

- **文档分工与定位**：
  - [`docs/PRD.md`](docs/PRD.md)：产品需求规范（记录产品定位、功能边界、常驻地址栏与失焦保存规范、数据持久化、加载与退避重试、工具栏交互、高度自适应及验收标准）；
  - [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：系统架构与技术设计文档（记录技术选型、双层 iframe 隔离拓扑、整体运行流程、宿主 DOM 与 API 集成契约、输入解析算法、常驻输入框状态机、Gist 主题样式叠加、图标构建流水线与双层高度同步机制）。
- **PRD 固化与修改审批**：[`docs/PRD.md`](docs/PRD.md) 为已固化的用户需求基线。修改 `docs/PRD.md` 的任何内容必须先经过开发者（用户）明确确认后方可更改，严禁私自更改。新增需求或变更既有行为时，必须先读取并更新 [`docs/PRD.md`](docs/PRD.md) 与 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)，确认跨文档无口径冲突后，方可修改代码；严禁未经文档定义擅自增减界面控件（按钮、弹窗、输入框）、配置属性或引入前端框架。
- **终态客观陈述**：`docs/` 下所有文档必须客观陈述当前现行终态设计与实现，严禁写入“不再/改为/废弃旧逻辑”等演进对比与过渡性措辞（历史差异仅保留在提交记录或独立审查报告中）。
- **用户文档同步（README）**：涉及面向用户的产品功能、交互方式、属性名、使用限制或安装/运行要求变化时，须同步更新 [`README.md`](README.md) 与 [`README.zh-CN.md`](README.zh-CN.md)，保持双语说明与现行功能一致。

## 3. 通用架构与宿主安全底线

- 挂件运行时保持原生轻量架构（HTML + CSS + ES Modules 原生 JavaScript），不引入 npm 运行时依赖、前端框架或客户端打包器，不依赖任何思源插件；仓库仅在 `assets/` 中追踪矢量 SVG 源图，开发构建期通过 `@resvg/resvg-js` 生成集市所需的 PNG 图标产物。
- 仅通过当前挂件块自身的 `custom-gist-url` 自定义属性持久化规范化后的 HTTPS `gist.github.com` `.js` 嵌入地址；严禁直接修改 `.sy` 文档、SQLite 数据库，严禁使用 `localStorage` 或向工作区写入独立配置文件、临时缓存与高度属性。
- 严禁将用户粘贴的原始 HTML、script 标签或远端返回字符串直接插入外层挂件或思源主页面 DOM；远程 Gist 脚本必须在 `sandbox="allow-scripts"` 且 `referrerPolicy="no-referrer"` 的内层隔离 iframe（`srcdoc`）中渲染，不授予 `allow-same-origin` 或 `allow-top-navigation` 权限，外层接收 `postMessage` 时必须校验 `event.source` 及消息载荷合法性。

## 4. 交付与验证门禁

- 变更交付前须真实执行并通过 `pnpm run check`、`pnpm run build`、`pnpm run package:verify`（或 `pnpm run release`），核对 [`docs/PRD.md`](docs/PRD.md) 验收标准（A01–A13），并在文档包含 Mermaid 图表变更时执行校验脚本确认通过。
- 汇报交付结果时，严格区分“已在思源客户端实测”、“仅过静态/脚本检查”与“仅按源码/文档推断”，如实说明验证范围。

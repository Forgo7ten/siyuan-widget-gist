<div align="center">
  <img src="assets/icon.svg" alt="GitHub Gist Widget Logo" width="128" height="128" />

  # GitHub Gist

  <p>思源笔记 GitHub Gist 代码片段嵌入挂件</p>

  <p>
    <a href="https://github.com/Forgo7ten/siyuan-widget-gist/releases"><img src="https://img.shields.io/badge/Release-v1.0.0-blue.svg?style=flat-square" alt="Release" /></a>
    <a href="https://b3log.org/siyuan/"><img src="https://img.shields.io/badge/SiYuan-%E2%89%A53.7.0-6c5ce7.svg?style=flat-square" alt="SiYuan Support" /></a>
  </p>

  <p>
    <b>简体中文</b> • <a href="README.md">English</a>
  </p>

  <p>
    <a href="#概述">概述</a> •
    <a href="#功能特点">功能特点</a> •
    <a href="#使用说明">使用说明</a> •
    <a href="#安装方式">安装方式</a> •
    <a href="#开发与构建">开发与构建</a>
  </p>
</div>

---

# 概述

**siyuan-widget-gist** 是面向 [思源笔记（SiYuan Note）](https://b3log.org/siyuan/) 的独立挂件，用于在文档中直接嵌入并展示 GitHub Gist 代码片段。粘贴 Gist 链接或嵌入代码即可自动加载，并随思源浅色与深色外观自动切换代码配色。

---

# 功能特点

- **从 `/挂件` 菜单插入**：通过思源编辑器内置 `/挂件` 菜单选择 `GitHub Gist` 即可插入，同一篇笔记支持插入多个互不干扰的 Gist 挂件。
- **常驻地址栏与移开焦点自动保存**：顶部地址栏常驻显示；平时处于置灰只读状态以减少阅读干扰，双击输入框或点击「编辑」即可高亮编辑，按 `Enter` 或将鼠标焦点移开输入框自动保存并刷新，按 `Esc` 取消修改。
- **支持思源折叠与展开**：折叠挂件块时仅保留顶部 Gist 地址栏并收起下方代码块，展开后自动重新加载展示代码内容。
- **随笔记保存与同步**：Gist 地址保存在挂件块自身的 `custom-gist-url` 属性中，随思源文档一起保存和同步，重新打开文档时自动加载。
- **明暗主题样式优化**：对 GitHub Gist 默认卡片边框、行号栏、代码字体与滚动条进行了排版美化，并完整适配思源浅色与深色主题下的代码语法高亮。
- **失败自动重试与快捷操作**：网络波动导致加载失败时自动等待并重试（最多 10 次），顶栏右侧提供「刷新 Gist」与「编辑 URL」快捷按钮。
- **高度自动适配**：挂件高度跟随代码实际内容自动伸缩，完整展示代码片段，无需手动拖拽调整高度。

---

# 使用说明

1. 在思源笔记正文中输入 `/挂件`，选择 **GitHub Gist** 插入挂件；
2. 在顶部输入框中粘贴以下任意一种格式的 Gist 地址，按 `Enter` 或将鼠标焦点移开输入框即可自动保存并加载：

```text
https://gist.github.com/Forgo7ten/e0c40452cf8a0e8e4a9691136596a991
https://gist.github.com/Forgo7ten/e0c40452cf8a0e8e4a9691136596a991.js
https://gist.github.com/Forgo7ten/e0c40452cf8a0e8e4a9691136596a991.js?file=example.py
<script src="https://gist.github.com/Forgo7ten/e0c40452cf8a0e8e4a9691136596a991.js"></script>
```

3. 保存成功后地址栏自动切换为置灰锁定状态；需要更换地址时双击输入框或点击右侧「编辑 URL」图标，需要获取远程最新内容时点击「刷新 Gist」图标。

---

# 安装方式

- **方式一：思源集市安装（推荐）**  
  在思源笔记中打开 **设置 -> 集市 -> 挂件**，搜索 `GitHub Gist` 并点击下载。
- **方式二：手动安装**  
  前往 [Releases 页面](https://github.com/Forgo7ten/siyuan-widget-gist/releases) 下载 `package.zip`，解压至思源工作空间挂件目录 `data/widgets/siyuan-widget-gist/`。

---

# 开发与构建

### 环境要求
- Node.js >= 24.0.0
- pnpm >= 11.4.0
- 思源笔记 >= 3.7.0

### 常用命令
```bash
# 安装构建依赖
pnpm install

# 语法静态检查
pnpm run check

# 渲染 SVG 图标并打包 dist/ 与 package.zip
pnpm run build

# 校验产物清单、PNG 标头与压缩包结构
pnpm run package:verify

# 打包并安全安装到本地思源工作区
pnpm run install:workspace -- "/path/to/SiYuan/workspace"

# 同步升级 package.json 与 widget.json 版本号
pnpm run version:bump

# 运行本地发版全链路校验
pnpm run release

# 清理生成的构建产物
pnpm run clean
```

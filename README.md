<div align="center">
  <img src="assets/icon.svg" alt="GitHub Gist Widget Logo" width="128" height="128" />

  # GitHub Gist

  <p>A GitHub Gist embed widget for SiYuan Note</p>

  <p>
    <a href="https://github.com/Forgo7ten/siyuan-widget-gist/releases"><img src="https://img.shields.io/badge/Release-v1.0.0-blue.svg?style=flat-square" alt="Release" /></a>
    <a href="https://b3log.org/siyuan/"><img src="https://img.shields.io/badge/SiYuan-%E2%89%A53.7.0-6c5ce7.svg?style=flat-square" alt="SiYuan Support" /></a>
  </p>

  <p>
    <b>English</b> • <a href="README.zh-CN.md">简体中文</a>
  </p>

  <p>
    <a href="#overview">Overview</a> •
    <a href="#features">Features</a> •
    <a href="#usage">Usage</a> •
    <a href="#installation">Installation</a> •
    <a href="#development">Development</a>
  </p>
</div>

---

# Overview

**siyuan-widget-gist** is a standalone widget for [SiYuan Note](https://b3log.org/siyuan/) that embeds and displays GitHub Gist code snippets directly in your notes. Paste a Gist link or embed snippet, and the widget automatically loads the code and adapts to light and dark themes.

---

# Features

- **Insert via `/Widget` Menu**: Insert directly from SiYuan's built-in `/Widget` (`/挂件`) menu (`GitHub Gist`). Multiple Gist widgets can be placed in the same document independently.
- **Persistent Address Bar & Instant Save**: The top address bar stays visible at all times—muted and locked while viewing to stay out of the way. Double-click the address bar or click **Edit URL** to edit, then press `Enter` or click outside to save and refresh automatically; press `Esc` to cancel edits.
- **SiYuan Fold / Unfold Support**: When the widget block is folded in SiYuan, only the Gist URL bar is displayed and the code area is unloaded to keep the note compact; unfolding automatically restores the Gist snippet.
- **Saved & Synced with Your Note**: Each widget stores its Gist URL in the block's `custom-gist-url` attribute, syncing alongside your SiYuan documents and loading automatically when reopened.
- **Light & Dark Theme Styling**: Enhances GitHub Gist typography, line numbers, and card borders while matching SiYuan's light and dark color modes.
- **Auto Retry & Quick Refresh**: Automatically retries up to 10 times when network requests fail, with one-click **Refresh** and **Edit URL** buttons in the top bar.
- **Auto Height**: Dynamically adjusts widget height to fit the full Gist snippet without vertical scrollbars inside the block.

---

# Usage

1. Type `/Widget` (or `/挂件`) in a SiYuan document and select **GitHub Gist**;
2. Paste any of the supported Gist formats below into the input bar, then press `Enter` or click outside the input box to save and load:

```text
https://gist.github.com/Forgo7ten/e0c40452cf8a0e8e4a9691136596a991
https://gist.github.com/Forgo7ten/e0c40452cf8a0e8e4a9691136596a991.js
https://gist.github.com/Forgo7ten/e0c40452cf8a0e8e4a9691136596a991.js?file=example.py
<script src="https://gist.github.com/Forgo7ten/e0c40452cf8a0e8e4a9691136596a991.js"></script>
```

3. Once saved, the input bar locks into a subtle muted state. Double-click the input bar or click the **Edit URL** icon on the right to change the address, or click **Refresh Gist** to reload the latest snippet.

---

# Installation

- **Marketplace (Recommended)**: In SiYuan Note, open **Settings -> Marketplace -> Widgets**, search for `GitHub Gist`, and download.
- **Manual Installation**: Download `package.zip` from the [Releases page](https://github.com/Forgo7ten/siyuan-widget-gist/releases) and extract it into `data/widgets/siyuan-widget-gist/` inside your SiYuan workspace.

---

# Development

### Requirements
- Node.js >= 24.0.0
- pnpm >= 11.4.0
- SiYuan Note >= 3.7.0

### Commands
```bash
# Install build dependencies
pnpm install

# Syntax check
pnpm run check

# Render SVG icons and build dist/ + package.zip
pnpm run build

# Verify package structure and archive entries
pnpm run package:verify

# Build and install into a local SiYuan workspace
pnpm run install:workspace -- "/path/to/SiYuan/workspace"

# Bump version across package.json and widget.json
pnpm run version:bump

# Run full local release verification pipeline
pnpm run release

# Clean generated artifacts
pnpm run clean
```

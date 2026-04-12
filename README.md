# 酒馆启动器 - 宝塔面板插件 / SillyTavern Launcher - BT Panel Plugin

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-仓库-c71d23?logo=gitee)](https://gitee.com/al01/sillyTavern-launcher-bt-panel)
[![GitHub](https://img.shields.io/badge/GitHub-Repo-181717?logo=github)](https://github.com/al01cn/sillyTavern-launcher-bt-panel)
[![Releases](https://img.shields.io/github/v/release/al01cn/sillyTavern-launcher-bt-panel)](https://github.com/al01cn/sillyTavern-launcher-bt-panel/releases)

---

## 🇨🇳 中文说明

**酒馆启动器 (SillyTavern Launcher)** 是一个专为 [宝塔面板 (BT Panel)](https://www.bt.cn/) 设计的第三方插件，旨在简化 **SillyTavern** 在 Linux 服务器上的部署、管理和维护流程。通过可视化的 Web 界面，用户可以轻松完成 Node.js 环境配置、项目安装、PM2 进程管理、Nginx 反向代理设置以及 SSL 证书申请等操作。

### 🌟 主要功能

- **一键部署**: 自动检测并安装所需的 Node.js 版本、Yarn 和 PM2。
- **项目管理**: 支持 SillyTavern 项目的创建、启动、停止、重启和删除。
- **进程监控**: 实时查看 SillyTavern 的运行状态、内存占用和 CPU 使用率。
- **反向代理**: 集成 Nginx 管理，一键配置域名反向代理，支持 WebSocket。
- **SSL 支持**: 支持 Let's Encrypt 免费证书自动申请与续期，一键开启 HTTPS。
- **资源管理**: 提供角色卡 (Characters)、世界书 (World Info) 的上传与管理功能。
- **扩展管理**: 可视化安装和管理 SillyTavern 扩展插件。

### 🚀 快速开始（普通用户）

1. **下载安装包**: 前往 [Releases](./releases) 页面下载最新版本的 `.zip` 插件包。
2. **导入安装**: 登录宝塔面板，进入 **软件商店** -> **第三方应用**，点击 **导入插件** 并上传文件。
3. **开始使用**: 安装完成后，在列表中找到 **酒馆启动器** 点击 **设置** 即可一键部署和管理 SillyTavern。

---

## 🛠️ 开发指南

本项目基于宝塔面板插件规范开发，采用 Python 后端 + HTML/JS 前端架构。

### 克隆仓库

```bash
git clone https://github.com/al01cn/sillyTavern-launcher-bt-panel.git
cd sillyTavern-launcher-bt-panel
```

### 开发规范

- **代码风格**: Python 遵循 PEP 8 规范，JavaScript 保持缩进一致。
- **提交信息**: 请使用清晰的 Commit Message，格式建议为 `类型: 描述` (例如: `feat: 添加 SSL 自动续期功能`)。
- **文档同步**: 涉及功能变更或 API 调整时，请同步更新中英双语文档。
- **打包测试**: 修改后请运行 `python pack.py` 进行打包，并在测试环境中验证功能。

### 项目结构

```
src/
├── stl_main.py          # 后端主程序 (Python)
├── index.html           # 前端主页面
├── static/              # 静态资源
│   ├── css/             # 样式文件
│   ├── js/              # JavaScript 逻辑
│   │   ├── core/        # 核心功能模块 (Node.js, Nginx, PM2 等 API 封装)
│   │   ├── pages/       # 页面逻辑 (Home, Settings, Tavern 等)
│   │   └── lib/         # 第三方库与工具
│   └── images/          # 图片资源
└── install.sh           # 安装脚本模板
```

---

## 🙏 鸣谢 / Acknowledgements

- **SillyTavern**: 感谢 SillyTavern 团队开发的优秀前端项目。
- **BT Panel**: 感谢宝塔面板提供的插件生态支持。
- **Contributors**: 感谢所有为本项目做出贡献的开发者。

## 📄 开源协议 / License

本项目采用 [MIT License](LICENSE) 开源协议。您可以自由地使用、修改和分发本软件，但请保留原作者的版权声明。

---

---

## 🇺🇸 English Description

**SillyTavern Launcher** is a third-party plugin designed for the [BT Panel (BaoTa)](https://www.bt.cn/), aimed at simplifying the deployment, management, and maintenance of **SillyTavern** on Linux servers. Through a visual web interface, users can easily handle Node.js environment configuration, project installation, PM2 process management, Nginx reverse proxy setup, and SSL certificate application.

### 🌟 Key Features

- **One-Click Deployment**: Automatically detects and installs required Node.js versions, Yarn, and PM2.
- **Project Management**: Supports creating, starting, stopping, restarting, and deleting SillyTavern projects.
- **Process Monitoring**: Real-time view of SillyTavern's running status, memory usage, and CPU load.
- **Reverse Proxy**: Integrated Nginx management for one-click domain reverse proxy configuration with WebSocket support.
- **SSL Support**: Supports automatic application and renewal of Let's Encrypt free certificates with one-click HTTPS enablement.
- **Resource Management**: Provides upload and management features for Characters and World Info.
- **Extension Management**: Visually install and manage SillyTavern extensions.

### 🚀 Quick Start (For Users)

1. **Download Package**: Go to the [Releases](https://github.com/al01cn/sillyTavern-launcher-bt-panel/releases) page and download the latest `.zip` plugin package.
2. **Import & Install**: Log in to BT Panel, go to **Software Store** -> **Third-party Apps**, click **Import Plugin** and upload the file.
3. **Start Using**: After installation, find **SillyTavern Launcher** in the list and click **Settings** to deploy and manage SillyTavern with one click.

---

## 🛠️ Development Guide

This project is developed based on the BT Panel plugin specifications, using a Python backend + HTML/JS frontend architecture.

### Clone Repository

```bash
git clone https://github.com/al01cn/sillyTavern-launcher-bt-panel.git
cd sillyTavern-launcher-bt-panel
```

### Development Standards

- **Code Style**: Python follows PEP 8 standards; JavaScript maintains consistent indentation.
- **Commit Messages**: Please use clear commit messages, suggested format: `type: description` (e.g., `feat: add SSL auto-renewal`).
- **Documentation Sync**: When changing features or APIs, please update both Chinese and English documentation.
- **Build & Test**: After modifications, run `python pack.py` to build the package and verify functionality in a test environment.

### Project Structure

```
src/
├── stl_main.py          # Backend main program (Python)
├── index.html           # Frontend main page
├── static/              # Static assets
│   ├── css/             # Stylesheets
│   ├── js/              # JavaScript logic
│   │   ├── core/        # Core modules (Node.js, Nginx, PM2 API wrappers)
│   │   ├── pages/       # Page logic (Home, Settings, Tavern, etc.)
│   │   └── lib/         # Third-party libraries and utilities
│   └── images/          # Image resources
└── install.sh           # Installation script template
```

---

## 🙏 Acknowledgements

- **SillyTavern**: Thanks to the SillyTavern team for developing the excellent frontend project.
- **BT Panel**: Thanks to BT Panel for providing the plugin ecosystem support.
- **Contributors**: Thanks to all developers who have contributed to this project.

## 📄 License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software, but please retain the original author's copyright notice.

---

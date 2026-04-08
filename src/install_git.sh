#!/bin/bash

# 检查是否为 Root 用户
if [ "$EUID" -ne 0 ]; then
  echo "请以 root 权限运行此脚本 (使用 sudo)"
  exit 1
fi

echo "正在检测系统环境并安装 Git..."

# 检测包管理器并执行安装
if command -v apt-get >/dev/null 2>&1; then
    # Debian/Ubuntu 系列
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y git
elif command -v dnf >/dev/null 2>&1; then
    # Fedora/RHEL 8+/CentOS Stream 系列
    dnf install -y git
elif command -v yum >/dev/null 2>&1; then
    # CentOS 7/RHEL 7 系列
    yum install -y git
elif command -v pacman >/dev/null 2>&1; then
    # Arch Linux 系列
    pacman -Sy --noconfirm git
else
    echo "未检测到支持的包管理器，请手动安装。"
    exit 1
fi

# 验证安装
if command -v git >/dev/null 2>&1; then
    echo "--------------------------------"
    echo "Git 安装成功！"
    git --version
    echo "--------------------------------"
else
    echo "安装失败，请检查网络连接或系统源配置。"
    exit 1
fi
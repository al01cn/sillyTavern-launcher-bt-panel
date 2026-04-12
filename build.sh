#!/bin/bash
# 宝塔插件打包脚本 - Linux/Unix Shell
# 用法: ./build.sh [选项]

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查 Python 是否可用
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "[错误] 未找到 Python，请先安装 Python"
        exit 1
    fi
    PYTHON_CMD="python"
else
    PYTHON_CMD="python3"
fi

# 执行打包脚本
exec "$PYTHON_CMD" "$SCRIPT_DIR/pack.py" "$@"

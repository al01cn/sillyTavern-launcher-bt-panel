#!/usr/bin/env pwsh
# 宝塔插件打包脚本 - PowerShell
# 用法: .\build.ps1 [选项]

# 设置 UTF-8 编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 检查 Python 是否可用
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "[错误] 未找到 Python，请先安装 Python" -ForegroundColor Red
    exit 1
}

# 获取脚本所在目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 执行打包脚本（传递所有参数）
& python "$scriptDir\pack.py" $args
exit $LASTEXITCODE

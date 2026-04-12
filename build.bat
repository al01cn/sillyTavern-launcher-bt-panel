@echo off
chcp 65001 >nul
REM 宝塔插件打包脚本 - Windows Batch
REM 用法: build.bat [选项]

setlocal enabledelayedexpansion

REM 检查 Python 是否可用
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python
    exit /b 1
)

REM 传递所有参数给 pack.py
python "%~dp0pack.py" %*

exit /b %errorlevel%

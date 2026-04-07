#!/bin/bash
PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin
export PATH

# ===== 插件基本信息（打包时自动从 package.json 替换） =====
PLUGIN_NAME="{{#plugin_name#}}"
install_path="/www/server/panel/plugin/${PLUGIN_NAME}"
stl_path="/www/server/${PLUGIN_NAME}"

# 安装
Install()
{
    echo "=========================================="
    echo "正在安装 {{#title#}} 插件..."
    echo "=========================================="

    # 创建插件目录
    mkdir -p "${install_path}"

    # 创建服务目录
    mkdir -p "${stl_path}"

    # ====================================================
    # 依赖安装（如需安装系统依赖或 pip 包，在此处添加）
    # 例如：
    #   yum install -y some-package
    #   pip install some-python-package
    # ====================================================

    # 设置目录权限
    chown -R root:root "${install_path}"
    chmod -R 755 "${install_path}"

    # 设置服务目录权限
    chown -R root:root "${stl_path}"
    chmod -R 755 "${stl_path}"

    echo "=========================================="
    echo "{{#plugin_title#}} 插件安装完成！"
    echo "=========================================="
}

# 卸载
Uninstall()
{
    echo "=========================================="
    echo "正在卸载 {{#title#}} 插件..."
    echo "=========================================="

    # ====================================================
    # 依赖清理（如需卸载系统依赖或 pip 包，在此处添加）
    # ====================================================

    # 删除插件目录
    rm -rf "${install_path}"

    # 删除服务目录
    rm -rf "${stl_path}"

    echo "=========================================="
    echo "{{#title#}} 插件卸载完成！"
    echo "=========================================="
}

# 操作判断
action="${1}"
if [ "${action}" == "install" ]; then
    Install
elif [ "${action}" == "uninstall" ]; then
    Uninstall
else
    echo "Error: 请使用 install 或 uninstall 参数"
    exit 1
fi

#!/bin/bash
PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin
export PATH

# ===== 插件基本信息（打包时自动从 package.json 替换） =====
PLUGIN_NAME="{{#plugin_name#}}"
install_path="/www/server/panel/plugin/${PLUGIN_NAME}"
stl_path="/www/server/${PLUGIN_NAME}"
config_file="${stl_path}/config.json"

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

    # 检查并安装 Git
    if ! command -v git >/dev/null 2>&1; then
        echo "未检测到 Git，正在尝试安装..."
        
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
            echo "错误：未检测到支持的包管理器，请手动安装 Git。"
            exit 1
        fi

        # 验证安装结果
        if ! command -v git >/dev/null 2>&1; then
            echo "错误：Git 安装失败。"
            exit 1
        fi
    fi

    echo "--------------------------------"
    echo "Git 已就绪"
    git --version
    echo "--------------------------------"

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

    keep_data=1
    if [ -f "${config_file}" ]; then
        keep_data=$(python3 - <<EOF
import json
import sys
try:
    with open(r"${config_file}", 'r', encoding='utf-8') as f:
        data = json.load(f)
    keep = data.get('keep_data', True)
    sys.stdout.write('1' if keep else '0')
except Exception:
    sys.stdout.write('1')
EOF
)
        if [ -z "${keep_data}" ]; then
            keep_data=1
        fi
    fi



    # 删除插件目录
    rm -rf "${install_path}"

    if [ "${keep_data}" -eq 0 ]; then
        echo "[警告] 根据设置，卸载将删除酒馆数据和PM2服务"

        # 删除反向代理配置
        echo "正在删除反向代理配置..."
        python3 <<'PYEOF'
import sys
import os
sys.path.insert(0, '/www/server/panel')
os.environ['BT_SETUP'] = 'True'

try:
    import public
    from panelSite import panelSite
    
    site = panelSite()
    
    # 获取站点列表，查找 stl_sillytavern 站点
    sites = site.GetSiteInfo(None)
    target_site = None
    for s in sites:
        if s.get('name') == 'stl_sillytavern':
            target_site = s
            break
    
    if target_site:
        site_id = target_site.get('id')
        # 删除站点（包括反向代理配置）
        result = site.DeleteSite(None, {'id': site_id, 'webname': 'stl_sillytavern'})
        if result.get('status'):
            print("反向代理配置已删除")
        else:
            print("删除反向代理配置失败: " + str(result.get('msg', '')))
    else:
        print("未找到 stl_sillytavern 站点，跳过删除")
except Exception as e:
    print("删除反向代理配置时出错: " + str(e))
PYEOF
        
        # 停止并删除酒馆的 PM2 服务
        if command -v pm2 &> /dev/null; then
            echo "正在停止酒馆 PM2 服务..."
            pm2 stop stl_sillytavern 2>/dev/null || true
            echo "正在删除酒馆 PM2 服务记录..."
            pm2 delete stl_sillytavern 2>/dev/null || true
            echo "酒馆 PM2 服务已清理"
        fi
        
        # 删除酒馆数据目录
        echo "正在删除酒馆数据目录: ${stl_path}"
        rm -rf "${stl_path}"
        echo "酒馆数据目录已删除"
    else
        echo "保留酒馆数据目录：${stl_path}"
        echo "注意：酒馆服务仍在运行，如需停止请手动执行 pm2 stop stl_sillytavern"
    fi

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

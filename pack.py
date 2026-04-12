#!/usr/bin/env python
# coding: utf-8
"""
宝塔插件打包脚本

用法:
    python pack.py                              # 默认打包 (dev)
    python pack.py --type dev                   # 开发版打包
    python pack.py --type beta                  # 测试版打包
    python pack.py --type release               # 正式版打包
    python pack.py --version 1.1                # 指定版本号打包
    python pack.py --version 2.0 --type beta    # 组合使用

流程:
    1. 从 package.json 读取插件信息
    2. 读取 src/ 源码，替换占位符 {{#plugin_xxx#}}
    3. 生成 info.json（从 package.json 直接构建）
    4. 根据构建类型输出到不同目录，不修改 src/ 任何文件

构建类型:
    - dev (默认): 输出到 dist/dev/，压缩包名加 dev_ 前缀，title 加 [开发版]，添加 is_beta: true
    - beta: 输出到 dist/beta/，压缩包名加 beta_ 前缀，title 加 [测试版]，添加 is_beta: true
    - release: 输出到 dist/release/，保持原始配置，无任何修改

占位符语法: {{#plugin_xxx#}}，字段名以 plugin_ 前缀直观命名，
通过 PLACEHOLDER_MAP 映射到 package.json 中的键。
src/ 中任何文件都可以使用占位符，打包时自动替换（仅在文件包含占位符时才处理）。
代码文件（JS/Python）中建议写成 "{{#plugin_xxx#}}" 字符串形式，避免触发代码审查。
templates/ 目录不参与替换（保留 Jinja2 模板语法）。
"""

import os
import sys
import re
import json
import shutil
import zipfile
import argparse

# 占位符正则: {{#plugin_xxx#}}
PLACEHOLDER_RE = re.compile(r"\{\{#(\w+)#\}\}")

# 占位符名称 → package.json 键的映射
# 模板中使用 {{#plugin_name#}} 这样的直观命名，打包时映射到 package.json 中的 "name"
PLACEHOLDER_MAP = {
    "plugin_title": "title",
    "plugin_name": "name",
    "plugin_description": "ps",
    "plugin_version": "versions",
    "plugin_author": "author",
    "plugin_home": "home",
    "plugin_sort": "sort",
    "plugin_icon": "icon",
    "plugin_checks": "checks",
    "plugin_coexist": "coexist",
}


def load_package_json():
    """从根目录 package.json 读取插件信息"""
    pkg_path = os.path.join(BASE_DIR, "package.json")
    if not os.path.exists(pkg_path):
        print("[错误] 找不到根目录 package.json")
        sys.exit(1)

    with open(pkg_path, "r", encoding="utf-8") as f:
        return json.load(f)


def has_placeholder(content):
    """检查内容是否包含占位符"""
    return PLACEHOLDER_RE.search(content) is not None


def replace_placeholders(content, variables):
    """替换内容中的 {{#plugin_xxx#}} 占位符，未匹配到的保持原样"""
    def replacer(match):
        placeholder = match.group(1)
        # 先通过映射表查找，映射到的 key 再从 variables 取值
        pkg_key = PLACEHOLDER_MAP.get(placeholder, placeholder)
        if pkg_key in variables:
            return str(variables[pkg_key])
        return match.group(0)

    return PLACEHOLDER_RE.sub(replacer, content)


def build_info_json(variables):
    """构建 info.json 内容（从 package.json 提取宝塔需要的字段）"""
    bt_fields = ["title", "name", "ps", "versions", "checks", "author", "home", "sort", "icon", "coexist", "is_beta"]
    info = {}
    for field in bt_fields:
        if field in variables:
            info[field] = variables[field]
    return info


def clear_dist():
    """清空 dist 目录"""
    if os.path.exists(DIST_DIR):
        for item in os.listdir(DIST_DIR):
            item_path = os.path.join(DIST_DIR, item)
            if os.path.isfile(item_path):
                os.remove(item_path)
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)
    else:
        os.makedirs(DIST_DIR)
    print("[信息] 已清理 dist 目录")


# 不打包的文件/目录
EXCLUDE_NAMES = {".git", ".gitignore", "__pycache__", ".DS_Store", "Thumbs.db"}
EXCLUDE_EXTS = {".pyc", ".pyo"}


def should_exclude(name):
    """判断文件是否应该排除"""
    if name in EXCLUDE_NAMES:
        return True
    for ext in EXCLUDE_EXTS:
        if name.endswith(ext):
            return True
    return False


def pack(args):
    """执行打包"""
    # 1. 从 package.json 读取信息
    pkg_info = load_package_json()

    # 2. 确定构建类型（默认 dev）
    build_type = args.type if args.type else 'dev'
    
    # 3. 构建替换变量
    variables = dict(pkg_info)
    if args.version:
        variables["versions"] = args.version

    plugin_name = variables.get("name", "stl")
    version = variables.get("versions", "0.1")
    original_title = variables.get("title", "酒馆启动器")

    # 4. 根据构建类型调整配置
    if build_type == 'dev':
        output_dir = os.path.join(DIST_DIR, 'dev')
        version_prefix = 'dev_'
        title_suffix = '[开发版]'
        variables['is_beta'] = True  # 告诉面板这是测试版本
        print(f"[打包] 构建类型: 开发版 (dev)")
    elif build_type == 'beta':
        output_dir = os.path.join(DIST_DIR, 'beta')
        version_prefix = 'beta_'
        title_suffix = '[测试版]'
        variables['is_beta'] = True  # 告诉面板这是测试版本
        print(f"[打包] 构建类型: 测试版 (beta)")
    else:  # release
        output_dir = os.path.join(DIST_DIR, 'release')
        version_prefix = ''
        title_suffix = ''
        print(f"[打包] 构建类型: 正式版 (release)")

    # 5. 修改标题（如果需要）
    if title_suffix:
        variables['title'] = f"{original_title}{title_suffix}"

    print(f"[打包] 插件名称: {plugin_name}")
    print(f"[打包] 版本号: {version}")
    print(f"[打包] 输出目录: {os.path.relpath(output_dir, BASE_DIR)}")
    print("=" * 40)

    # 6. 清理并创建当前类型的输出目录
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)
    print(f"[信息] 已准备输出目录: {os.path.relpath(output_dir, BASE_DIR)}")

    # 7. 打包 src/ 源码，替换占位符后写入 zip
    zip_name = f"{plugin_name}_v{version_prefix}{version}.zip"
    zip_path = os.path.join(output_dir, zip_name)

    # templates/ 目录不替换占位符
    NO_REPLACE_PREFIX = os.path.join(SRC_DIR, "templates")

    print("-" * 40)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        file_count = 0
        for root, dirs, files in os.walk(SRC_DIR):
            dirs[:] = [d for d in dirs if not should_exclude(d)]

            for file in files:
                if should_exclude(file):
                    continue

                src_path = os.path.join(root, file)
                arc_name = os.path.relpath(src_path, SRC_DIR).replace("\\", "/")

                # 特殊处理：重命名 {{#plugin_name#}}_main.py 为 {plugin_name}_main.py
                if file == '{{#plugin_name#}}_main.py':
                    arc_name = arc_name.replace('{{#plugin_name#}}_main.py', f'{plugin_name}_main.py')

                # 判断是否需要替换占位符
                if root.startswith(NO_REPLACE_PREFIX):
                    # templates/ 不替换，原样写入
                    zf.write(src_path, arc_name)
                else:
                    # 其他源码文件：读取 → 仅当包含占位符时替换 → 写入 zip
                    try:
                        with open(src_path, "r", encoding="utf-8") as f:
                            content = f.read()
                    except (UnicodeDecodeError, PermissionError):
                        # 二进制文件原样写入
                        zf.write(src_path, arc_name)
                    else:
                        # 特殊处理：替换类名中的 plugin_name
                        if file == '{{#plugin_name#}}_main.py' or file.endswith('_main.py'):
                            # 替换类定义中的 plugin_name 为实际的插件名
                            content = re.sub(r'class\s+plugin_name_main:', f'class {plugin_name}_main:', content)
                        
                        if has_placeholder(content):
                            content = replace_placeholders(content, variables)
                            zf.writestr(arc_name, content)
                        else:
                            # 无占位符，但有类名需要替换
                            if 'plugin_name_main' in content and plugin_name != 'plugin_name':
                                zf.writestr(arc_name, content)
                            else:
                                # 无占位符，原样写入（不经过字符串处理）
                                zf.write(src_path, arc_name)

                file_count += 1
                print(f"  + {arc_name}")

        # 写入 info.json（从 package.json 构建，不依赖源码文件）
        info = build_info_json(variables)
        zf.writestr("info.json", json.dumps(info, ensure_ascii=False, indent=2) + "\n")
        file_count += 1
        print("  + info.json")

    size = os.path.getsize(zip_path)
    size_str = f"{size / (1024 * 1024):.2f} MB" if size > 1024 * 1024 else f"{size / 1024:.2f} KB"

    print("-" * 40)
    print(f"[完成] 共打包 {file_count} 个文件")
    print(f"[完成] 输出: {os.path.relpath(zip_path, BASE_DIR)} ({size_str})")


# ===== 路径配置 =====
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BASE_DIR, "src")
DIST_DIR = os.path.join(BASE_DIR, "dist")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="宝塔插件打包工具")
    parser.add_argument("--version", "-v", type=str, default=None, help="指定版本号（默认读取 package.json）")
    parser.add_argument("--type", "-t", type=str, choices=['dev', 'beta', 'release'], default=None, 
                       help="构建类型: dev(开发版), beta(测试版), release(正式版)，默认为 dev")
    pack(parser.parse_args())

#!/usr/bin/python
# coding: utf-8
# +-------------------------------------------------------------------
# | 宝塔Linux面板
# +-------------------------------------------------------------------
# | Copyright (c) 2015-2099 宝塔软件(http://bt.cn) All rights reserved.
# +-------------------------------------------------------------------

import sys
import os
import re
import json
import socket

# 设置运行目录
os.chdir("/www/server/panel")

stl_path = os.path.join("/www/server", "stl") # 插件数据根目录

sillyTavern_path = os.path.join(stl_path, "sillyTavern") # 酒馆存放位置

config_file = os.path.join(stl_path, "config.json") # 插件配置文件

# 添加包引用位置并引用公共包
sys.path.append("class/")
import public # type: ignore

# 在非命令行模式下引用面板缓存和session对象
if __name__ != '__main__':
    from BTPanel import cache, session, redirect # type: ignore


class stl_main:
    """宝塔插件 stl - 后端主程序

    类名必须与文件名（不含 _main 后缀）一致。
    前端通过 plugin?action=a&s=方法名&name=stl 调用。
    """

    __plugin_path = "/www/server/panel/plugin/{{#plugin_name#}}/"
    __config = None

    # 日志增量读取位置追踪：{'out': (inode, size, line_count), 'err': ...}
    _log_positions = {}

    def __init__(self):
        # 检查PyYAML可用性
        self._yaml_available = False
        try:
            import yaml
            self._yaml_available = True
        except ImportError:
            # 尝试自动安装
            try:
                result = public.ExecShell('pip install pyyaml 2>&1')
                if result[1] == '':  # 无错误输出
                    import yaml
                    self._yaml_available = True
            except Exception:
                pass
        
        if not self._yaml_available:
            public.WriteLog('STL', '警告: PyYAML未安装，酒馆配置管理功能将不可用')

    # 读取配置项(插件自身的配置文件)
    # @param key   取指定配置项，若不传则取所有配置 [可选]
    # @param force 强制从文件重新读取配置项 [可选]
    def __get_config(self, key=None, force=False):
        if not self.__config or force:
            if os.path.exists(config_file):
                f_body = public.ReadFile(config_file)
                if f_body:
                    try:
                        self.__config = json.loads(f_body)
                    except Exception:
                        self.__config = {}
                else:
                    self.__config = {}
            else:
                # 首次读取：确保目录存在并创建空文件
                self._ensure_config_dir()
                self.__config = {}
                try:
                    public.WriteFile(config_file, json.dumps(self.__config))
                except Exception:
                    pass

        if not self.__config:
            self.__config = {}

        if key:
            return self.__config.get(key)
        return self.__config

    # 设置配置项(插件自身的配置文件)
    # @param key   要被修改或添加的配置项 [可选]
    # @param value 配置值 [可选]
    def __set_config(self, key=None, value=None):
        self._ensure_config_dir()

        if not self.__config or not isinstance(self.__config, dict):
            self.__config = self.__get_config(force=True) or {}

        if key is not None:
            self.__config[key] = value
        elif isinstance(value, dict):
            self.__config = value

        public.WriteFile(config_file, json.dumps(self.__config))
        return True

    def _ensure_config_dir(self):
        """确保 config.json 所在目录存在"""
        config_dir = os.path.dirname(config_file)
        if not os.path.exists(config_dir):
            try:
                os.makedirs(config_dir, exist_ok=True)
            except Exception:
                pass

        if not os.path.exists(config_file):
            try:
                public.WriteFile(config_file, json.dumps({}))
            except Exception:
                pass

    def get_system_info(self, args):
        """获取系统信息（整合接口）

        返回: { status, app_version, node_version, git_version, tavern_version }
        """
        import re

        # 1. 获取插件版本（从配置文件或默认值）
        app_version = self.__get_config('plugin_version') or '1.0.0'

        # 2. 获取 Node.js 版本
        node_version = ''
        try:
            result = public.ExecShell('node -v')
            node_version = (result[0] or '').strip()
        except Exception:
            pass

        # 3. 获取 Git 版本
        git_version = ''
        try:
            result = public.ExecShell('git --version')
            git_version = (result[0] or '').strip()
        except Exception:
            pass

        # 4. 获取酒馆版本
        tavern_version = ''
        st_path = self.__get_config('sillytavern_path') or sillyTavern_path
        pkg_file = os.path.join(st_path, 'package.json')
        if os.path.isfile(pkg_file):
            try:
                content = public.ReadFile(pkg_file)
                if content:
                    match = re.search(r'"version"\s*:\s*"([^"]+)"', content)
                    if match:
                        tavern_version = match.group(1)
            except Exception:
                pass

        return {
            'status': True,
            'app_version': app_version,
            'node_version': node_version,
            'git_version': git_version,
            'tavern_version': tavern_version
        }

    def get_nodejs_version(self, args):

        """获取系统当前默认的 Node.js 版本（执行 node -v）"""
        try:
            result = public.ExecShell('node -v')
            version = (result[0] or '').strip()
            if version:
                return {'status': True, 'version': version}
            # 检查 stderr，可能是 node 未安装
            err = (result[1] or '').strip()
            msg = err if err else '未检测到 Node.js'
            return {'status': False, 'msg': msg, 'version': ''}
        except Exception as e:
            return {'status': False, 'msg': str(e), 'version': ''}

    def is_pm2_installed(self, args):
        """检测 PM2 是否已安装（执行 pm2 --version）"""
        try:
            result = public.ExecShell('pm2 --version')
            output = (result[0] or '').strip()
            if output:
                return {'status': True, 'installed': True, 'version': output}
            # stdout 为空，可能未安装
            return {'status': True, 'installed': False, 'version': ''}
        except Exception as e:
            return {'status': True, 'installed': False, 'version': '', 'msg': str(e)}

    def set_npm_registry(self, args):
        """全局设置 NPM 源（执行 npm config set registry <url>）"""
        registry = (args.get('registry') or '').strip()
        if not registry:
            return {'status': False, 'msg': 'registry 不能为空'}
        try:
            public.ExecShell('npm config set registry ' + registry)
            return {'status': True, 'msg': 'NPM 源已全局设置为 ' + registry}
        except Exception as e:
            return {'status': False, 'msg': str(e)}

    def get_npm_registry(self, args):
        """获取当前 NPM 源（执行 npm config get registry）"""
        try:
            result = public.ExecShell('npm config get registry')
            registry = (result[0] or '').strip()
            if registry:
                return {'status': True, 'registry': registry}
            err = (result[1] or '').strip()
            msg = err if err else '未检测到 NPM 源配置'
            return {'status': False, 'msg': msg, 'registry': ''}
        except Exception as e:
            return {'status': False, 'msg': str(e), 'registry': ''}

    # ==================== 网络代理相关 ====================

    def get_proxy_config(self, args):
        """获取网络代理配置

        返回: { status, mode, host, port, system_proxy, keep_data }
          - mode: 'none' | 'system' | 'custom'
          - host/port: 自定义代理信息
          - system_proxy: { http_proxy, https_proxy, all_proxy } 或 null
          - keep_data: bool 卸载时是否保留数据
        """
        config = self.__get_config(force=True) or {}
        proxy_config = config.get('proxy') or {}
        mode = proxy_config.get('mode', 'none')
        host = proxy_config.get('host', '')
        port = proxy_config.get('port', '')

        # 跟随系统时，读取环境变量；未获取到则自动回退为不使用代理
        system_proxy = None
        if mode == 'system':
            system_proxy = self._read_system_proxy_env()
            if not system_proxy:
                mode = 'none'
                host = ''
                port = ''
                self.__set_config('proxy', {
                    'mode': 'none',
                    'host': host,
                    'port': port
                })

        keep_data = config.get('keep_data', True)

        return {
            'status': True,
            'mode': mode,
            'host': host,
            'port': port,
            'system_proxy': system_proxy,
            'keep_data': keep_data
        }




    def save_proxy_config(self, args):
        """保存网络代理配置或数据设置

        参数 args:
          - mode: 'none' | 'system' | 'custom'
          - host: 代理地址（custom 模式时）
          - port: 代理端口（custom 模式时）
          - keep_data: bool，卸载时保留数据目录
        返回: { status, msg }
        """
        config = self.__get_config(force=True) or {}
        proxy_config = config.get('proxy') or {}
        keep_data = config.get('keep_data', True)

        if 'keep_data' in args:
            keep_flag = args.get('keep_data')
            if isinstance(keep_flag, str):
                keep_flag = keep_flag.lower() in ('1', 'true', 'on', 'yes')
            keep_data = bool(keep_flag)


        if 'mode' in args:
            mode = (args.get('mode') or 'none').strip()
            if mode not in ('none', 'system', 'custom'):
                return {'status': False, 'msg': '无效的代理模式: ' + mode}

            host = ''
            port = ''
            msg = '代理配置已保存'
            system_proxy = None

            if mode == 'custom':
                host = (args.get('host') or '').strip() or '127.0.0.1'
                port = (args.get('port') or '').strip() or '7890'
            elif mode == 'system':
                sys_proxy = self._read_system_proxy_env()
                if not sys_proxy:
                    mode = 'none'
                    msg = '未检测到系统代理环境变量，已切换为不使用代理'
                else:
                    system_proxy = sys_proxy

            proxy_config = {
                'mode': mode,
                'host': host,
                'port': port,
                'system_proxy': system_proxy,
                'msg': msg
            }
        else:
            proxy_config.setdefault('mode', 'none')
            proxy_config.setdefault('host', '')
            proxy_config.setdefault('port', '')
            proxy_config['system_proxy'] = None
            proxy_config['msg'] = '设置已保存'


        config['proxy'] = {
            'mode': proxy_config.get('mode', 'none'),
            'host': proxy_config.get('host', ''),
            'port': proxy_config.get('port', '')
        }
        config['keep_data'] = keep_data
        self.__set_config(None, config)

        return {
            'status': True,
            'msg': proxy_config.get('msg', '设置已保存'),
            'mode': config['proxy']['mode'],
            'host': config['proxy']['host'],
            'port': config['proxy']['port'],
            'system_proxy': proxy_config.get('system_proxy'),
            'keep_data': keep_data
        }





    def _read_system_proxy_env(self):
        """读取系统环境变量中的代理设置

        返回: { http_proxy, https_proxy, all_proxy } 或 None（未设置时）
        """
        http_proxy = os.environ.get('http_proxy') or os.environ.get('HTTP_PROXY') or ''
        https_proxy = os.environ.get('https_proxy') or os.environ.get('HTTPS_PROXY') or ''
        all_proxy = os.environ.get('all_proxy') or os.environ.get('ALL_PROXY') or ''

        if not http_proxy and not https_proxy and not all_proxy:
            return None

        return {
            'http_proxy': http_proxy,
            'https_proxy': https_proxy,
            'all_proxy': all_proxy
        }

    def get_proxy_env(self, args):
        """获取当前生效的代理环境变量（用于执行 Git/NPM 等命令时注入）

        返回: { status, env } 其中 env 为需要注入的环境变量字典，无代理时为空 {}
        """
        proxy_config = self.__get_config('proxy') or {}
        mode = proxy_config.get('mode', 'none')

        env_vars = {}

        if mode == 'custom':
            host = proxy_config.get('host', '').strip()
            port = proxy_config.get('port', '').strip()
            if host and port:
                proxy_url = 'http://' + host + ':' + port
                env_vars['http_proxy'] = proxy_url
                env_vars['https_proxy'] = proxy_url
                env_vars['all_proxy'] = 'socks5://' + host + ':' + port
        elif mode == 'system':
            # 跟随系统：直接从环境变量透传
            sys_proxy = self._read_system_proxy_env()
            if sys_proxy:
                if sys_proxy.get('http_proxy'):
                    env_vars['http_proxy'] = sys_proxy['http_proxy']
                if sys_proxy.get('https_proxy'):
                    env_vars['https_proxy'] = sys_proxy['https_proxy']
                if sys_proxy.get('all_proxy'):
                    env_vars['all_proxy'] = sys_proxy['all_proxy']

        return {
            'status': True,
            'env': env_vars,
            'mode': mode
        }

    def _get_proxy_env_dict(self):
        """内部方法：获取合并了代理设置的环境变量字典

        用于 subprocess.Popen 的 env 参数。
        返回 os.environ.copy() + 代理环境变量
        """
        env = os.environ.copy()
        proxy_config = self.__get_config('proxy') or {}
        mode = proxy_config.get('mode', 'none')

        if mode == 'custom':
            host = proxy_config.get('host', '').strip()
            port = proxy_config.get('port', '').strip()
            if host and port:
                proxy_url = 'http://' + host + ':' + port
                env['http_proxy'] = proxy_url
                env['https_proxy'] = proxy_url
                env['all_proxy'] = 'socks5://' + host + ':' + port
        elif mode == 'system':
            sys_proxy = self._read_system_proxy_env()
            if sys_proxy:
                if sys_proxy.get('http_proxy'):
                    env['http_proxy'] = sys_proxy['http_proxy']
                if sys_proxy.get('https_proxy'):
                    env['https_proxy'] = sys_proxy['https_proxy']
                if sys_proxy.get('all_proxy'):
                    env['all_proxy'] = sys_proxy['all_proxy']

        return env

    def _build_pm2_proxy_env(self):
        """内部方法：构建 PM2 代理环境变量字典（仅代理相关，用于 ecosystem 配置）

        根据插件代理设置动态决定环境变量：
        - mode='none': 不设置代理
        - mode='custom': 使用自定义代理地址
        - mode='system': 使用系统代理
        """
        proxy_config = self.__get_config('proxy') or {}
        mode = proxy_config.get('mode', 'none')
        result = {}

        if mode == 'custom':
            host = proxy_config.get('host', '').strip()
            port = proxy_config.get('port', '').strip()
            if host and port:
                proxy_url = 'http://' + host + ':' + port
                result['http_proxy'] = proxy_url
                result['https_proxy'] = proxy_url
                result['all_proxy'] = 'socks5://' + host + ':' + port
                result['no_proxy'] = 'localhost,127.0.0.1'

        elif mode == 'system':
            sys_proxy = self._read_system_proxy_env()
            if sys_proxy:
                if sys_proxy.get('http_proxy'):
                    result['http_proxy'] = sys_proxy['http_proxy']
                if sys_proxy.get('https_proxy'):
                    result['https_proxy'] = sys_proxy['https_proxy']
                if sys_proxy.get('all_proxy'):
                    result['all_proxy'] = sys_proxy['all_proxy']
                if sys_proxy.get('http_proxy') or sys_proxy.get('https_proxy'):
                    result['no_proxy'] = 'localhost,127.0.0.1'

        return result

    def _ensure_ecosystem_config(self, app_dir):
        """内部方法：生成/更新 SillyTavern 根目录的 ecosystem.config.cjs

        每次调用都会重新生成，确保代理等设置是最新的。
        配置文件放在酒馆根目录，随 SillyTavern 更新会被覆盖，
        所以安装/更新后下次启动时会自动重建。

        参数 app_dir: SillyTavern 目录路径
        返回: ecosystem.config.cjs 的绝对路径
        """
        ecosystem_file = os.path.join(app_dir, 'ecosystem.config.cjs')

        # 构建 proxy env
        proxy_env = self._build_pm2_proxy_env()

        # 构建 proxy env 部分
        proxy_lines = []
        if proxy_env:
            for k, v in proxy_env.items():
                v_escaped = v.replace("'", "\\'")
                proxy_lines.append(f"      {k}: '{v_escaped}',")

        proxy_section = '\n'.join(proxy_lines)

        # config.yaml 路径
        config_path = os.path.join(app_dir, 'config.yaml').replace('\\', '/')

        # 拼接 CJS 内容
        env_block = f"""      NODE_ENV: 'production',
{proxy_section}""" if proxy_env else "      NODE_ENV: 'production'"

        cjs_content = f"""module.exports = {{
  apps: [{{
    name: '{self.PM2_APP_NAME}',
    script: './server.js',
    args: '--configPath {config_path}',
    cwd: __dirname,
    interpreter: 'none',
    env: {{
{env_block}
    }},
    watch: false,
    autorestart: true
  }}]
}};
"""

        with open(ecosystem_file, 'w', encoding='utf-8') as f:
            f.write(cjs_content)

        return ecosystem_file

        # 写入文件
        with open(ecosystem_file, 'w', encoding='utf-8') as f:
            f.write(cjs_content)

        return ecosystem_file

    # ==================== PM2 相关 ====================

    PM2_APP_NAME = 'stl_sillytavern'  # PM2 进程唯一标识，不可修改

    def install_pm2(self, args):
        """通过 NodeJs 插件安装 PM2 模块

        参数 args:
          - version: Node.js 版本号（如 v20.10.0），不传则使用系统默认 node
        返回: { status, msg }
        """
        version = (args.get('version') or '').strip()
        try:
            import public as _pub
            result = _pub.ExecShell('npm install -g pm2')
            out = (result[0] or '').strip()
            err = (result[1] or '').strip()
            if err and 'ERR!' in err:
                return {'status': False, 'msg': 'PM2 安装失败: ' + err}
            return {'status': True, 'msg': 'PM2 安装成功'}
        except Exception as e:
            return {'status': False, 'msg': 'PM2 安装异常: ' + str(e)}

    def pm2_start(self, args):
        """使用 PM2 后台启动 SillyTavern

        参数 args:
          - app_dir: SillyTavern 项目目录（不传则使用默认路径）
        返回: { status, msg }
        """
        app_dir = (args.get('app_dir') or '').strip()
        if not app_dir:
            app_dir = sillyTavern_path

        if not os.path.isdir(app_dir):
            return {'status': False, 'msg': 'SillyTavern 目录不存在: ' + app_dir}

        # 前置检查：验证酒馆是否已安装
        install_check = self.is_st_installed({'st_path': app_dir})
        if not install_check.get('installed'):
            return {'status': False, 'msg': 'SillyTavern 未安装，无法启动。请先完成安装。'}

        # 检查是否已在运行（必须是 online 状态，stopped 状态不算）
        check = public.ExecShell('pm2 jlist')
        pm2_exists = False
        try:
            import json as _json
            processes = _json.loads(check[0]) if check[0] else []
            for proc in processes:
                if proc.get('name') == self.PM2_APP_NAME:
                    pm2_exists = True
                    status = proc.get('pm2_env', {}).get('status', '')
                    if status == 'online':
                        return {'status': True, 'msg': 'SillyTavern 已在运行中（PID: ' + str(proc.get('pid', '')) + '）'}
                    # 进程存在但不是 online 状态，记录下来后面用 restart
        except Exception:
            pass

        # 确保有 ecosystem.config.cjs
        ecosystem_file = self._ensure_ecosystem_config(app_dir)

        # 清空旧日志
        public.ExecShell('pm2 flush ' + self.PM2_APP_NAME)

        # 进程已存在（但停止了）→ restart；不存在 → start
        if pm2_exists:
            cmd = 'pm2 restart ' + self.PM2_APP_NAME
        else:
            cmd = 'pm2 start "' + ecosystem_file + '"'
        result = public.ExecShell(cmd)
        out = (result[0] or '').strip()
        err = (result[1] or '').strip()
        if err and 'Error' in err:
            return {'status': False, 'msg': '启动失败: ' + err}
        return {'status': True, 'msg': 'SillyTavern 已启动'}

    def pm2_stop(self, args):
        """停止 PM2 管理的 SillyTavern 进程（pm2 stop）

        返回: { status, msg }
        """
        cmd = 'pm2 stop ' + self.PM2_APP_NAME
        result = public.ExecShell(cmd)
        out = (result[0] or '').strip()
        err = (result[1] or '').strip()
        if err and self.PM2_APP_NAME not in err:
            return {'status': False, 'msg': '停止失败: ' + err}
        return {'status': True, 'msg': 'SillyTavern 已停止'}

    def pm2_restart(self, args):
        """重启 PM2 管理的 SillyTavern 进程（pm2 restart）

        参数 args:
          - app_dir: SillyTavern 项目目录（可选）
        返回: { status, msg }

        注意：每次重启都会重新生成 ecosystem.config.cjs，确保代理等设置是最新的。
        """
        app_dir = (args.get('app_dir') or '').strip()
        if not app_dir:
            app_dir = self.__get_config('sillytavern_path') or sillyTavern_path

        if not os.path.isdir(app_dir):
            return {'status': False, 'msg': 'SillyTavern 目录不存在: ' + app_dir}

        # 前置检查：验证酒馆是否已安装
        install_check = self.is_st_installed({'st_path': app_dir})
        if not install_check.get('installed'):
            return {'status': False, 'msg': 'SillyTavern 未安装，无法重启。请先完成安装。'}

        # 重新生成 ecosystem 配置（覆盖旧文件，确保最新代理设置生效）
        ecosystem_file = self._ensure_ecosystem_config(app_dir)

        # 先删除旧进程，再用新配置启动
        public.ExecShell('pm2 delete ' + self.PM2_APP_NAME)

        # 清空旧日志
        public.ExecShell('pm2 flush ' + self.PM2_APP_NAME)

        cmd = 'pm2 start "' + ecosystem_file + '"'
        result = public.ExecShell(cmd)
        out = (result[0] or '').strip()
        err = (result[1] or '').strip()
        if err and 'Error' in err:
            return {'status': False, 'msg': '重启失败: ' + err}
        return {'status': True, 'msg': 'SillyTavern 已重启'}

    def pm2_force_stop(self, args):
        """强制停止并从 PM2 中移除 SillyTavern 进程（pm2 delete）

        不同于 pm2_stop（仅暂停），此方法会彻底从 PM2 进程列表中移除。
        返回: { status, msg }
        """
        cmd = 'pm2 delete ' + self.PM2_APP_NAME
        result = public.ExecShell(cmd)
        out = (result[0] or '').strip()
        err = (result[1] or '').strip()
        # pm2 delete 对不存在的进程也会报错，这里兼容处理
        if err and 'Error' in err and self.PM2_APP_NAME not in err:
            return {'status': False, 'msg': '强制停止失败: ' + err}
        return {'status': True, 'msg': 'SillyTavern 已强制停止并从 PM2 移除'}

    def pm2_delete(self, args):
        """从 PM2 中删除 SillyTavern 进程（停止并移除）

        返回: { status, msg }
        """
        cmd = 'pm2 delete ' + self.PM2_APP_NAME
        result = public.ExecShell(cmd)
        out = (result[0] or '').strip()
        err = (result[1] or '').strip()
        if err and self.PM2_APP_NAME not in err:
            return {'status': False, 'msg': '删除失败: ' + err}
        return {'status': True, 'msg': 'SillyTavern 进程已从 PM2 移除'}

    def pm2_reload(self, args):
        """优雅重载 PM2 管理的 SillyTavern（pm2 reload）

        对于 fork 模式，会先重新生成 ecosystem.config.cjs，再 delete + start。
        确保代理等设置变更后能生效。

        参数 args:
          - app_dir: SillyTavern 项目目录（可选）
        返回: { status, msg }
        """
        app_dir = (args.get('app_dir') or '').strip()
        if not app_dir:
            app_dir = self.__get_config('sillytavern_path') or sillyTavern_path

        if not os.path.isdir(app_dir):
            return {'status': False, 'msg': 'SillyTavern 目录不存在: ' + app_dir}

        # 前置检查：验证酒馆是否已安装
        install_check = self.is_st_installed({'st_path': app_dir})
        if not install_check.get('installed'):
            return {'status': False, 'msg': 'SillyTavern 未安装，无法重载。请先完成安装。'}

        # 重新生成 ecosystem 配置（覆盖旧文件，确保最新代理设置生效）
        ecosystem_file = self._ensure_ecosystem_config(app_dir)

        # 先删除旧进程，再用新配置启动
        public.ExecShell('pm2 delete ' + self.PM2_APP_NAME)

        # 清空旧日志
        public.ExecShell('pm2 flush ' + self.PM2_APP_NAME)

        cmd = 'pm2 start "' + ecosystem_file + '"'
        result = public.ExecShell(cmd)
        out = (result[0] or '').strip()
        err = (result[1] or '').strip()
        if err and 'Error' in err:
            return {'status': False, 'msg': '重载失败: ' + err}
        return {'status': True, 'msg': 'SillyTavern 已重载'}

    def pm2_logs(self, args):
        """增量获取 PM2 日志（只返回新增行）

        参数 args:
          - type: 'out' | 'err'，必填
          - reset: '1' 表示重置位置，重新读取全部历史
        返回: { status, lines: [{time, content, type}], hasMore }
        """
        import os
        import json as _json

        log_type = (args.get('type') or '').strip()
        do_reset = args.get('reset') == '1'

        if log_type not in ('out', 'err'):
            return {'status': False, 'msg': 'type 参数必填，可选值: out, err', 'lines': [], 'running': False}

        # 获取日志文件路径
        log_path = self._get_pm2_log_path(log_type)
        if not os.path.exists(log_path):
            # 返回更详细的错误信息
            return {'status': False, 'msg': f'日志文件不存在: {log_path}', 'lines': [], 'debug_path': log_path, 'running': False}

        # 检查进程是否存在，并获取运行状态
        check = public.ExecShell('pm2 jlist')
        process_running = False
        try:
            processes = _json.loads(check[0]) if check[0] else []
            for p in processes:
                if p.get('name') == self.PM2_APP_NAME:
                    status = p.get('pm2_env', {}).get('status', '')
                    process_running = (status == 'online')
                    break
        except Exception:
            pass

        try:
            stat = os.stat(log_path)
            inode = stat.st_ino
            size = stat.st_size
        except Exception:
            return {'status': False, 'msg': '无法读取日志文件', 'lines': [], 'running': process_running}

        # 读取文件全部内容（PM2 日志是追加模式，文件不大）
        try:
            with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
        except Exception:
            return {'status': False, 'msg': '无法读取日志内容', 'lines': [], 'running': process_running}

        all_lines = content.split('\n')
        total_lines = len(all_lines)

        # 日志轮转检测：inode 变化 → 重置
        if log_type in self._log_positions:
            old_inode, old_size, old_line_count = self._log_positions[log_type]
            if inode != old_inode:
                # 文件被重建（清空重建），重置位置
                do_reset = True

        if do_reset:
            self._log_positions[log_type] = (inode, size, 0)

        # 确定起始行
        start_pos = 0
        if log_type in self._log_positions:
            start_pos = self._log_positions[log_type][2]

        # 没有新增行
        if start_pos >= total_lines:
            self._log_positions[log_type] = (inode, size, total_lines)
            return {'status': True, 'lines': [], 'hasMore': False, 'running': process_running}

        # 增量获取新行
        new_lines = all_lines[start_pos:]
        parsed = []
        for line in new_lines:
            line = line.strip()
            if not line:
                continue
            # 解析时间戳（PM2 格式: "YY/MM/DD HH:MM:SS|name|msg"）
            time_str, msg = self._parse_pm2_line(line, log_type)
            parsed.append({
                'time': time_str,
                'content': msg,
                'raw': line
            })

        # 更新位置
        self._log_positions[log_type] = (inode, size, total_lines)

        return {'status': True, 'lines': parsed, 'hasMore': len(parsed) > 0, 'running': process_running}

    def _get_pm2_log_path(self, log_type):
        """获取 PM2 日志文件路径（通过 pm2 jlist 获取精准路径）"""
        import json

        res = public.ExecShell('pm2 jlist')
        if res[0]:
            try:
                apps = json.loads(res[0])
                for app in apps:
                    if app.get('name') == self.PM2_APP_NAME:
                        if log_type == 'err':
                            return app.get('pm2_env', {}).get('pm_err_log_path', '')
                        else:
                            return app.get('pm2_env', {}).get('pm_out_log_path', '')
            except Exception:
                pass  # 解析失败则降级

        # 降级方案：pm2 report --json 获取完整 JSON，Python 解析
        import os
        result = public.ExecShell('pm2 report --json 2>/dev/null')
        pm2_home = None
        if result[0]:
            try:
                report = json.loads(result[0])
                # pm2 report 的 JSON 结构中 HOME 字段位置可能不同，尝试多个 key
                pm2_home = (
                    report.get('GITHUB', {}).get('HOME') or
                    report.get('HOME') or
                    (report.get('God', {}).get('PM2_HOME') if isinstance(report.get('God'), dict) else None)
                )
            except Exception:
                pass
        if not pm2_home:
            pm2_home = os.path.expanduser('~/.pm2')

        return os.path.join(pm2_home, 'logs',
            self.PM2_APP_NAME + ('-error.log' if log_type == 'err' else '-out.log'))

    def _parse_pm2_line(self, line, log_type):
        """解析单行 PM2 日志，返回 (时间字符串, 消息内容)"""
        import re
        # PM2 格式: "YY/MM/DD HH:MM:SS|METADATA|实际日志内容"
        m = re.match(r'^(\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2})\|([^|]+)\|(.*)$', line)
        if m:
            time_str = m.group(1)
            # 去掉 ANSI 颜色码
            msg = re.sub(r'\x1b\[[0-9;]*m', '', m.group(3))
            return time_str, msg.strip()
        # 无法解析的直接返回原文
        return '', re.sub(r'\x1b\[[0-9;]*m', '', line)

    def clear_pm2_logs(self, args):
        """清空 PM2 的 SillyTavern 日志文件

        注意：必须用 pm2 flush，不能直接删除/截断文件，否则 PM2 文件句柄丢失不再写日志。

        返回: { status, msg }
        """
        result = public.ExecShell('pm2 flush ' + self.PM2_APP_NAME)
        out = (result[0] or '').strip()
        err = (result[1] or '').strip()
        if err and 'Error' in err:
            return {'status': False, 'msg': '清空日志失败: ' + err}
        return {'status': True, 'msg': '日志已清空（已刷新缓冲区）'}

    def get_pm2_log_paths(self, args):
        """获取 PM2 日志文件路径

        返回: { status, out_log, err_log, home_dir }
        """
        try:
            import os
            import json

            # 优先通过 pm2 jlist 获取精准路径
            res = public.ExecShell('pm2 jlist')
            if res[0]:
                try:
                    apps = json.loads(res[0])
                    for app in apps:
                        if app.get('name') == self.PM2_APP_NAME:
                            out_log = app.get('pm2_env', {}).get('pm_out_log_path', '')
                            err_log = app.get('pm2_env', {}).get('pm_err_log_path', '')
                            home_dir = os.path.dirname(os.path.dirname(out_log)) if out_log else ''
                            return {
                                'status': True,
                                'out_log': out_log,
                                'err_log': err_log,
                                'home_dir': home_dir
                            }
                except Exception:
                    pass  # 解析失败则降级

            # 降级方案：pm2 report --json 获取完整 JSON，Python 解析
            result = public.ExecShell('pm2 report --json 2>/dev/null')
            pm2_home = None
            if result[0]:
                try:
                    report = json.loads(result[0])
                    pm2_home = (
                        report.get('GITHUB', {}).get('HOME') or
                        report.get('HOME') or
                        (report.get('God', {}).get('PM2_HOME') if isinstance(report.get('God'), dict) else None)
                    )
                except Exception:
                    pass
            if not pm2_home:
                pm2_home = os.path.expanduser('~/.pm2')

            out_log = os.path.join(pm2_home, 'logs', self.PM2_APP_NAME + '-out.log')
            err_log = os.path.join(pm2_home, 'logs', self.PM2_APP_NAME + '-error.log')

            return {
                'status': True,
                'out_log': out_log,
                'err_log': err_log,
                'home_dir': pm2_home
            }
        except Exception as e:
            return {
                'status': False,
                'msg': str(e),
                'out_log': '',
                'err_log': '',
                'home_dir': ''
            }

    def pm2_status(self, args):
        """获取 SillyTavern 在 PM2 中的运行状态

        返回: { status, running, info }
          info: { pid, uptime, cpu, memory, restarts, status_text }
        """
        import json as _json

        cmd = 'pm2 jlist'
        result = public.ExecShell(cmd)
        try:
            processes = _json.loads(result[0]) if result[0] else []
        except Exception:
            return {'status': True, 'running': False, 'info': None}

        for proc in processes:
            if proc.get('name') == self.PM2_APP_NAME:
                info = {
                    'pid': proc.get('pid', 0),
                    'uptime': proc.get('pm2_env', {}).get('pm_uptime', 0),
                    'cpu': proc.get('monit', {}).get('cpu', 0),
                    'memory': proc.get('monit', {}).get('memory', 0),
                    'restarts': proc.get('pm2_env', {}).get('restart_time', 0),
                    'status_text': proc.get('pm2_env', {}).get('status', 'unknown')
                }
                running = info['status_text'] == 'online'
                return {'status': True, 'running': running, 'info': info}

        return {'status': True, 'running': False, 'info': None, 'msg': 'PM2 中未找到 SillyTavern 进程'}

    def start_service(self, args):
        """启动 SillyTavern 服务（别名方法，内部调用 pm2_start）
        
        返回: { status, msg, url }
        """
        # 先检查酒馆是否安装
        check_res = self.is_st_installed({})
        if not check_res.get('installed'):
            return {'status': False, 'msg': 'SillyTavern 未安装，请先安装'}
        
        # 调用 pm2_start
        result = self.pm2_start(args)
        
        # 如果启动成功，构建访问URL
        if result.get('status'):
            mode = self.__get_config('access_mode') or 'wan'
            url = self._build_access_url(mode)
            result['url'] = url
        
        return result

    def stop_service(self, args):
        """停止 SillyTavern 服务（别名方法，内部调用 pm2_stop）
        
        返回: { status, msg }
        """
        return self.pm2_stop(args)

    def get_st_listen_port(self, args):
        """从 PM2 out 日志中解析 SillyTavern 实际监听端口

        解析日志中的 'Go to: http://localhost:端口/' 行，这是酒馆启动时
        输出的最权威端口信息。

        返回: { status, port, url }
          - port: 端口号字符串（如 '8001'），解析失败为 ''
          - url:  完整的 Go to URL（如 'http://localhost:8001/'），解析失败为 ''
        """
        import os
        import re
        import json

        # 获取 out 日志路径
        log_path = self._get_pm2_log_path('out')
        if not log_path or not os.path.exists(log_path):
            return {'status': False, 'port': '', 'url': ''}

        # 检查进程是否在线
        check = public.ExecShell('pm2 jlist')
        process_running = False
        try:
            processes = json.loads(check[0]) if check[0] else []
            for p in processes:
                if p.get('name') == self.PM2_APP_NAME:
                    status = p.get('pm2_env', {}).get('status', '')
                    process_running = (status == 'online')
                    break
        except Exception:
            pass

        if not process_running:
            return {'status': False, 'port': '', 'url': '', 'msg': '服务未运行'}

        try:
            with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
        except Exception:
            return {'status': False, 'port': '', 'url': ''}

        # 从后往前找（最新的一行 Go to 优先）
        pattern = re.compile(r'Go to:\s*(https?://localhost:(\d+)/?)', re.IGNORECASE)
        matches = list(pattern.finditer(content))
        if matches:
            last_match = matches[-1]
            url = last_match.group(1)
            port = last_match.group(2)
            return {'status': True, 'port': port, 'url': url}

        return {'status': False, 'port': '', 'url': '', 'msg': '日志中未找到 Go to 信息'}

    def _get_real_port(self):
        """内部方法：获取酒馆实际监听端口

        优先从 PM2 日志解析，降级到配置文件。
        返回端口号字符串。
        """
        try:
            result = self.get_st_listen_port({})
            if result.get('status') and result.get('port'):
                return result['port']
        except Exception:
            pass
        return self.__get_config('tavern_port') or '8000'

    def _build_access_url(self, mode):
        """构建访问URL"""
        import socket
        port = self._get_real_port()

        if mode == 'lan':
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                s.connect(('8.8.8.8', 80))
                ip = s.getsockname()[0]
            except Exception:
                ip = '127.0.0.1'
            finally:
                s.close()
            return f'http://{ip}:{port}'
        else:
            # 公网模式：尝试 curl 获取公网 IP
            try:
                result = self.get_public_ips({})
                ip = result.get('ipv4') or result.get('ipv6') or 'localhost'
            except Exception:
                ip = 'localhost'
            return f'http://{ip}:{port}'

    def get_access_url(self, args):
        """获取访问 URL（供前端状态刷新时调用）

        参数 args:
          - mode: 'lan' | 'wan'，默认读取配置
        返回: { status, url }
        """
        mode = (args.get('mode') or self.__get_config('access_mode') or 'wan').strip()
        try:
            url = self._build_access_url(mode)
            return {'status': True, 'url': url}
        except Exception as e:
            return {'status': False, 'msg': str(e), 'url': ''}

    def get_public_ips(self, args):
        """获取服务器公网 IPv4 和 IPv6 地址（curl 方式）

        分别通过 curl 4.ipw.cn 和 curl 6.ipw.cn 获取，超时 5 秒。

        返回: { status, ipv4, ipv6 }
        """
        ipv4 = ''
        ipv6 = ''
        try:
            out4, _ = public.ExecShell('curl -s --connect-timeout 5 4.ipw.cn')
            if out4:
                ipv4 = out4.strip()
        except Exception:
            pass
        try:
            out6, _ = public.ExecShell('curl -s --connect-timeout 5 6.ipw.cn')
            if out6:
                ipv6 = out6.strip()
        except Exception:
            pass
        return {'status': True, 'ipv4': ipv4, 'ipv6': ipv6}

    def get_network_interfaces(self, args):
        """枚举服务器物理网卡的 IPv4 / IPv6 地址

        遍历 /sys/class/net/ 获取网卡列表，排除 lo 和常见虚拟网卡，
        通过 socket.getaddrinfo 获取每个网卡的地址。

        返回: { status, interfaces: [{ name, ipv4: [], ipv6: [] }] }
        """
        import socket
        import os

        interfaces = []
        net_path = '/sys/class/net/'

        # 虚拟网卡关键词（小写匹配）
        virtual_keywords = ('docker', 'veth', 'br-', 'virbr', 'lo')

        if not os.path.isdir(net_path):
            return {'status': True, 'interfaces': interfaces}

        try:
            iface_names = os.listdir(net_path)
        except Exception:
            return {'status': True, 'interfaces': interfaces}

        for iface in sorted(iface_names):
            # 过滤虚拟网卡
            if iface == 'lo':
                continue
            lower = iface.lower()
            if any(kw in lower for kw in virtual_keywords):
                continue

            # 检查网卡是否处于 UP 状态
            oper_file = os.path.join(net_path, iface, 'operstate')
            if os.path.exists(oper_file):
                try:
                    with open(oper_file, 'r') as f:
                        state = f.read().strip()
                    if state != 'up':
                        continue
                except Exception:
                    pass

            ipv4_list = []
            ipv6_list = []

            try:
                addrs = socket.getaddrinfo(iface, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
                for family, _, _, _, sockaddr in addrs:
                    ip = sockaddr[0]
                    if family == socket.AF_INET and ip != '127.0.0.1':
                        if ip not in ipv4_list:
                            ipv4_list.append(ip)
                    elif family == socket.AF_INET6:
                        # 去掉 zone id（%eth0 后缀）
                        clean = ip.split('%')[0]
                        if clean not in ipv6_list:
                            ipv6_list.append(clean)
            except Exception:
                pass

            if ipv4_list or ipv6_list:
                interfaces.append({
                    'name': iface,
                    'ipv4': ipv4_list,
                    'ipv6': ipv6_list
                })

        return {'status': True, 'interfaces': interfaces}

    # 保留旧接口别名，兼容可能的外部调用
    def get_public_ip(self, args):
        """获取服务器公网 IP（旧接口，内部转发到 get_public_ips）

        返回: { status, ip }
        """
        result = self.get_public_ips(args)
        ip = result.get('ipv4') or result.get('ipv6') or ''
        return {'status': result['status'], 'ip': ip}

    def get_config(self, args):
        """读取插件配置项（供前端通用调用）

        参数 args:
          - key: 配置键名（可选，不传则返回所有配置）

        返回: { status, value }
        """
        key = args.get('key') if args else None
        try:
            value = self.__get_config(key)
            return {'status': True, 'value': value}
        except Exception as e:
            return {'status': False, 'msg': str(e)}

    def set_config(self, args):
        """写入插件配置项（供前端通用调用）

        参数 args:
          - key: 配置键名（必填）
          - value: 配置值（必填）

        返回: { status, msg }
        """
        key = args.get('key') if args else None
        value = args.get('value') if args else None
        if key is None:
            return {'status': False, 'msg': 'key 参数不能为空'}
        try:
            self.__set_config(key, value)
            return {'status': True, 'msg': '配置已保存'}
        except Exception as e:
            return {'status': False, 'msg': str(e)}

    def get_startup_info(self, args):
        """获取启动前的环境信息
        
        返回: { 
            status, 
            tavern_installed, 
            tavern_version, 
            node_version, 
            git_version,
            pm2_installed,
            pm2_version,
            st_path
        }
        """
        # 检查酒馆安装状态
        tavern_check = self.is_st_installed({})
        
        # 获取Node版本
        node_result = public.ExecShell('node -v')
        node_version = (node_result[0] or '').strip()
        
        # 获取Git版本
        git_result = public.ExecShell('git --version')
        git_version = (git_result[0] or '').strip()
        
        # 检查PM2
        pm2_check = self.is_pm2_installed({})
        
        return {
            'status': True,
            'tavern_installed': tavern_check.get('installed', False),
            'tavern_version': tavern_check.get('version', ''),
            'node_version': node_version,
            'git_version': git_version,
            'pm2_installed': pm2_check.get('installed', False),
            'pm2_version': pm2_check.get('version', ''),
            'st_path': tavern_check.get('path', '')
        }

    # ==================== SillyTavern 相关 ====================

    SILLYTAVERN_GITHUB_URL = 'https://github.com/SillyTavern/SillyTavern.git'

    def get_st_version(self, args):
        """获取 SillyTavern 版本

        从 package.json 中读取版本号。
        优先使用用户自定义路径，其次使用默认路径。

        参数 args:
          - st_path: 自定义 SillyTavern 路径（可选）
        返回: { status, version, path }
        """
        import re
        st_path = (args.get('st_path') or '').strip()
        if not st_path:
            st_path = self.__get_config('sillytavern_path') or sillyTavern_path

        pkg_file = os.path.join(st_path, 'package.json')
        if not os.path.isfile(pkg_file):
            return {'status': False, 'version': '', 'path': st_path, 'msg': 'package.json 不存在: ' + st_path}

        try:
            content = public.ReadFile(pkg_file)
            if not content:
                return {'status': False, 'version': '', 'path': st_path, 'msg': 'package.json 为空'}
            match = re.search(r'"version"\s*:\s*"([^"]+)"', content)
            if match:
                return {'status': True, 'version': match.group(1), 'path': st_path}
            return {'status': False, 'version': '', 'path': st_path, 'msg': '未在 package.json 中找到 version 字段'}
        except Exception as e:
            return {'status': False, 'version': '', 'path': st_path, 'msg': str(e)}

    def is_st_installed(self, args):
        """检测 SillyTavern 是否已安装

        判断标准：目录存在且包含 server.js 和 package.json。

        参数 args:
          - st_path: 自定义 SillyTavern 路径（可选）
        返回: { status, installed, path, version }
        """
        st_path = (args.get('st_path') or '').strip()
        if not st_path:
            st_path = self.__get_config('sillytavern_path') or sillyTavern_path

        if not os.path.isdir(st_path):
            return {'status': True, 'installed': False, 'path': st_path, 'version': ''}
        if not os.path.isfile(os.path.join(st_path, 'server.js')):
            return {'status': True, 'installed': False, 'path': st_path, 'version': '', 'msg': 'server.js 不存在'}
        if not os.path.isfile(os.path.join(st_path, 'package.json')):
            return {'status': True, 'installed': False, 'path': st_path, 'version': '', 'msg': 'package.json 不存在'}

        # 尝试读取版本
        import re
        version = ''
        try:
            pkg_file = os.path.join(st_path, 'package.json')
            content = public.ReadFile(pkg_file)
            if content:
                match = re.search(r'"version"\s*:\s*"([^"]+)"', content)
                if match:
                    version = match.group(1)
        except Exception:
            pass

        return {'status': True, 'installed': True, 'path': st_path, 'version': version}

    def install_sillytavern(self, args):
        """安装 SillyTavern（从 GitHub 克隆）

        流程：后台线程执行 git clone，输出写入日志文件，前端轮询。

        参数 args:
          - install_path: 安装路径（可选，默认 stl_path/sillyTavern）
          - branch: 分支名（可选，默认 release）
        返回: { status, msg, log_file, installing }
        """
        import subprocess
        import time

        install_path = (args.get('install_path') or '').strip()
        if not install_path:
            install_path = sillyTavern_path

        branch = (args.get('branch') or '').strip()
        if not branch:
            branch = 'release'

        # 检查目标路径是否已存在
        if os.path.isdir(install_path):
            return {'status': False, 'msg': '目标路径已存在: ' + install_path + '，如需重新安装请先删除'}

        # 确保父目录存在
        parent_dir = os.path.dirname(install_path)
        if not os.path.isdir(parent_dir):
            try:
                os.makedirs(parent_dir, 0o755)
            except Exception as e:
                return {'status': False, 'msg': '创建父目录失败: ' + str(e)}

        log_dir = os.path.join(stl_path, 'logs')
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, 0o755)

        log_file = os.path.join(log_dir, 'install_st.log')
        lock_file = log_file + '.lock'

        # 检查是否已在安装中
        if os.path.exists(lock_file):
            try:
                lock_mtime = os.path.getmtime(lock_file)
                if time.time() - lock_mtime < 600:
                    return {'status': False, 'msg': 'SillyTavern 安装正在进行中，请稍候...', 'installing': True}
                else:
                    os.remove(lock_file)
            except OSError:
                pass

        # 清空旧日志，创建锁文件
        public.WriteFile(log_file, '')
        public.WriteFile(lock_file, str(int(time.time())))

        def _write_line(msg):
            """向日志文件写入一行"""
            try:
                with open(log_file, 'a') as f:
                    f.write(msg + '\n')
                    f.flush()
            except Exception:
                pass

        def _read_stream(stream, callback):
            """逐字符读取流，遇 \\r 或 \\n 即触发回调（保留进度行）"""
            import threading
            buf = []
            try:
                while True:
                    ch = stream.read(1)
                    if not ch:
                        break
                    if ch in ('\r', '\n'):
                        line = ''.join(buf).strip()
                        if line:
                            try:
                                callback(line)
                            except Exception:
                                pass
                        buf = []
                    else:
                        buf.append(ch)
                # 刷出末尾未换行的内容
                if buf:
                    line = ''.join(buf).strip()
                    if line:
                        try:
                            callback(line)
                        except Exception:
                            pass
            except Exception as e:
                try:
                    callback('[流读取异常: ' + str(e) + ']')
                except Exception:
                    pass

        def _run_stream(cmd, cwd=None, timeout_sec=None):
            """流式执行命令，将 stdout/stderr 实时写入日志文件

            Args:
                cmd:          命令列表
                cwd:          工作目录
                timeout_sec:  超时秒数（None 表示不限时）

            Returns:
                (returncode, timed_out)
            """
            import threading as _threading

            flush_event = _threading.Event()
            timed_out_flag = [False]

            def _on_line(line):
                _write_line('  ' + line)

            try:
                proc = subprocess.Popen(
                    cmd,
                    cwd=cwd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                    env=self._get_proxy_env_dict()
                )

                t_out = _threading.Thread(target=_read_stream, args=(proc.stdout, _on_line), daemon=True)
                t_err = _threading.Thread(target=_read_stream, args=(proc.stderr, _on_line), daemon=True)
                t_out.start()
                t_err.start()

                # 看门狗
                def _watchdog():
                    if not proc_done.wait(timeout_sec):
                        timed_out_flag[0] = True
                        try:
                            proc.kill()
                        except Exception:
                            pass
                        flush_event.set()

                proc_done = _threading.Event()

                if timeout_sec is not None:
                    wd = _threading.Thread(target=_watchdog, daemon=True)
                    wd.start()

                t_out.join()
                t_err.join()
                proc.wait()
                proc_done.set()

                return proc.returncode, timed_out_flag[0]

            except FileNotFoundError as e:
                _write_line('[ERROR] 命令未找到: ' + str(e))
                return 1, False
            except Exception as e:
                _write_line('[ERROR] 执行出错: ' + str(e))
                return 1, False

        def _cleanup_partial(target_dir):
            """清理未完成的安装目录"""
            if not target_dir or not os.path.isdir(target_dir):
                return
            try:
                import shutil
                shutil.rmtree(target_dir)
                _write_line('[INFO] 已清理未完成的安装目录: ' + target_dir)
            except Exception as e:
                _write_line('[WARN] 清理安装目录失败: ' + str(e))

        def _run_install():
            try:
                _write_line('========================================')
                _write_line('[INFO] SillyTavern 安装开始')
                _write_line('[INFO] 目标路径: ' + install_path)
                _write_line('[INFO] 分支: ' + branch)
                _write_line('========================================')

                # 构建 clone 地址（可能加速代理）
                repo_url = self.SILLYTAVERN_GITHUB_URL
                proxy_config = self.__get_config('github_proxy')
                if proxy_config and isinstance(proxy_config, dict):
                    # 检查是否启用了代理
                    if proxy_config.get('enabled', False):
                        proxy_url = proxy_config.get('url', '').strip()
                        if proxy_url:
                            # 确保 URL 格式正确
                            proxy_url = proxy_url.rstrip('/')
                            repo_url = proxy_url + '/https://github.com/SillyTavern/SillyTavern.git'
                            _write_line('[INFO] 使用 GitHub 加速: ' + proxy_url)

                _write_line('[INFO] 克隆仓库: ' + repo_url)

                # git clone（流式输出，20 分钟超时）
                clone_code, clone_timeout = _run_stream(
                    ['git', 'clone', '--depth=1', '--branch', branch, '--single-branch', '--progress', '--verbose', repo_url, install_path],
                    timeout_sec=1200
                )

                if clone_timeout:
                    _write_line('')
                    _write_line('[ERROR] 克隆超时（>20 分钟），请检查网络环境是否稳定')
                    _write_line('[INFO] 可以前往设置更换 GitHub 加速地址后重试')
                    _cleanup_partial(install_path)
                    _write_line('[INFO] 已清理未完成的安装文件，请在网络恢复后重新执行安装')
                    _write_line('[FAIL] 安装失败: git clone 超时')
                    return

                if clone_code != 0:
                    _write_line('')
                    _write_line('[ERROR] git clone 失败，退出码: ' + str(clone_code))
                    _cleanup_partial(install_path)
                    _write_line('[INFO] 已清理未完成的安装目录，请检查网络环境后重试')
                    _write_line('[FAIL] 安装失败: git clone 失败')
                    return

                _write_line('')
                _write_line('[SUCCESS] SillyTavern 克隆完成')

                # 等待 IO 落盘
                import time as _time
                _write_line('[INFO] 等待文件系统同步...')
                _time.sleep(2)

                # npm install（流式输出，30 分钟超时）
                _write_line('[INFO] 开始安装 npm 依赖（可能需要几分钟）...')
                _write_line('[INFO] 执行: npm install --loglevel=silly --no-audit --no-fund --omit=dev')
                _write_line('----------------------------------------')

                npm_code, npm_timeout = _run_stream(
                    ['npm', 'install', '--loglevel=silly', '--no-audit', '--no-fund', '--omit=dev'],
                    cwd=install_path,
                    timeout_sec=1800
                )

                if npm_timeout:
                    _write_line('')
                    _write_line('[ERROR] npm install 超时（>30 分钟），请检查网络环境')
                    # 清理失败的 node_modules
                    node_modules = os.path.join(install_path, 'node_modules')
                    if os.path.isdir(node_modules):
                        try:
                            import shutil
                            shutil.rmtree(node_modules)
                            _write_line('[INFO] 已清理失败的 node_modules')
                        except Exception as e:
                            _write_line('[WARN] 清理 node_modules 失败: ' + str(e))
                    _write_line('[FAIL] 安装失败: npm install 超时')
                    return

                if npm_code != 0:
                    # npm install 失败，尝试标准安装
                    _write_line('')
                    _write_line('[WARN] npm install 失败（退出码: ' + str(npm_code) + '），尝试标准安装...')
                    _write_line('[INFO] 执行: npm install --loglevel=silly')
                    _write_line('----------------------------------------')

                    npm_code2, npm_timeout2 = _run_stream(
                        ['npm', 'install', '--loglevel=silly'],
                        cwd=install_path,
                        timeout_sec=1800
                    )

                    if npm_timeout2:
                        _write_line('')
                        _write_line('[ERROR] 标准 npm install 也超时了')
                        node_modules = os.path.join(install_path, 'node_modules')
                        if os.path.isdir(node_modules):
                            try:
                                import shutil
                                shutil.rmtree(node_modules)
                                _write_line('[INFO] 已清理失败的 node_modules')
                            except Exception:
                                pass
                        _write_line('[FAIL] 安装失败: npm install 超时')
                        return

                    if npm_code2 != 0:
                        _write_line('')
                        _write_line('[ERROR] 标准 npm install 也失败了（退出码: ' + str(npm_code2) + '）')
                        node_modules = os.path.join(install_path, 'node_modules')
                        if os.path.isdir(node_modules):
                            try:
                                import shutil
                                shutil.rmtree(node_modules)
                                _write_line('[INFO] 已清理失败的 node_modules')
                            except Exception:
                                pass
                        _write_line('[FAIL] 安装失败: npm install 失败')
                        return

                _write_line('')
                _write_line('========================================')
                _write_line('[SUCCESS] SillyTavern 安装完成!')
                _write_line('[INFO] 安装路径: ' + install_path)
                _write_line('========================================')

            except Exception as e:
                import traceback
                _write_line('[ERROR] 安装过程异常: ' + str(e))
                _write_line(traceback.format_exc())
                _cleanup_partial(install_path)
                _write_line('[FAIL] 安装过程中发生异常，已清理未完成的安装目录')
            finally:
                if os.path.exists(lock_file):
                    os.remove(lock_file)

        import threading
        t = threading.Thread(target=_run_install)
        t.daemon = True
        t.start()

        return {
            'status': True,
            'msg': 'SillyTavern 安装已启动',
            'log_file': log_file,
            'installing': True
        }

    def get_install_st_log(self, args):
        """读取 SillyTavern 安装日志（供前端轮询）

        参数 args:
          - pos: 上次读取的位置（字节偏移），不传则从头开始
        """
        log_dir = os.path.join(stl_path, 'logs')
        log_file = os.path.join(log_dir, 'install_st.log')
        lock_file = log_file + '.lock'

        if not os.path.exists(log_file):
            return {'status': True, 'log': '', 'pos': 0, 'done': True}

        pos = int(args.get('pos') or 0)
        file_size = os.path.getsize(log_file)

        if pos >= file_size:
            done = not os.path.exists(lock_file)
            return {'status': True, 'log': '', 'pos': pos, 'done': done}

        with open(log_file, 'r') as f:
            f.seek(pos)
            new_content = f.read()
            new_pos = f.tell()

        done = not os.path.exists(lock_file)
        return {'status': True, 'log': new_content, 'pos': new_pos, 'done': done}

    def get_update_st_log(self, args):
        """读取 SillyTavern 更新日志（供前端轮询）

        参数 args:
          - pos: 上次读取的位置（字节偏移），不传则从头开始
        """
        log_dir = os.path.join(stl_path, 'logs')
        log_file = os.path.join(log_dir, 'update_st.log')
        lock_file = log_file + '.lock'

        if not os.path.exists(log_file):
            return {'status': True, 'log': '', 'pos': 0, 'done': True}

        pos = int(args.get('pos') or 0)
        file_size = os.path.getsize(log_file)

        if pos >= file_size:
            done = not os.path.exists(lock_file)
            return {'status': True, 'log': '', 'pos': pos, 'done': done}

        with open(log_file, 'r') as f:
            f.seek(pos)
            new_content = f.read()
            new_pos = f.tell()

        done = not os.path.exists(lock_file)
        return {'status': True, 'log': new_content, 'pos': new_pos, 'done': done}

    def delete_sillytavern(self, args):
        """删除已安装的 SillyTavern

        会先停止 PM2 进程（如果正在运行），然后删除整个目录。

        参数 args:
          - st_path: 自定义路径（可选）
        返回: { status, msg }
        """
        st_path = (args.get('st_path') or '').strip()
        if not st_path:
            st_path = self.__get_config('sillytavern_path') or sillyTavern_path

        if not os.path.isdir(st_path):
            return {'status': False, 'msg': 'SillyTavern 目录不存在: ' + st_path}

        # 先尝试停止 PM2 进程
        public.ExecShell('pm2 delete ' + self.PM2_APP_NAME)

        try:
            import shutil
            shutil.rmtree(st_path)
            return {'status': True, 'msg': 'SillyTavern 已删除: ' + st_path}
        except Exception as e:
            return {'status': False, 'msg': '删除失败: ' + str(e)}

    def cancel_install(self, args):
        """取消安装并清理已创建的目录

        当用户手动取消安装时，清理已创建的部分文件。

        参数 args:
          - install_path: 安装路径（可选，默认 stl_path/sillyTavern）
        返回: { status, msg }
        """
        import shutil

        install_path = (args.get('install_path') or '').strip()
        if not install_path:
            install_path = sillyTavern_path

        # 检查目录是否存在
        if not os.path.isdir(install_path):
            return {'status': True, 'msg': '目录不存在，无需清理'}

        try:
            # 先尝试停止可能正在运行的 PM2 进程
            public.ExecShell('pm2 delete ' + self.PM2_APP_NAME + ' 2>/dev/null || true')

            # 删除安装目录
            shutil.rmtree(install_path, ignore_errors=True)

            # 清理锁文件
            log_dir = os.path.join(stl_path, 'logs')
            lock_file = os.path.join(log_dir, 'install_st.log.lock')
            if os.path.exists(lock_file):
                try:
                    os.remove(lock_file)
                except Exception:
                    pass

            return {'status': True, 'msg': '已清理安装目录: ' + install_path}
        except Exception as e:
            return {'status': False, 'msg': '清理失败: ' + str(e)}

    def update_sillytavern(self, args):
        """更新 SillyTavern（git pull + npm install）

        后台线程执行，日志写入 update_st.log，前端轮询。
        如果已是最新版本则跳过。

        参数 args:
          - st_path: 自定义路径（可选）
          - branch: 分支名（可选，默认 release）
        返回: { status, msg, log_file, updating }
        """
        import subprocess
        import time

        st_path = (args.get('st_path') or '').strip()
        if not st_path:
            st_path = self.__get_config('sillytavern_path') or sillyTavern_path

        if not os.path.isdir(st_path):
            return {'status': False, 'msg': 'SillyTavern 目录不存在: ' + st_path}

        branch = (args.get('branch') or '').strip()
        if not branch:
            branch = 'release'

        # 先检查是否有更新
        check_res = self.check_st_update({'st_path': st_path, 'branch': branch})
        if check_res.get('status') and check_res.get('is_latest'):
            current_version = check_res.get('local_version', '')
            return {
                'status': True,
                'msg': '已是最新版本: ' + current_version,
                'current_version': current_version,
                'new_version': current_version,
                'updating': False
            }

        current_version = check_res.get('local_version', '')

        # 准备日志
        log_dir = os.path.join(stl_path, 'logs')
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, 0o755)

        log_file = os.path.join(log_dir, 'update_st.log')
        lock_file = log_file + '.lock'

        # 检查是否已在更新中
        if os.path.exists(lock_file):
            try:
                lock_mtime = os.path.getmtime(lock_file)
                if time.time() - lock_mtime < 600:
                    return {'status': False, 'msg': 'SillyTavern 更新正在进行中，请稍候...', 'updating': True}
                else:
                    os.remove(lock_file)
            except OSError:
                pass

        # 清空旧日志，创建锁文件
        public.WriteFile(log_file, '')
        public.WriteFile(lock_file, str(int(time.time())))

        def _write_line(msg):
            try:
                with open(log_file, 'a') as f:
                    f.write(msg + '\n')
                    f.flush()
            except Exception:
                pass

        def _read_stream(stream, callback):
            buf = []
            try:
                while True:
                    ch = stream.read(1)
                    if not ch:
                        break
                    if ch in ('\r', '\n'):
                        line = ''.join(buf).strip()
                        if line:
                            try:
                                callback(line)
                            except Exception:
                                pass
                        buf = []
                    else:
                        buf.append(ch)
                if buf:
                    line = ''.join(buf).strip()
                    if line:
                        try:
                            callback(line)
                        except Exception:
                            pass
            except Exception:
                pass

        def _run_stream(cmd, cwd=None, timeout_sec=None):
            import threading as _threading
            flush_event = _threading.Event()
            timed_out_flag = [False]

            def _on_line(line):
                _write_line('  ' + line)

            try:
                proc = subprocess.Popen(
                    cmd, cwd=cwd,
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    text=True, encoding='utf-8', errors='replace',
                    env=self._get_proxy_env_dict()
                )
                t_out = _threading.Thread(target=_read_stream, args=(proc.stdout, _on_line), daemon=True)
                t_err = _threading.Thread(target=_read_stream, args=(proc.stderr, _on_line), daemon=True)
                t_out.start()
                t_err.start()

                proc_done = _threading.Event()
                def _watchdog():
                    if not proc_done.wait(timeout_sec):
                        timed_out_flag[0] = True
                        try:
                            proc.kill()
                        except Exception:
                            pass
                        flush_event.set()

                if timeout_sec is not None:
                    wd = _threading.Thread(target=_watchdog, daemon=True)
                    wd.start()

                t_out.join()
                t_err.join()
                proc.wait()
                proc_done.set()
                return proc.returncode, timed_out_flag[0]
            except Exception as e:
                _write_line('[ERROR] 执行出错: ' + str(e))
                return 1, False

        def _run_update():
            try:
                remote_count = check_res.get('remote_count', 0)
                _write_line('========================================')
                _write_line('[INFO] SillyTavern 更新开始')
                _write_line('[INFO] 当前版本: ' + current_version)
                _write_line('[INFO] 远程有 ' + str(remote_count) + ' 个新提交')
                _write_line('[INFO] 更新目录: ' + st_path)
                _write_line('[INFO] 分支: ' + branch)
                _write_line('========================================')

                # 切换到 release 分支
                _write_line('[INFO] 切换到 ' + branch + ' 分支...')
                subprocess.call(['git', 'checkout', branch], cwd=st_path,
                               stdout=open(os.devnull, 'w'), stderr=open(os.devnull, 'w'),
                               env=self._get_proxy_env_dict())

                # git fetch + git pull
                _write_line('[INFO] 正在拉取 ' + branch + ' 分支最新代码（git fetch）...')
                fetch_code, fetch_timeout = _run_stream(
                    ['git', 'fetch', 'origin', branch, '--progress'],
                    cwd=st_path,
                    timeout_sec=1200
                )

                if fetch_timeout:
                    _write_line('[ERROR] git fetch 超时（>20 分钟）')
                    _write_line('[FAIL] 更新失败: git fetch 超时')
                    return

                if fetch_code != 0:
                    _write_line('[ERROR] git fetch 失败（退出码: ' + str(fetch_code) + '）')
                    _write_line('[FAIL] 更新失败: git fetch 失败')
                    return

                _write_line('[SUCCESS] git fetch 完成')
                _write_line('[INFO] 正在执行 git pull...')

                pull_code, pull_timeout = _run_stream(
                    ['git', 'pull', 'origin', branch, '--progress'],
                    cwd=st_path,
                    timeout_sec=1200
                )

                if pull_timeout:
                    _write_line('[ERROR] git pull 超时（>20 分钟）')
                    _write_line('[FAIL] 更新失败: git pull 超时')
                    return

                if pull_code != 0:
                    _write_line('[ERROR] git pull 失败（退出码: ' + str(pull_code) + '）')
                    _write_line('[FAIL] 更新失败: git pull 失败')
                    return

                _write_line('[SUCCESS] 代码拉取完成')

                # 获取更新后版本
                import time as _time
                _time.sleep(1)
                new_ver_res = self.get_st_version({'st_path': st_path})
                new_version = new_ver_res.get('version', '') if new_ver_res.get('status') else ''

                _write_line('[INFO] 版本: ' + current_version + ' → ' + new_version)

                # 重新安装 npm 依赖
                _write_line('[INFO] 重新安装 npm 依赖...')
                _write_line('[INFO] 执行: npm install --loglevel=silly --no-audit --no-fund --omit=dev')
                _write_line('----------------------------------------')

                npm_code, npm_timeout = _run_stream(
                    ['npm', 'install', '--loglevel=silly', '--no-audit', '--no-fund', '--omit=dev'],
                    cwd=st_path,
                    timeout_sec=1800
                )

                if npm_timeout:
                    _write_line('[ERROR] npm install 超时（>30 分钟）')
                    _write_line('[FAIL] 更新失败: npm install 超时（代码已拉取，可手动执行 npm install）')
                    return

                if npm_code != 0:
                    _write_line('[WARN] npm install 失败（退出码: ' + str(npm_code) + '），尝试标准安装...')
                    npm_code2, _ = _run_stream(
                        ['npm', 'install', '--loglevel=silly'],
                        cwd=st_path,
                        timeout_sec=1800
                    )
                    if npm_code2 != 0:
                        _write_line('[WARN] 标准 npm install 也失败了')
                        _write_line('[INFO] 代码已更新成功，但依赖安装失败，请手动执行 npm install')

                _write_line('')
                _write_line('========================================')
                _write_line('[SUCCESS] SillyTavern 更新完成!')
                _write_line('[INFO] 版本: ' + current_version + ' → ' + new_version)
                _write_line('========================================')

            except Exception as e:
                import traceback
                _write_line('[ERROR] 更新过程异常: ' + str(e))
                _write_line(traceback.format_exc())
                _write_line('[FAIL] 更新过程中发生异常')
            finally:
                if os.path.exists(lock_file):
                    os.remove(lock_file)

        import threading
        t = threading.Thread(target=_run_update)
        t.daemon = True
        t.start()

        return {
            'status': True,
            'msg': 'SillyTavern 更新已启动',
            'log_file': log_file,
            'current_version': current_version,
            'updating': True
        }

    def check_st_update(self, args):
        """检查 SillyTavern 是否有新版本（不执行更新）

        通过 git fetch + git rev-parse / rev-list 比较本地和远程 commit。

        参数 args:
          - st_path: 自定义路径（可选）
          - branch: 分支名（可选，默认 release）
        返回: { status, is_latest, local_commit, remote_commit, remote_count, local_version, remote_version }
        """
        import re

        st_path = (args.get('st_path') or '').strip()
        if not st_path:
            st_path = self.__get_config('sillytavern_path') or sillyTavern_path

        branch = (args.get('branch') or '').strip()
        if not branch:
            branch = 'release'

        if not os.path.isdir(st_path):
            return {'status': False, 'is_latest': False, 'msg': 'SillyTavern 目录不存在: ' + st_path}

        # 获取本地 commit
        local_result = public.ExecShell('cd "' + st_path + '" && git rev-parse HEAD')
        local_commit = (local_result[0] or '').strip()

        # 获取远程 commit
        fetch_result = public.ExecShell('cd "' + st_path + '" && git fetch origin ' + branch)
        remote_result = public.ExecShell('cd "' + st_path + '" && git rev-parse origin/' + branch)
        remote_commit = (remote_result[0] or '').strip()

        is_latest = (local_commit and remote_commit and local_commit == remote_commit)

        # 用 rev-list --count 获取远程领先的提交数
        remote_count = 0
        if not is_latest:
            try:
                count_result = public.ExecShell('cd "' + st_path + '" && git rev-list --left-right --count HEAD...origin/' + branch)
                if count_result[0]:
                    parts = count_result[0].strip().split()
                    if len(parts) == 2:
                        remote_count = int(parts[1])
            except Exception:
                pass

        # 获取本地版本
        local_version = ''
        pkg_file = os.path.join(st_path, 'package.json')
        if os.path.isfile(pkg_file):
            try:
                content = public.ReadFile(pkg_file)
                if content:
                    match = re.search(r'"version"\s*:\s*"([^"]+)"', content)
                    if match:
                        local_version = match.group(1)
            except Exception:
                pass

        # 获取远程版本（切换到远程 commit 临时读取）
        remote_version = ''
        if remote_commit and not is_latest:
            remote_ver_result = public.ExecShell('cd "' + st_path + '" && git show origin/' + branch + ':package.json')
            if remote_ver_result[0]:
                match = re.search(r'"version"\s*:\s*"([^"]+)"', remote_ver_result[0])
                if match:
                    remote_version = match.group(1)

        return {
            'status': True,
            'is_latest': is_latest,
            'local_commit': local_commit[:8],
            'remote_commit': remote_commit[:8],
            'remote_count': remote_count,
            'local_version': local_version,
            'remote_version': remote_version
        }

    def set_st_path(self, args):
        """设置用户自定义的 SillyTavern 安装路径

        参数 args:
          - st_path: 路径（传空字符串则恢复默认路径）
        返回: { status, msg, path }
        """
        st_path = (args.get('st_path') or '').strip()

        if not st_path:
            # 恢复默认路径
            self.__set_config('sillytavern_path', '')
            return {'status': True, 'msg': '已恢复默认路径', 'path': sillyTavern_path}

        if not os.path.isdir(st_path):
            return {'status': False, 'msg': '目录不存在: ' + st_path}

        if not os.path.isfile(os.path.join(st_path, 'server.js')):
            return {'status': False, 'msg': '该目录不是有效的 SillyTavern 安装（缺少 server.js）: ' + st_path}

        self.__set_config('sillytavern_path', st_path)
        return {'status': True, 'msg': 'SillyTavern 路径已设置', 'path': st_path}

    def get_st_path(self, args):
        """获取当前 SillyTavern 路径

        返回: { status, path, is_custom }
        """
        custom_path = self.__get_config('sillytavern_path')
        if custom_path:
            return {'status': True, 'path': custom_path, 'is_custom': True}
        return {'status': True, 'path': sillyTavern_path, 'is_custom': False}

    # ==================== GitHub 加速相关 ====================

    def get_github_proxy_config(self, args):
        """获取 GitHub 加速配置

        返回: { status, enabled, url }
        """
        proxy_config = self.__get_config('github_proxy') or {}
        url = proxy_config.get('url', '').strip()

        # 兜底：URL 无效时恢复默认
        if not url or not (url.startswith('http://') or url.startswith('https://')) or len(url) < 12 or '.' not in url:
            url = 'https://ghfast.top/'

        return {
            'status': True,
            'enabled': bool(proxy_config.get('enabled', False)),
            'url': url
        }

    def save_github_proxy_config(self, args):
        """保存 GitHub 加速配置

        参数 args:
          - enabled: 是否启用（布尔）
          - url: 加速地址（字符串）
        返回: { status, msg }
        """
        enabled = bool(args.get('enabled', False))
        url = (args.get('url') or '').strip()

        # URL 合法性校验
        if url and not (url.startswith('http://') or url.startswith('https://')):
            return {'status': False, 'msg': '代理地址必须以 http:// 或 https:// 开头'}

        if url and (len(url) < 12 or '.' not in url):
            return {'status': False, 'msg': '代理地址格式不正确'}

        self.__set_config('github_proxy', {
            'enabled': enabled,
            'url': url or 'https://ghfast.top/'
        })

        return {
            'status': True,
            'msg': 'GitHub 加速配置已保存',
            'enabled': enabled,
            'url': url or 'https://ghfast.top/'
        }

    def tcping_proxies(self, args):
        """后台线程对多个加速地址执行 TCPing

        参数 args:
          - urls: 加速地址列表（逗号分隔或 JSON 数组字符串）
        返回: { status, msg, log_file }
        """
        import threading

        urls_raw = args.get('urls', '')
        # 支持逗号分隔或 JSON 数组
        if urls_raw.startswith('['):
            try:
                urls = json.loads(urls_raw)
            except:
                urls = []
        else:
            urls = [u.strip() for u in urls_raw.split(',') if u.strip()]

        if not urls:
            return {'status': False, 'msg': '没有提供加速地址'}

        log_dir = os.path.join(stl_path, 'logs')
        public.ExecShell('mkdir -p ' + log_dir)
        log_file = os.path.join(log_dir, 'tcping.log')
        lock_file = log_file + '.lock'

        # 清空旧日志
        with open(log_file, 'w') as f:
            f.write('')

        # 创建锁文件
        with open(lock_file, 'w') as f:
            f.write('')

        def _do_tcping():
            import time
            start_time = time.time()
            overall_timeout = 60  # 整体超时秒数
            try:
                for i, url in enumerate(urls):
                    url = url.strip().rstrip('/')
                    if not url:
                        continue

                    # 整体超时检查
                    if time.time() - start_time > overall_timeout:
                        with open(log_file, 'a') as f:
                            f.write('--- 整体超时（{}s），跳过剩余节点 ---\n'.format(overall_timeout))
                        break

                    # 解析域名和端口
                    parsed = url.replace('https://', '').replace('http://', '').split('/')[0]
                    if ':' in parsed:
                        host, port_str = parsed.rsplit(':', 1)
                        try:
                            port = int(port_str)
                        except:
                            port = 443
                    else:
                        host = parsed
                        port = 443

                    line = 'TCPING ({}/{}) {}: '.format(i + 1, len(urls), url)
                    try:
                        start = time.time()
                        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        sock.settimeout(5)
                        sock.connect((host, port))
                        elapsed = int((time.time() - start) * 1000)
                        sock.close()
                        line += str(elapsed) + 'ms'
                    except socket.timeout:
                        line += '超时'
                    except Exception as e:
                        line += '不可达 (' + str(e) + ')'

                    with open(log_file, 'a') as f:
                        f.write(line + '\n')
            finally:
                if os.path.exists(lock_file):
                    os.remove(lock_file)

        t = threading.Thread(target=_do_tcping)
        t.daemon = True
        t.start()

        return {'status': True, 'msg': '开始测试', 'log_file': log_file}

    def get_tcping_log(self, args):
        """读取 TCPing 日志（供前端轮询）

        参数 args:
          - pos: 上次读取的位置（字节偏移），不传则从头开始
        返回: { status, log, pos, done }
        """
        log_dir = os.path.join(stl_path, 'logs')
        log_file = os.path.join(log_dir, 'tcping.log')
        lock_file = log_file + '.lock'

        if not os.path.exists(log_file):
            return {'status': True, 'log': '', 'pos': 0, 'done': True}

        pos = int(args.get('pos') or 0)
        file_size = os.path.getsize(log_file)

        if pos >= file_size:
            done = not os.path.exists(lock_file)
            return {'status': True, 'log': '', 'pos': pos, 'done': done}

        with open(log_file, 'r') as f:
            f.seek(pos)
            new_content = f.read()
            new_pos = f.tell()

        done = not os.path.exists(lock_file)
        return {'status': True, 'log': new_content, 'pos': new_pos, 'done': done}

    # ==================== Git 相关 ====================

    def get_git_version(self, args):
        """获取系统 Git 版本（执行 git --version）"""
        try:
            result = public.ExecShell('git --version')
            version = (result[0] or '').strip()
            if version:
                return {'status': True, 'version': version}
            err = (result[1] or '').strip()
            msg = err if err else '未检测到 Git'
            return {'status': False, 'msg': msg, 'version': ''}
        except Exception as e:
            return {'status': False, 'msg': str(e), 'version': ''}

    def is_git_installed(self, args):
        """检测 Git 是否已安装（执行 git --version）"""
        try:
            result = public.ExecShell('git --version')
            output = (result[0] or '').strip()
            if output:
                return {'status': True, 'installed': True, 'version': output}
            return {'status': True, 'installed': False, 'version': ''}
        except Exception as e:
            return {'status': True, 'installed': False, 'version': '', 'msg': str(e)}

    def install_git(self, args):
        """安装 Git（执行 install_git.sh 脚本）

        流程：
        1) 检查是否已有安装进程在运行（通过日志锁文件判断）
        2) 调用 bash install_git.sh，将输出实时写入日志文件
        3) 返回日志文件路径供前端轮询
        """
        import subprocess
        import time

        log_dir = os.path.join(stl_path, 'logs')
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, 0o755)

        log_file = os.path.join(log_dir, 'install_git.log')
        lock_file = log_file + '.lock'

        # 检查是否已在安装中
        if os.path.exists(lock_file):
            try:
                lock_mtime = os.path.getmtime(lock_file)
                # 如果锁文件超过 10 分钟，视为残留
                if time.time() - lock_mtime < 600:
                    return {'status': False, 'msg': 'Git 安装正在进行中，请稍候...', 'installing': True}
                else:
                    os.remove(lock_file)
            except OSError:
                pass

        # 获取脚本路径
        script_path = os.path.join(self.__plugin_path, 'install_git.sh')
        if not os.path.exists(script_path):
            return {'status': False, 'msg': '安装脚本不存在: install_git.sh'}

        # 清空旧日志，创建锁文件
        public.WriteFile(log_file, '')
        public.WriteFile(lock_file, str(int(time.time())))

        # 后台执行安装脚本，输出写入日志文件
        def _run_install():
            try:
                with open(log_file, 'a') as f:
                    f.write('[INFO] 开始安装 Git...\n')
                    f.flush()

                    proc = subprocess.Popen(
                        ['bash', script_path],
                        stdout=f,
                        stderr=subprocess.STDOUT,
                        env=os.environ.copy()
                    )
                    proc.wait()

                    if proc.returncode == 0:
                        f.write('[SUCCESS] Git 安装完成\n')
                    else:
                        f.write('[ERROR] Git 安装失败，退出码: ' + str(proc.returncode) + '\n')
                    f.flush()
            except Exception as e:
                with open(log_file, 'a') as f:
                    f.write('[ERROR] 安装过程异常: ' + str(e) + '\n')
                    f.flush()
            finally:
                # 移除锁文件
                if os.path.exists(lock_file):
                    os.remove(lock_file)

        import threading
        t = threading.Thread(target=_run_install)
        t.daemon = True
        t.start()

        return {
            'status': True,
            'msg': 'Git 安装已启动',
            'log_file': log_file,
            'installing': True
        }

    def get_install_git_log(self, args):
        """读取 Git 安装日志（供前端轮询）

        参数 args:
          - pos: 上次读取的位置（字节偏移），不传则从头开始
        """
        import time

        log_dir = os.path.join(stl_path, 'logs')
        log_file = os.path.join(log_dir, 'install_git.log')
        lock_file = log_file + '.lock'

        if not os.path.exists(log_file):
            return {'status': True, 'log': '', 'pos': 0, 'done': True}

        # 获取上次读取位置
        pos = int(args.get('pos') or 0)
        file_size = os.path.getsize(log_file)

        if pos >= file_size:
            # 没有新内容
            done = not os.path.exists(lock_file)
            return {'status': True, 'log': '', 'pos': pos, 'done': done}

        with open(log_file, 'r') as f:
            f.seek(pos)
            new_content = f.read()
            new_pos = f.tell()

        done = not os.path.exists(lock_file)
        return {'status': True, 'log': new_content, 'pos': new_pos, 'done': done}

    # ═══════════════════════════════════════════════════════
    #  GitHub 连通性测试
    # ═══════════════════════════════════════════════════════

    def test_github_connectivity(self, args):
        """多线程测试 GitHub 各项连通性

        测试项目（参考 PC 端 test_github_multi / test_github_accelerate）：
        直连模式：直接访问 GitHub 原始 URL
        加速模式：URL 拼接加速地址 + 原始 URL（非 HTTP 代理）

        1. 文件访问 (raw.githubusercontent.com)
        2. 首页访问 (github.com)
        3. 仓库访问 (github.com - git ls-remote)
        4. API 访问 (api.github.com)

        参数 args:
          - use_proxy: 是否使用加速地址（"1"/"0"）
          - proxy_url: 加速地址（use_proxy=1 时生效）

        返回: { status: True, results: [{ key, name, success, latency, error, warning }] }
        """
        import threading
        import time
        import subprocess
        try:
            import urllib.request
            import urllib.error
        except ImportError:
            return {'status': False, 'msg': 'urllib 不可用'}

        use_proxy = args.get('use_proxy', '0') == '1'
        proxy_url = (args.get('proxy_url') or '').strip().rstrip('/')

        # 测试项目定义
        # 注意：首页 URL 用 www.github.com（和 PC 端一致）
        test_items = [
            {
                'key': 'raw',
                'name': '文件访问',
                'url': 'https://raw.githubusercontent.com/SillyTavern/SillyTavern/release/start.sh',
                'method': 'http',
                'timeout': 15
            },
            {
                'key': 'homepage',
                'name': '首页访问',
                'url': 'https://www.github.com',
                'method': 'http',
                'timeout': 15
            },
            {
                'key': 'repo',
                'name': '仓库访问',
                'url': 'https://github.com/SillyTavern/SillyTavern',
                'method': 'git',
                'timeout': 20
            },
            {
                'key': 'api',
                'name': 'API 访问',
                'url': 'https://api.github.com/repos/SillyTavern/SillyTavern/releases',
                'method': 'http',
                'timeout': 15
            },
        ]

        results = []
        lock = threading.Lock()

        def _is_accelerate_success(code, body):
            """判断加速测试的 HTTP 响应是否成功（参考 PC 端 is_accelerate_success）"""
            if 200 <= code < 300 or code in (301, 302):
                return True, None
            if code == 403:
                return True, 'HTTP 403 (加速地址可用，资源受限)'
            if code == 404:
                return True, 'HTTP 404 (加速地址可用，资源受限)'
            lower = (body or '').lower()
            if 'invalid input' in lower or '\u65e0\u6548\u8f93\u5165' in lower:
                return True, '\u52a0\u901f\u5730\u5740\u53ef\u7528\uff0c\u4f46\u8be5\u8d44\u6e90\u65e0\u6cd5\u52a0\u901f'
            return False, None

        def _http_get(url, timeout_sec, accept_header=None):
            """执行 HTTP GET 请求，返回 (code, body, elapsed_ms, error_msg)"""
            try:
                headers = {
                    'User-Agent': 'SillyTavern-launcher',
                    'Accept-Encoding': 'gzip, deflate',
                }
                if accept_header:
                    headers['Accept'] = accept_header

                req = urllib.request.Request(url, headers=headers)
                start = time.time()

                try:
                    resp = urllib.request.urlopen(req, timeout=timeout_sec)
                except urllib.error.HTTPError as e:
                    elapsed = int((time.time() - start) * 1000)
                    # 尝试读取 body（加速模式下需要 body 来判断）
                    body = ''
                    try:
                        body = e.read().decode('utf-8', errors='replace')[:1000]
                    except Exception:
                        pass
                    return e.code, body, elapsed, None

                elapsed = int((time.time() - start) * 1000)
                code = resp.getcode()

                # 读取 body（加速模式可能需要判断内容）
                body = ''
                try:
                    raw = resp.read()
                    # 处理 gzip
                    if resp.headers.get('Content-Encoding') == 'gzip':
                        import gzip
                        body = gzip.decompress(raw).decode('utf-8', errors='replace')[:1000]
                    else:
                        body = raw.decode('utf-8', errors='replace')[:1000]
                except Exception:
                    pass

                return code, body, elapsed, None
            except urllib.error.URLError as e:
                reason = str(e.reason) if hasattr(e, 'reason') else str(e)
                return 0, '', 0, reason[:200]
            except Exception as e:
                return 0, '', 0, str(e)[:200]

        def test_item(item):
            """测试单个项目的线程函数"""
            result = {
                'key': item['key'],
                'name': item['name'],
                'url': item['url'],
                'success': False,
                'latency': None,
                'error': None,
                'warning': None
            }

            start = time.time()

            if item['method'] == 'git':
                # git ls-remote 测试
                test_url = item['url']
                if use_proxy and proxy_url:
                    # 加速模式：URL 拼接，不是代理
                    test_url = proxy_url + '/' + item['url']

                try:
                    git_cmd = [
                        'git', '-c', 'credential.helper=',
                        'ls-remote', '--heads', test_url
                    ]
                    env = self._get_proxy_env_dict()
                    env['GIT_TERMINAL_PROMPT'] = '0'

                    proc = subprocess.Popen(
                        git_cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        env=env,
                        preexec_fn=os.setpgrp if hasattr(os, 'setpgrp') else None
                    )
                    try:
                        stdout, stderr = proc.communicate(timeout=item['timeout'])
                    except subprocess.TimeoutExpired:
                        proc.kill()
                        stdout, stderr = proc.communicate()

                    elapsed = int((time.time() - start) * 1000)

                    if proc.returncode == 0 and stdout and b'\t' in stdout:
                        result['success'] = True
                        result['latency'] = elapsed
                    else:
                        err = (stderr or b'').decode('utf-8', errors='replace').strip()
                        result['error'] = (err[:200] if err else 'git ls-remote \u5931\u8d25')
                except Exception as e:
                    result['error'] = str(e)[:200]
            else:
                # HTTP 请求测试
                test_url = item['url']
                if use_proxy and proxy_url:
                    # 加速模式：URL 拼接，不是代理
                    test_url = proxy_url + '/' + item['url']

                # 按 key 设置不同的 Accept 头（和 PC 端一致）
                accept = None
                if item['key'] == 'api':
                    accept = 'application/json'
                elif item['key'] == 'homepage':
                    accept = None  # 首页不加特殊 Accept，否则可能 406
                else:
                    accept = 'application/vnd.github.v3+json'

                code, body, elapsed, err_msg = _http_get(test_url, item['timeout'], accept)

                if err_msg:
                    result['error'] = err_msg
                elif use_proxy:
                    # 加速模式：用 PC 端的 is_accelerate_success 逻辑
                    success, warning = _is_accelerate_success(code, body)
                    result['success'] = success
                    if success and 200 <= code < 300:
                        result['latency'] = elapsed
                    result['warning'] = warning
                    if not success:
                        result['error'] = 'HTTP ' + str(code)
                else:
                    # 直连模式：200/301/302 算成功
                    if code in (200, 301, 302):
                        result['success'] = True
                        result['latency'] = elapsed
                    else:
                        result['error'] = 'HTTP ' + str(code)

            with lock:
                results.append(result)

        # 启动所有测试线程
        threads = []
        for item in test_items:
            t = threading.Thread(target=test_item, args=(item,))
            t.daemon = True
            threads.append(t)
            t.start()

        # 等待所有线程完成（最多等 45 秒，给 git ls-remote 足够时间）
        deadline = time.time() + 45
        for t in threads:
            remaining = max(0, deadline - time.time())
            t.join(timeout=remaining)

        # 补充超时未返回的项（线程仍在跑但已超时）
        returned_keys = set(r['key'] for r in results)
        for item in test_items:
            if item['key'] not in returned_keys:
                results.append({
                    'key': item['key'],
                    'name': item['name'],
                    'url': item['url'],
                    'success': False,
                    'latency': None,
                    'error': '\u6d4b\u8bd5\u8d85\u65f6',
                    'warning': None
                })

        # 按 key 排序保证顺序一致
        key_order = {item['key']: i for i, item in enumerate(test_items)}
        results.sort(key=lambda r: key_order.get(r['key'], 99))

        return {'status': True, 'results': results}

    # ==================== SillyTavern 实例管理 ====================

    def add_st_instance(self, args):
        """添加 SillyTavern 实例（手动添加）

        验证流程：
        1. 验证 server.js 存在
        2. 读取 package.json，验证 name 字段为 SillyTavern（大小写不敏感）
        3. 检查 git 环境完整性
        4. 如 git 损坏，自动修复
        5. 检查 node_modules，缺失则自动安装
        6. 生成唯一 ID，写入 config.json

        参数 args:
          - st_path: server.js 所在目录路径
        返回: { status, msg, instance }
        """
        import uuid
        import time
        import re

        st_path = (args.get('st_path') or '').strip()
        if not st_path:
            return {'status': False, 'msg': '路径不能为空'}

        # 规范化路径
        st_path = os.path.normpath(st_path)

        # 检查是否为默认安装位置（在线下载管理的位置）
        default_path = os.path.normpath(sillyTavern_path)
        if st_path == default_path:
            return {
                'status': False,
                'msg': '不能添加默认安装位置（' + default_path + '）。\n该位置由"在线下载"功能管理，如需使用请直接安装。'
            }

        # 1. 验证 server.js 存在
        server_js = os.path.join(st_path, 'server.js')
        if not os.path.isfile(server_js):
            return {'status': False, 'msg': '未找到 server.js 文件，请选择正确的 SillyTavern 目录'}

        # 2. 验证 package.json
        pkg_file = os.path.join(st_path, 'package.json')
        if not os.path.isfile(pkg_file):
            return {'status': False, 'msg': '未找到 package.json 文件，该目录不是有效的 SillyTavern 安装'}

        try:
            content = public.ReadFile(pkg_file)
            if not content:
                return {'status': False, 'msg': 'package.json 文件为空'}

            pkg_data = json.loads(content)
            name_field = pkg_data.get('name', '')

            # 验证 name 字段（大小写不敏感）
            if name_field.lower() != 'sillytavern':
                return {'status': False, 'msg': 'package.json 中的 name 字段不是 "SillyTavern"，当前值为: ' + name_field}

            version = pkg_data.get('version', 'unknown')
        except json.JSONDecodeError as e:
            return {'status': False, 'msg': 'package.json 格式错误: ' + str(e)}
        except Exception as e:
            return {'status': False, 'msg': '读取 package.json 失败: ' + str(e)}

        # 3. 检查并修复 git 环境
        git_check = self._check_git_environment(st_path, version)
        if not git_check['valid']:
            # 尝试修复
            repair_result = self._repair_git_environment(st_path, version)
            if not repair_result['status']:
                return {'status': False, 'msg': 'Git 环境损坏且修复失败: ' + repair_result.get('msg', '')}

        # 4. 检查并安装依赖
        deps_check = self._check_and_install_deps(st_path)
        if not deps_check['status']:
            return {'status': False, 'msg': '依赖安装失败: ' + deps_check.get('msg', '')}

        # 5. 获取分支信息
        branch = 'release'  # 默认分支
        try:
            result = public.ExecShell('cd "{}" && git rev-parse --abbrev-ref HEAD'.format(st_path))
            if result[0]:
                branch = result[0].strip()
        except Exception:
            pass

        # 6. 生成实例 ID 并保存
        instance_id = str(uuid.uuid4())[:8]
        instance = {
            'id': instance_id,
            'path': st_path,
            'name': 'SillyTavern',
            'version': version,
            'branch': branch,
            'added_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'is_default': False
        }

        # 获取现有实例列表
        instances = self.__get_config('sillytavern_instances') or []

        # 检查是否已存在相同路径的实例
        for inst in instances:
            if inst['path'] == st_path:
                return {'status': False, 'msg': '该路径已在实例列表中: ' + st_path}

        # 如果是第一个实例，设为默认
        if not instances:
            instance['is_default'] = True
            self.__set_config('sillytavern_path', st_path)

        instances.append(instance)
        self.__set_config('sillytavern_instances', instances)

        return {'status': True, 'msg': '实例添加成功', 'instance': instance}

    def remove_st_instance(self, args):
        """删除 SillyTavern 实例（仅从配置中移除，不删除物理文件）

        参数 args:
          - instance_id: 实例 ID
        返回: { status, msg }
        """
        instance_id = (args.get('instance_id') or '').strip()
        if not instance_id:
            return {'status': False, 'msg': '实例 ID 不能为空'}

        instances = self.__get_config('sillytavern_instances') or []

        # 查找并移除实例
        found = False
        new_instances = []
        removed_instance = None

        for inst in instances:
            if inst['id'] == instance_id:
                found = True
                removed_instance = inst
            else:
                new_instances.append(inst)

        if not found:
            return {'status': False, 'msg': '未找到指定的实例'}

        # 如果删除的是默认实例，将第一个剩余实例设为默认
        if removed_instance and removed_instance.get('is_default') and new_instances:
            new_instances[0]['is_default'] = True
            self.__set_config('sillytavern_path', new_instances[0]['path'])
        elif not new_instances:
            # 没有剩余实例，清空当前路径
            self.__set_config('sillytavern_path', '')

        self.__set_config('sillytavern_instances', new_instances)

        return {'status': True, 'msg': '实例已移除'}

    def switch_st_instance(self, args):
        """切换当前激活的 SillyTavern 实例

        参数 args:
          - instance_id: 实例 ID
        返回: { status, msg, path }
        """
        instance_id = (args.get('instance_id') or '').strip()
        if not instance_id:
            return {'status': False, 'msg': '实例 ID 不能为空'}

        instances = self.__get_config('sillytavern_instances') or []

        # 查找目标实例
        target = None
        for inst in instances:
            if inst['id'] == instance_id:
                target = inst
                break

        if not target:
            return {'status': False, 'msg': '未找到指定的实例'}

        # 验证路径有效性
        if not os.path.isdir(target['path']):
            return {'status': False, 'msg': '实例路径不存在: ' + target['path']}

        # 更新默认标记
        for inst in instances:
            inst['is_default'] = (inst['id'] == instance_id)

        self.__set_config('sillytavern_instances', instances)
        self.__set_config('sillytavern_path', target['path'])

        return {'status': True, 'msg': '已切换到: ' + target['path'], 'path': target['path']}

    def list_st_instances(self, args):
        """获取所有 SillyTavern 实例列表

        返回: { status, instances: [{ id, path, version, branch, added_at, is_default }] }
        """
        instances = self.__get_config('sillytavern_instances') or []

        # 验证每个实例的路径是否仍然有效
        valid_instances = []
        for inst in instances:
            if os.path.isdir(inst['path']):
                # 重新读取版本号（可能已更新）
                try:
                    pkg_file = os.path.join(inst['path'], 'package.json')
                    if os.path.isfile(pkg_file):
                        content = public.ReadFile(pkg_file)
                        if content:
                            import re
                            match = re.search(r'"version"\s*:\s*"([^"]+)"', content)
                            if match:
                                inst['version'] = match.group(1)
                except Exception:
                    pass
                valid_instances.append(inst)

        # 如果实例列表有变化，更新配置
        if len(valid_instances) != len(instances):
            self.__set_config('sillytavern_instances', valid_instances)

        return {'status': True, 'instances': valid_instances}

    def get_latest_online_version(self, args):
        """获取在线最新版本信息（带缓存）

        通过 GitHub API 获取最新 release 版本
        缓存时间：1 小时（3600 秒）
        返回: { status, version, commit_hash, date, download_url, cached }
        """
        import time as time_module

        # 缓存配置
        CACHE_KEY = 'github_api_cache'
        CACHE_TTL = 3600  # 缓存有效期 1 小时（秒）

        try:
            # 1. 尝试从缓存读取
            cache_data = self.__get_config(CACHE_KEY)
            if cache_data and isinstance(cache_data, dict):
                cached_time = cache_data.get('cached_at', 0)
                current_time = time_module.time()

                # 检查缓存是否过期
                if current_time - cached_time < CACHE_TTL:
                    # 缓存有效，直接返回
                    result = cache_data.get('data', {})
                    result['cached'] = True
                    result['cache_time'] = cached_time
                    return result

            # 2. 缓存过期或不存在，调用 GitHub API
            # 导入 Python 3 的 urllib
            try:
                import urllib.request as urllib_request
            except ImportError:
                # Python 2 兼容
                import urllib2 as urllib_request

            import ssl

            # GitHub API 地址（不能使用加速代理）
            api_url = 'https://api.github.com/repos/SillyTavern/SillyTavern/releases/latest'

            # 构建请求
            req = urllib_request.Request(api_url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            req.add_header('Accept', 'application/vnd.github.v3+json')

            # 忽略 SSL 证书验证
            context = ssl._create_unverified_context()

            # 发送请求
            response = urllib_request.urlopen(req, timeout=10, context=context)
            data = json.loads(response.read().decode('utf-8'))

            # 解析版本信息
            version = data.get('tag_name', '').replace('v', '')
            if not version:
                version = data.get('name', 'latest')

            commit_hash = data.get('target_commitish', '')
            published_at = data.get('published_at', '')

            # 格式化日期
            if published_at:
                # GitHub API 返回的格式: 2024-01-15T10:30:00Z
                date_str = published_at.replace('T', ' ').replace('Z', '')
            else:
                date_str = time.strftime('%Y-%m-%d %H:%M:%S')

            # 获取下载链接
            download_url = data.get('html_url', '')

            # 构建结果数据
            result = {
                'status': True,
                'version': version,
                'commit_hash': commit_hash,
                'date': date_str,
                'download_url': download_url,
                'description': data.get('body', '')[:200] if data.get('body') else '',
                'cached': False,
                'cache_time': time_module.time()
            }

            # 3. 保存到缓存
            cache_data = {
                'data': result,
                'cached_at': time_module.time()
            }
            self.__set_config(CACHE_KEY, cache_data)

            return result

        except Exception as e:
            error_msg = str(e)
            
            # 如果 API 调用失败，但有缓存，返回过期的缓存数据
            cache_data = self.__get_config(CACHE_KEY)
            if cache_data and isinstance(cache_data, dict):
                result = cache_data.get('data', {})
                result['cached'] = True
                result['cache_expired'] = True
                result['msg'] = '使用缓存数据（API 调用失败）'
                return result
            
            # 没有缓存，返回错误
            # 提供更友好的错误提示
            if 'HTTP Error 403' in error_msg:
                error_msg = 'GitHub API 访问受限（403），请稍后重试'
            elif 'HTTP Error 404' in error_msg:
                error_msg = '未找到版本信息（404）'
            elif 'timeout' in error_msg.lower():
                error_msg = '请求超时，请检查网络连接'
            elif 'urlopen error' in error_msg or 'network' in error_msg.lower():
                error_msg = '网络错误，无法访问 GitHub API'
            
            return {'status': False, 'msg': '获取版本信息失败: ' + error_msg}

    def _check_git_environment(self, st_path, version):
        """检查 git 环境是否完整

        返回: { valid: bool, msg: str }
        """
        git_dir = os.path.join(st_path, '.git')

        # 检查 .git 目录是否存在
        if not os.path.exists(git_dir) or not os.path.isdir(git_dir):
            return {'valid': False, 'msg': '缺少 .git 目录'}

        # 检查 .git/config 是否存在
        git_config = os.path.join(git_dir, 'config')
        if not os.path.isfile(git_config):
            return {'valid': False, 'msg': '.git/config 文件缺失'}

        # 尝试验证 git 状态
        try:
            result = public.ExecShell('cd "{}" && git status'.format(st_path))
            if result[1] and 'fatal' in result[1].lower():
                return {'valid': False, 'msg': 'Git 环境损坏: ' + result[1][:100]}
        except Exception:
            return {'valid': False, 'msg': '无法执行 git 命令'}

        return {'valid': True, 'msg': 'Git 环境正常'}

    def _repair_git_environment(self, st_path, version):
        """修复损坏的 git 环境

        流程：
        1. 备份重要数据目录
        2. 删除损坏的 .git
        3. 重新初始化 git 并拉取指定版本
        4. 恢复用户数据

        返回: { status, msg }
        """
        import shutil
        import tempfile

        try:
            # 1. 创建临时备份目录
            backup_dir = tempfile.mkdtemp(prefix='st_backup_')

            # 需要保留的用户数据目录
            data_dirs = ['data', 'public', 'config', 'User Data', 'thumbnails']
            backed_up = []

            for dir_name in data_dirs:
                src = os.path.join(st_path, dir_name)
                if os.path.exists(src):
                    dst = os.path.join(backup_dir, dir_name)
                    try:
                        shutil.copytree(src, dst)
                        backed_up.append(dir_name)
                    except Exception as e:
                        print('备份 {} 失败: {}'.format(dir_name, str(e)))

            # 2. 删除损坏的 .git 目录
            git_dir = os.path.join(st_path, '.git')
            if os.path.exists(git_dir):
                try:
                    shutil.rmtree(git_dir)
                except Exception as e:
                    # 清理备份
                    shutil.rmtree(backup_dir, ignore_errors=True)
                    return {'status': False, 'msg': '删除损坏的 .git 失败: ' + str(e)}

            # 3. 重新初始化 git 并克隆
            public.ExecShell('cd "{}" && git init'.format(st_path))
            public.ExecShell('cd "{}" && git remote add origin https://github.com/SillyTavern/SillyTavern.git'.format(st_path))

            # 获取 GitHub 代理配置
            github_proxy = self.__get_config('github_proxy') or {}
            use_proxy = github_proxy.get('enabled', False)
            proxy_url = github_proxy.get('url', 'https://ghfast.top/')

            clone_url = 'https://github.com/SillyTavern/SillyTavern.git'
            if use_proxy and proxy_url:
                # 确保代理 URL 以 / 结尾
                if not proxy_url.endswith('/'):
                    proxy_url += '/'
                clone_url = proxy_url + 'https://github.com/SillyTavern/SillyTavern.git'

            # Fetch 指定分支
            fetch_cmd = 'cd "{}" && git fetch --depth=1 origin release'.format(st_path)
            if use_proxy:
                fetch_cmd = 'GIT_SSL_NO_VERIFY=1 ' + fetch_cmd

            result = public.ExecShell(fetch_cmd)
            if result[1] and 'fatal' in result[1].lower():
                shutil.rmtree(backup_dir, ignore_errors=True)
                return {'status': False, 'msg': 'Git fetch 失败: ' + result[1][:200]}

            # Checkout 到 FETCH_HEAD
            public.ExecShell('cd "{}" && git checkout FETCH_HEAD'.format(st_path))

            # 4. 恢复用户数据
            for dir_name in backed_up:
                src = os.path.join(backup_dir, dir_name)
                dst = os.path.join(st_path, dir_name)
                try:
                    if os.path.exists(dst):
                        shutil.rmtree(dst)
                    shutil.copytree(src, dst)
                except Exception as e:
                    print('恢复 {} 失败: {}'.format(dir_name, str(e)))

            # 5. 清理备份
            shutil.rmtree(backup_dir, ignore_errors=True)

            return {'status': True, 'msg': 'Git 环境修复成功'}

        except Exception as e:
            # 确保清理备份
            try:
                shutil.rmtree(backup_dir, ignore_errors=True)
            except Exception:
                pass
            return {'status': False, 'msg': '修复过程出错: ' + str(e)}

    def _check_and_install_deps(self, st_path):
        """检查并安装依赖

        返回: { status, installed, msg }
        """
        node_modules = os.path.join(st_path, 'node_modules')

        # 如果 node_modules 存在，认为已安装
        if os.path.exists(node_modules) and os.path.isdir(node_modules):
            return {'status': True, 'installed': True, 'msg': '依赖已安装'}

        # 执行 npm install
        try:
            log_dir = os.path.join(stl_path, 'logs')
            if not os.path.exists(log_dir):
                os.makedirs(log_dir, 0o755)

            log_file = os.path.join(log_dir, 'npm_install_' + str(int(time.time())) + '.log')

            # 获取网络代理配置
            proxy_config = self.__get_config('proxy') or {}
            proxy_mode = proxy_config.get('mode', 'none')

            cmd = 'cd "{}" && npm install'.format(st_path)

            # 设置代理
            if proxy_mode == 'custom':
                host = proxy_config.get('host', '')
                port = proxy_config.get('port', '')
                if host and port:
                    proxy_str = 'http://{}:{}'.format(host, port)
                    cmd = 'NPM_CONFIG_PROXY={} NPM_CONFIG_HTTPS_PROXY={} {}'.format(proxy_str, proxy_str, cmd)
            elif proxy_mode == 'system':
                # 使用系统环境变量，无需额外设置
                pass

            # 后台执行 npm install
            with open(log_file, 'w') as f:
                proc = subprocess.Popen(
                    cmd,
                    shell=True,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    cwd=st_path
                )
                proc.wait()

            # 检查安装结果
            if os.path.exists(node_modules):
                return {'status': True, 'installed': True, 'msg': '依赖安装成功'}
            else:
                return {'status': False, 'installed': False, 'msg': '依赖安装完成但 node_modules 未生成'}

        except Exception as e:
            return {'status': False, 'installed': False, 'msg': '依赖安装失败: ' + str(e)}

    # ==================== 兼容层方法（供前端旧代码调用）====================

    def scan_versions(self, args):
        """扫描本地版本（兼容旧接口，实际调用 list_st_instances）

        返回: { status, data: [{ version, path, current }] }
        """
        result = self.list_st_instances(args)
        if not result['status']:
            return result

        # 转换数据格式以适配前端
        instances = result.get('instances', [])
        current_path = self.__get_config('sillytavern_path') or ''

        data = []
        for inst in instances:
            data.append({
                'version': inst.get('version', 'unknown'),
                'path': inst['path'],
                'current': inst['path'] == current_path,
                'id': inst.get('id', ''),
                'branch': inst.get('branch', 'release')
            })

        return {'status': True, 'data': data}

    def fetch_online_versions(self, args):
        """获取在线版本列表（兼容旧接口，只返回最新版本）

        返回: { status, data: [{ version, date, size }] }
        """
        result = self.get_latest_online_version(args)
        if not result['status']:
            return result

        # 转换为列表格式
        return {
            'status': True,
            'data': [{
                'version': result.get('version', 'latest'),
                'date': result.get('date', ''),
                'size': 'N/A'
            }]
        }

    def _get_instance_path(self, instance_id=None):
        """获取实例路径
        
        参数:
          - instance_id: 实例ID（可选，默认当前激活实例）
        
        返回: 实例路径或None
        """
        if instance_id:
            instances = self.__get_config('sillytavern_instances') or []
            target = next((i for i in instances if i['id'] == instance_id), None)
            return target['path'] if target else None
        else:
            return self.__get_config('sillytavern_path') or sillyTavern_path

    def check_tavern_installation(self, args):
        """检查酒馆安装状态并自动初始化config.yaml
        
        返回: {
            status: bool,
            installed: bool,  # 是否已安装酒馆
            config_exists: bool,  # config.yaml是否存在
            default_exists: bool,  # default/config.yaml是否存在
            auto_copied: bool,  # 是否自动复制了配置文件
            msg: str
        }
        """
        if not self._yaml_available:
            return {
                'status': False,
                'installed': False,
                'msg': 'PyYAML库未安装，请先执行: pip install pyyaml'
            }
        
        instance_id = args.get('instance_id') if args else None
        st_path = self._get_instance_path(instance_id)
        
        if not st_path or not os.path.isdir(st_path):
            return {
                'status': True,
                'installed': False,
                'config_exists': False,
                'default_exists': False,
                'auto_copied': False,
                'msg': 'SillyTavern未安装，请前往版本管理页面安装'
            }
        
        config_file = os.path.join(st_path, 'config.yaml')
        default_config = os.path.join(st_path, 'default', 'config.yaml')
        
        config_exists = os.path.isfile(config_file)
        default_exists = os.path.isfile(default_config)
        
        auto_copied = False
        
        # 如果根目录没有config.yaml但default下有，自动复制并修改为服务端配置
        if not config_exists and default_exists:
            try:
                import shutil
                import yaml
                
                # 复制默认配置文件
                shutil.copy2(default_config, config_file)
                
                # 读取配置文件
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = yaml.safe_load(f)
                
                if not isinstance(config, dict):
                    config = {}
                
                # 修改为服务端适用的配置
                config['listen'] = True  # 监听所有接口
                config['protocol'] = {
                    'ipv4': True,   # 启用IPv4
                    'ipv6': True    # 启用IPv6
                }
                config['dnsPreferIPv6'] = False  # DNS偏好保持默认（优先IPv4）
                
                # 关闭浏览器自动启动（服务器端无意义）
                if 'browserLaunch' not in config:
                    config['browserLaunch'] = {}
                config['browserLaunch']['enabled'] = False
                
                # 写回配置文件
                yaml_content = yaml.dump(
                    config,
                    default_flow_style=False,
                    allow_unicode=True,
                    sort_keys=False
                )
                
                with open(config_file, 'w', encoding='utf-8') as f:
                    f.write(yaml_content)
                
                auto_copied = True
                config_exists = True
                public.WriteLog('STL', '自动复制并初始化config.yaml为服务端配置')
            except Exception as e:
                return {
                    'status': False,
                    'installed': True,
                    'config_exists': False,
                    'default_exists': default_exists,
                    'auto_copied': False,
                    'msg': '自动复制配置文件失败: ' + str(e)
                }
        
        return {
            'status': True,
            'installed': True,
            'config_exists': config_exists,
            'default_exists': default_exists,
            'auto_copied': auto_copied,
            'msg': '配置已就绪' if config_exists else '未找到配置文件'
        }

    def get_tavern_config(self, args):
        """获取酒馆配置文件（config.yaml）
        
        参数 args:
          - instance_id: 实例ID（可选，默认当前激活实例）
        
        返回: {
            status: bool,
            config: dict,  # 解析后的配置对象
            file_path: str,  # 配置文件路径
            msg: str  # 错误信息（如有）
        }
        """
        if not self._yaml_available:
            return {
                'status': False,
                'msg': 'PyYAML库未安装，请先执行: pip install pyyaml'
            }
        
        import yaml
        
        instance_id = args.get('instance_id') if args else None
        st_path = self._get_instance_path(instance_id)
        
        if not st_path or not os.path.isdir(st_path):
            return {
                'status': False,
                'msg': 'SillyTavern未安装'
            }
        
        config_file = os.path.join(st_path, 'config.yaml')
        
        if not os.path.isfile(config_file):
            # 尝试自动初始化
            init_result = self.check_tavern_installation(args)
            if not init_result['status'] or not init_result['config_exists']:
                return {
                    'status': False,
                    'msg': init_result.get('msg', '配置文件不存在')
                }
        
        try:
            content = public.ReadFile(config_file)
            if not content:
                return {
                    'status': False,
                    'msg': '读取配置文件失败'
                }
            
            # 使用safe_load确保安全性
            config = yaml.safe_load(content)
            if not isinstance(config, dict):
                config = {}
            
            # 获取文件修改时间（用于缓存验证）
            file_mtime = os.path.getmtime(config_file)
            
            return {
                'status': True,
                'config': config,
                'file_path': config_file,
                'file_mtime': file_mtime,
                'msg': '配置加载成功'
            }
        except Exception as e:
            public.WriteLog('STL', '读取YAML配置失败: ' + str(e))
            return {
                'status': False,
                'msg': '解析配置文件失败: ' + str(e)
            }

    def update_tavern_config(self, args):
        """更新酒馆配置文件
        
        参数 args:
          - config: JSON字符串形式的配置数据
          - instance_id: 实例ID（可选）
        
        返回: {
            status: bool,
            msg: str
        }
        """
        if not self._yaml_available:
            return {
                'status': False,
                'msg': 'PyYAML库未安装，请先执行: pip install pyyaml'
            }
        
        import yaml
        import json
        
        instance_id = args.get('instance_id') if args else None
        st_path = self._get_instance_path(instance_id)
        
        if not st_path or not os.path.isdir(st_path):
            return {
                'status': False,
                'msg': 'SillyTavern未安装'
            }
        
        config_file = os.path.join(st_path, 'config.yaml')
        
        if not os.path.isfile(config_file):
            return {
                'status': False,
                'msg': '配置文件不存在'
            }
        
        try:
            # 解析JSON配置数据
            config_str = args.get('config')
            if isinstance(config_str, str):
                config_data = json.loads(config_str)
            else:
                config_data = config_str
            
            if not isinstance(config_data, dict):
                return {
                    'status': False,
                    'msg': '配置数据格式无效'
                }
            
            # 序列化为YAML格式
            yaml_content = yaml.dump(
                config_data,
                default_flow_style=False,
                allow_unicode=True,
                sort_keys=False  # 保持键的顺序
            )
            
            # 写入文件
            public.WriteFile(config_file, yaml_content)
            
            public.WriteLog('STL', '酒馆配置已更新')
            
            return {
                'status': True,
                'msg': '配置已保存'
            }
        except json.JSONDecodeError as e:
            return {
                'status': False,
                'msg': '配置数据解析失败: ' + str(e)
            }
        except Exception as e:
            public.WriteLog('STL', '写入YAML配置失败: ' + str(e))
            return {
                'status': False,
                'msg': '保存配置文件失败: ' + str(e)
            }

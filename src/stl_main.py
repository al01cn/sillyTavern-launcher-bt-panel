#!/usr/bin/python
# coding: utf-8
# +-------------------------------------------------------------------
# | 宝塔Linux面板
# +-------------------------------------------------------------------
# | Copyright (c) 2015-2099 宝塔软件(http://bt.cn) All rights reserved.
# +-------------------------------------------------------------------

import sys
import os
import json
import socket

# 设置运行目录
os.chdir("/www/server/panel")

stl_path = os.path.join("/www/server", "stl") # 插件数据根目录

sillyTavern_path = os.path.join(stl_path, "sillyTavern") # 酒馆存放位置

config_file = os.path.join(sillyTavern_path, "config.json") # 插件配置文件

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

    def __init__(self):
        pass

    # 读取配置项(插件自身的配置文件)
    # @param key   取指定配置项，若不传则取所有配置 [可选]
    # @param force 强制从文件重新读取配置项 [可选]
    def __get_config(self, key=None, force=False):
        if not self.__config or force:
            if not os.path.exists(config_file):
                return None
            f_body = public.ReadFile(config_file)
            if not f_body:
                return None
            self.__config = json.loads(f_body)

        if key:
            if key in self.__config:
                return self.__config[key]
            return None
        return self.__config

    # 设置配置项(插件自身的配置文件)
    # @param key   要被修改或添加的配置项 [可选]
    # @param value 配置值 [可选]
    def __set_config(self, key=None, value=None):
        if not self.__config:
            self.__config = {}

        if key:
            self.__config[key] = value

        public.WriteFile(config_file, json.dumps(self.__config))
        return True

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

        # 检查是否已在运行
        check = public.ExecShell('pm2 jlist')
        try:
            import json as _json
            processes = _json.loads(check[0]) if check[0] else []
            for proc in processes:
                if proc.get('name') == self.PM2_APP_NAME:
                    return {'status': True, 'msg': 'SillyTavern 已在运行中（PID: ' + str(proc.get('pid', '')) + '）'}
        except Exception:
            pass

        cmd = 'pm2 start server.js --name ' + self.PM2_APP_NAME + ' --cwd "' + app_dir + '"'
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
          - app_dir: SillyTavern 项目目录（可选，重启时不影响 cwd）
        返回: { status, msg }
        """
        # 先检查进程是否存在
        check = public.ExecShell('pm2 jlist')
        try:
            import json as _json
            processes = _json.loads(check[0]) if check[0] else []
            found = False
            for proc in processes:
                if proc.get('name') == self.PM2_APP_NAME:
                    found = True
                    break
            if not found:
                # 进程不存在，尝试启动
                return self.pm2_start(args)
        except Exception:
            pass

        cmd = 'pm2 restart ' + self.PM2_APP_NAME
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

    def pm2_logs(self, args):
        """获取 PM2 管理的 SillyTavern 最近日志

        参数 args:
          - lines: 行数，默认 200
          - type: 'out' | 'err' | 'all'，默认 'all'
        返回: { status, logs, type }
        """
        import json as _json
        lines = int(args.get('lines') or 200)
        log_type = (args.get('type') or 'all').strip()

        # 检查进程是否存在
        check = public.ExecShell('pm2 jlist')
        try:
            processes = _json.loads(check[0]) if check[0] else []
            found = False
            for proc in processes:
                if proc.get('name') == self.PM2_APP_NAME:
                    found = True
                    break
            if not found:
                return {'status': False, 'msg': 'PM2 中未找到 SillyTavern 进程', 'logs': '', 'type': log_type}
        except Exception:
            pass

        if log_type == 'err':
            cmd = 'pm2 logs ' + self.PM2_APP_NAME + ' --err --nostream --lines ' + str(lines)
        elif log_type == 'out':
            cmd = 'pm2 logs ' + self.PM2_APP_NAME + ' --out --nostream --lines ' + str(lines)
        else:
            cmd = 'pm2 logs ' + self.PM2_APP_NAME + ' --nostream --lines ' + str(lines)

        result = public.ExecShell(cmd)
        logs = (result[0] or '').strip()
        return {'status': True, 'logs': logs, 'type': log_type}

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

    # ==================== SillyTavern 相关 ====================

    SILLYTAVERN_GITHUB_URL = 'https://ghfast.top/https://github.com/SillyTavern/SillyTavern.git'

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
                    env=os.environ.copy()
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
                proxy_url = self.__get_config('github_proxy')
                if proxy_url:
                    repo_url = proxy_url.rstrip('/') + '/SillyTavern/SillyTavern.git'
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
                    env=os.environ.copy()
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
                               stdout=open(os.devnull, 'w'), stderr=open(os.devnull, 'w'))

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

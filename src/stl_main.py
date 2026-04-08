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

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

/**
 * Git 管理模块
 * 自行管理 Git 安装，不依赖宝塔插件。
 * 通过本插件 Python 后端执行 shell 命令实现。
 */

var Git = (function () {
    "use strict";

    // 轮询相关配置
    var POLL_INTERVAL = 800;     // 日志轮询间隔（毫秒）
    var POLL_TIMEOUT  = 600000;  // 安装超时时间（10 分钟）
    var _pollTimer = null;       // 轮询定时器
    var _pollStart = null;       // 轮询开始时间

    // ======== 公开方法 ========

    /**
     * 1. 获取系统 Git 版本
     *    通过本插件 Python 后端执行 git --version 获取。
     *
     * @param {function} callback 回调 function(rdata)  { status, version }
     *   version 形如 "git version 2.39.3"，失败时为空字符串
     */
    function getGitVersion(callback) {
        request_plugin('get_git_version', {}, function (rdata) {
            if (callback) callback(rdata || { status: false, version: '' });
        }, function () {
            if (callback) callback({ status: false, version: '', msg: '请求后端失败' });
        });
    }

    /**
     * 2. 检测 Git 是否已安装
     *    通过本插件 Python 后端执行 git --version 检测。
     *
     * @param {function} callback 回调 function(rdata)  { status, installed, version }
     *   installed: true/false
     *   version: Git 版本字符串（已安装时）
     */
    function isGitInstall(callback) {
        request_plugin('is_git_installed', {}, function (rdata) {
            if (callback) callback(rdata || { status: false, installed: false, version: '' });
        }, function () {
            if (callback) callback({ status: false, installed: false, version: '', msg: '请求后端失败' });
        });
    }

    /**
     * 3. 智能安装 Git
     *    先检测是否已安装，已安装直接返回，否则执行安装脚本。
     *    安装过程中通过 onLog 回调实时输出日志，支持日志弹窗显示。
     *
     * @param {function} callback 回调 function(rdata)  { status, msg, version }
     * @param {function} onLog    日志回调 function(logText)  安装过程的实时输出
     * @param {function} onProgress 进度回调 function(msg)  当前阶段提示（可选）
     */
    function autoInstallGit(callback, onLog, onProgress) {
        _report(onProgress, '正在检测 Git 安装状态...');

        isGitInstall(function (rdata) {
            if (rdata.status && rdata.installed) {
                _report(onProgress, 'Git 已安装（' + (rdata.version || '') + '），跳过安装');
                if (callback) callback({ status: true, msg: 'Git 已安装', version: rdata.version });
                return;
            }

            // Git 未安装，执行安装
            _report(onProgress, 'Git 未安装，正在启动安装...');
            _startInstall(callback, onLog, onProgress);
        });
    }

    /**
     * 强制安装 Git（跳过已安装检测）
     *
     * @param {function} callback   回调 function(rdata)
     * @param {function} onLog      日志回调
     * @param {function} onProgress 进度回调（可选）
     */
    function forceInstallGit(callback, onLog, onProgress) {
        _report(onProgress, '正在启动 Git 安装...');
        _startInstall(callback, onLog, onProgress);
    }

    /**
     * 停止安装日志轮询
     */
    function stopInstallPolling() {
        if (_pollTimer) {
            clearInterval(_pollTimer);
            _pollTimer = null;
        }
        _pollStart = null;
    }

    // ======== 内部方法 ========

    /**
     * 启动安装流程：调后端启动脚本 → 轮询日志
     */
    function _startInstall(callback, onLog, onProgress) {
        // 先停止之前的轮询
        stopInstallPolling();

        request_plugin('install_git', {}, function (rdata) {
            if (!rdata || rdata.status !== true) {
                var msg = (rdata && rdata.msg) ? rdata.msg : '启动 Git 安装失败';
                _report(onProgress, msg);
                if (onLog) onLog('[ERROR] ' + msg + '\n');
                if (callback) callback({ status: false, msg: msg });
                return;
            }

            if (rdata.installing) {
                _report(onProgress, 'Git 安装已启动，正在等待日志...');
                if (onLog) onLog('[INFO] Git 安装已启动...\n');
                // 开始轮询日志
                _pollLog(0, callback, onLog, onProgress);
            } else {
                // 意外情况：没有开始安装
                if (callback) callback({ status: true, msg: rdata.msg || 'Git 安装完成' });
            }
        }, function () {
            _report(onProgress, '请求安装接口失败');
            if (onLog) onLog('[ERROR] 请求安装接口失败\n');
            if (callback) callback({ status: false, msg: '请求安装接口失败' });
        });
    }

    /**
     * 轮询安装日志
     */
    function _pollLog(pos, callback, onLog, onProgress) {
        if (!_pollStart) _pollStart = Date.now();

        // 超时检测
        if (Date.now() - _pollStart > POLL_TIMEOUT) {
            stopInstallPolling();
            var timeoutMsg = 'Git 安装超时（' + (POLL_TIMEOUT / 1000) + '秒），请检查日志或手动安装';
            _report(onProgress, timeoutMsg);
            if (onLog) onLog('[WARN] ' + timeoutMsg + '\n');
            if (callback) callback({ status: false, msg: timeoutMsg });
            return;
        }

        request_plugin('get_install_git_log', { pos: pos }, function (rdata) {
            if (!rdata || rdata.status !== true) {
                // 读取日志失败，继续轮询
                _pollTimer = setTimeout(function () {
                    _pollLog(pos, callback, onLog, onProgress);
                }, POLL_INTERVAL);
                return;
            }

            // 输出新日志
            if (rdata.log && onLog) {
                onLog(rdata.log);
            }

            if (rdata.done) {
                // 安装完成
                stopInstallPolling();

                // 验证安装结果
                _report(onProgress, '安装脚本执行完毕，正在验证...');
                getGitVersion(function (verRes) {
                    if (verRes.status && verRes.version) {
                        _report(onProgress, 'Git 安装成功: ' + verRes.version);
                        if (onLog) onLog('[SUCCESS] Git 安装成功: ' + verRes.version + '\n');
                        if (callback) callback({ status: true, msg: 'Git 安装成功', version: verRes.version });
                    } else {
                        _report(onProgress, '安装脚本已执行，但 Git 验证失败');
                        if (onLog) onLog('[ERROR] 安装脚本已执行，但 Git 验证失败\n');
                        if (callback) callback({ status: false, msg: '安装脚本已执行，但 Git 验证失败，请检查日志' });
                    }
                });
            } else {
                // 继续轮询
                _pollTimer = setTimeout(function () {
                    _pollLog(rdata.pos || pos, callback, onLog, onProgress);
                }, POLL_INTERVAL);
            }
        }, function () {
            // 请求失败，继续轮询
            _pollTimer = setTimeout(function () {
                _pollLog(pos, callback, onLog, onProgress);
            }, POLL_INTERVAL);
        });
    }

    /**
     * 安全触发回调
     */
    function _report(onProgress, data) {
        if (typeof onProgress === 'function') {
            onProgress(data);
        }
    }

    // ======== 公开接口 ========
    return {
        getGitVersion: getGitVersion,
        isGitInstall: isGitInstall,
        autoInstallGit: autoInstallGit,
        forceInstallGit: forceInstallGit,
        stopInstallPolling: stopInstallPolling
    };
})();

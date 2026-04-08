/**
 * PM2 管理模块
 * 使用 PM2 管理 SillyTavern 的后台运行。
 * PM2 安装通过本插件 Python 后端执行 npm install -g pm2。
 * 启动/停止/日志通过本插件 Python 后端执行 pm2 命令。
 */

var Pm2 = (function () {
    "use strict";

    /**
     * PM2 进程唯一标识（不可改写）
     * 用于 pm2 start --name、pm2 stop、pm2 logs 等操作
     */
    var APP_NAME = 'stl_sillytavern';

    // ======== 公开方法 ========

    /**
     * 1. 获取系统 PM2 版本
     *    通过本插件 Python 后端执行 pm2 --version 获取。
     *
     * @param {function} callback 回调 function(rdata)  { status, version }
     *   version 形如 "5.3.0"，失败时为空字符串
     */
    function getPm2Version(callback) {
        request_plugin('is_pm2_installed', {}, function (rdata) {
            if (rdata && rdata.installed && rdata.version) {
                if (callback) callback({ status: true, version: rdata.version });
            } else {
                if (callback) callback({ status: false, version: '', msg: rdata.msg || 'PM2 未安装' });
            }
        }, function () {
            if (callback) callback({ status: false, version: '', msg: '请求后端失败' });
        });
    }

    /**
     * 2. 检测 PM2 是否已安装
     *    通过本插件 Python 后端执行 pm2 --version 检测。
     *
     * @param {function} callback 回调 function(rdata)  { status, installed, version }
     *   installed: true/false
     *   version: PM2 版本字符串（已安装时）
     */
    function isPm2Installed(callback) {
        request_plugin('is_pm2_installed', {}, function (rdata) {
            if (callback) callback(rdata || { status: false, installed: false, version: '' });
        }, function () {
            if (callback) callback({ status: false, installed: false, version: '', msg: '请求后端失败' });
        });
    }

    /**
     * 3. 智能安装 PM2
     *    先检测是否已安装，已安装直接返回，否则通过本插件后端执行 npm install -g pm2。
     *
     * @param {function} callback   回调 function(rdata)  { status, msg, version }
     * @param {function} onLog      日志回调 function(logText)  安装过程的实时输出（可选）
     * @param {function} onProgress 进度回调 function(msg)     当前阶段提示（可选）
     */
    function autoInstallPm2(callback, onLog, onProgress) {
        _report(onProgress, '正在检测 PM2 安装状态...');

        isPm2Installed(function (rdata) {
            if (rdata.status && rdata.installed) {
                _report(onProgress, 'PM2 已安装（' + (rdata.version || '') + '），跳过安装');
                if (callback) callback({ status: true, msg: 'PM2 已安装', version: rdata.version });
                return;
            }

            // PM2 未安装，执行安装
            _report(onProgress, 'PM2 未安装，正在安装...');
            if (onLog) onLog('[INFO] 正在执行 npm install -g pm2 ...\n');

            request_plugin('install_pm2', {}, function (rdata) {
                if (rdata && rdata.status) {
                    _report(onProgress, rdata.msg || 'PM2 安装成功');
                    if (onLog) onLog('[SUCCESS] ' + (rdata.msg || 'PM2 安装成功') + '\n');
                    // 安装完成后验证
                    isPm2Installed(function (verify) {
                        if (callback) callback({
                            status: true,
                            msg: verify.version ? ('PM2 安装成功: ' + verify.version) : 'PM2 安装成功',
                            version: verify.version || ''
                        });
                    });
                } else {
                    var msg = (rdata && rdata.msg) ? rdata.msg : 'PM2 安装失败';
                    _report(onProgress, msg);
                    if (onLog) onLog('[ERROR] ' + msg + '\n');
                    if (callback) callback({ status: false, msg: msg });
                }
            }, function () {
                var msg = '请求安装接口失败';
                _report(onProgress, msg);
                if (onLog) onLog('[ERROR] ' + msg + '\n');
                if (callback) callback({ status: false, msg: msg });
            });
        });
    }

    /**
     * 4. 创建 SillyTavern PM2 后台启动实例
     *    使用 PM2 启动 SillyTavern（pm2 start server.js --name stl_sillytavern）。
     *    如果已在运行，返回提示。
     *
     * @param {function} callback 回调 function(rdata)  { status, msg }
     * @param {string}   appDir   SillyTavern 目录路径（可选，不传使用后端默认路径）
     */
    function createInstance(callback, appDir) {
        var params = {};
        if (appDir) params.app_dir = appDir;

        request_plugin('pm2_start', params, function (rdata) {
            if (callback) callback(rdata || { status: false, msg: '请求失败' });
        }, function () {
            if (callback) callback({ status: false, msg: '请求后端失败' });
        });
    }

    /**
     * 5. 使用 PM2 后台运行 SillyTavern
     *    等同于 createInstance，提供更语义化的调用名。
     *
     * @param {function} callback 回调 function(rdata)  { status, msg }
     * @param {string}   appDir   SillyTavern 目录路径（可选）
     */
    function start(callback, appDir) {
        createInstance(callback, appDir);
    }

    /**
     * 6. 停止 PM2 后台运行的 SillyTavern（pm2 stop，进程仍在列表中，可 restart）
     *
     * @param {function} callback 回调 function(rdata)  { status, msg }
     */
    function stop(callback) {
        request_plugin('pm2_stop', {}, function (rdata) {
            if (callback) callback(rdata || { status: false, msg: '请求失败' });
        }, function () {
            if (callback) callback({ status: false, msg: '请求后端失败' });
        });
    }

    /**
     * 9. 重启 PM2 管理的 SillyTavern（pm2 restart）
     *    如果进程不存在，自动执行启动。
     *
     * @param {function} callback 回调 function(rdata)  { status, msg }
     * @param {string}   appDir   SillyTavern 目录路径（可选，仅进程不存在时启动用）
     */
    function restart(callback, appDir) {
        var params = {};
        if (appDir) params.app_dir = appDir;

        request_plugin('pm2_restart', params, function (rdata) {
            if (callback) callback(rdata || { status: false, msg: '请求失败' });
        }, function () {
            if (callback) callback({ status: false, msg: '请求后端失败' });
        });
    }

    /**
     * 10. 强制停止并从 PM2 中移除 SillyTavern（pm2 delete）
     *     不同于 stop（仅暂停），此方法会彻底从 PM2 进程列表中移除。
     *     需要重新使用 start() 才能再次启动。
     *
     * @param {function} callback 回调 function(rdata)  { status, msg }
     */
    function forceStop(callback) {
        request_plugin('pm2_force_stop', {}, function (rdata) {
            if (callback) callback(rdata || { status: false, msg: '请求失败' });
        }, function () {
            if (callback) callback({ status: false, msg: '请求后端失败' });
        });
    }

    /**
     * 7. 获取 PM2 后台运行 SillyTavern 的日志
     *
     * @param {function} callback 回调 function(rdata)  { status, logs, type }
     *   logs: 日志文本
     *   type: 'out' | 'err' | 'all'
     * @param {number} lines 行数，默认 200
     * @param {string} type  日志类型 'out' | 'err' | 'all'，默认 'all'
     */
    function getLogs(callback, lines, type) {
        var params = {
            lines: lines || 200,
            type: type || 'all'
        };
        request_plugin('pm2_logs', params, function (rdata) {
            if (callback) callback(rdata || { status: false, logs: '', type: params.type });
        }, function () {
            if (callback) callback({ status: false, logs: '', type: params.type, msg: '请求后端失败' });
        });
    }

    /**
     * 8. 获取 SillyTavern 在 PM2 中的运行状态
     *
     * @param {function} callback 回调 function(rdata)  { status, running, info }
     *   running: true/false
     *   info: { pid, uptime, cpu, memory, restarts, status_text }
     */
    function getStatus(callback) {
        request_plugin('pm2_status', {}, function (rdata) {
            if (callback) callback(rdata || { status: false, running: false, info: null });
        }, function () {
            if (callback) callback({ status: false, running: false, info: null, msg: '请求后端失败' });
        });
    }

    // ======== 辅助函数 ========

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
        // 常量（只读）
        APP_NAME: APP_NAME,

        // 方法
        getPm2Version: getPm2Version,
        isPm2Installed: isPm2Installed,
        autoInstallPm2: autoInstallPm2,
        createInstance: createInstance,
        start: start,
        stop: stop,
        restart: restart,
        forceStop: forceStop,
        getLogs: getLogs,
        getStatus: getStatus
    };
})();

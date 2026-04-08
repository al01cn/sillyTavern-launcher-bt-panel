/**
 * SillyTavern 管理模块
 * 管理 SillyTavern 的安装、版本检测、更新、删除等操作。
 * 通过本插件 Python 后端执行 git/npm 命令实现。
 */

var SillyTavern = (function () {
    "use strict";

    // 默认 GitHub 仓库地址
    var GITHUB_URL = 'https://ghfast.top/https://github.com/SillyTavern/SillyTavern.git';

    // 轮询相关配置
    var POLL_INTERVAL = 800;      // 日志轮询间隔（毫秒）
    var POLL_TIMEOUT_INSTALL = 2100000;  // 安装超时时间（35 分钟，与后端 20+30 分钟一致）
    var POLL_TIMEOUT_UPDATE = 2100000;   // 更新超时时间（35 分钟）
    var _pollTimer = null;       // 轮询定时器
    var _pollStart = null;       // 轮询开始时间
    var _pollLogApi = null;      // 当前轮询的日志 API（install/update）

    // ======== 公开方法 ========

    /**
     * 1. 获取 SillyTavern 版本
     *    从 package.json 中读取版本号。
     *
     * @param {function} callback 回调 function(rdata)  { status, version, path }
     *   version 形如 "1.12.5"，失败时为空字符串
     * @param {string}   stPath   自定义路径（可选）
     */
    function getSillyTavernVersion(callback, stPath) {
        var params = {};
        if (stPath) params.st_path = stPath;

        request_plugin('get_st_version', params, function (rdata) {
            if (callback) callback(rdata || { status: false, version: '', path: '', msg: '请求失败' });
        }, function () {
            if (callback) callback({ status: false, version: '', path: '', msg: '请求后端失败' });
        });
    }

    /**
     * 2. 检测 SillyTavern 是否已安装
     *    判断标准：目录存在且包含 server.js 和 package.json。
     *
     * @param {function} callback 回调 function(rdata)  { status, installed, path, version }
     *   installed: true/false
     * @param {string}   stPath   自定义路径（可选）
     */
    function isSillyTavernInstall(callback, stPath) {
        var params = {};
        if (stPath) params.st_path = stPath;

        request_plugin('is_st_installed', params, function (rdata) {
            if (callback) callback(rdata || { status: false, installed: false, path: '', version: '' });
        }, function () {
            if (callback) callback({ status: false, installed: false, path: '', version: '', msg: '请求后端失败' });
        });
    }

    /**
     * 3. 智能安装 SillyTavern
     *    先检测是否已安装，已安装直接返回，否则从 GitHub 克隆 + npm install。
     *    安装过程中通过 onLog 回调实时输出日志。
     *
     * @param {function} callback    回调 function(rdata)  { status, msg, version }
     * @param {function} onLog       日志回调 function(logText)  安装过程的实时输出（可选）
     * @param {function} onProgress  进度回调 function(msg)     当前阶段提示（可选）
     * @param {string}   installPath 安装路径（可选，不传使用后端默认路径）
     * @param {string}   branch      分支名（可选，默认 release）
     */
    function autoInstallSillyTavern(callback, onLog, onProgress, installPath, branch) {
        _report(onProgress, '正在检测 SillyTavern 安装状态...');

        isSillyTavernInstall(function (rdata) {
            if (rdata.status && rdata.installed) {
                _report(onProgress, 'SillyTavern 已安装（v' + (rdata.version || '') + '），路径: ' + (rdata.path || ''));
                if (callback) callback({ status: true, msg: 'SillyTavern 已安装', version: rdata.version, path: rdata.path });
                return;
            }

            // 未安装，执行安装
            _report(onProgress, 'SillyTavern 未安装，正在启动安装...');
            _startInstall(callback, onLog, onProgress, installPath, branch);
        }, installPath);
    }

    /**
     * 4. 设置本地已安装的酒馆路径
     *    设置后会持久化到配置文件，后续所有操作使用该路径。
     *    传空字符串恢复默认路径。
     *
     * @param {string}   stPath   酒馆安装路径（传空字符串恢复默认）
     * @param {function} callback 回调 function(rdata)  { status, msg, path }
     */
    function setStPath(stPath, callback) {
        request_plugin('set_st_path', { st_path: stPath || '' }, function (rdata) {
            if (callback) callback(rdata || { status: false, msg: '请求失败' });
        }, function () {
            if (callback) callback({ status: false, msg: '请求后端失败' });
        });
    }

    /**
     * 4.1 获取当前酒馆路径
     *
     * @param {function} callback 回调 function(rdata)  { status, path, is_custom }
     */
    function getStPath(callback) {
        request_plugin('get_st_path', {}, function (rdata) {
            if (callback) callback(rdata || { status: false, path: '', is_custom: false });
        }, function () {
            if (callback) callback({ status: false, path: '', is_custom: false, msg: '请求后端失败' });
        });
    }

    /**
     * 5. 删除已安装的 SillyTavern
     *    会先停止 PM2 进程（如果正在运行），然后删除整个目录。
     *
     * @param {function} callback 回调 function(rdata)  { status, msg }
     * @param {string}   stPath   自定义路径（可选）
     */
    function deleteSillyTavern(callback, stPath) {
        var params = {};
        if (stPath) params.st_path = stPath;

        request_plugin('delete_sillytavern', params, function (rdata) {
            if (callback) callback(rdata || { status: false, msg: '请求失败' });
        }, function () {
            if (callback) callback({ status: false, msg: '请求后端失败' });
        });
    }

    /**
     * 6. 更新 SillyTavern（git pull + npm install）
     *    从远程仓库拉取最新代码并重新安装依赖。
     *    更新过程通过 onLog 回调实时输出日志（后台线程 + 轮询）。
     *    如果已是最新版本则直接返回，不执行更新。
     *
     * @param {function} callback   回调 function(rdata)  { status, msg, current_version, new_version }
     * @param {function} onLog      日志回调 function(logText)  更新过程的实时输出（可选）
     * @param {function} onProgress 进度回调 function(msg)     当前阶段提示（可选）
     * @param {string}   stPath     自定义路径（可选）
     * @param {string}   branch     分支名（可选，默认 release）
     */
    function updateSillyTavern(callback, onLog, onProgress, stPath, branch) {
        var params = {};
        if (stPath) params.st_path = stPath;
        if (branch) params.branch = branch;

        request_plugin('update_sillytavern', params, function (rdata) {
            if (!rdata || !rdata.status) {
                var msg = (rdata && rdata.msg) ? rdata.msg : '启动更新失败';
                _report(onProgress, msg);
                if (onLog) onLog('[ERROR] ' + msg + '\n');
                if (callback) callback({ status: false, msg: msg });
                return;
            }

            // 已是最新版本
            if (!rdata.updating) {
                _report(onProgress, rdata.msg);
                if (callback) callback(rdata);
                return;
            }

            // 后台更新启动，开始轮询日志
            _report(onProgress, 'SillyTavern 更新已启动，正在等待日志...');
            if (onLog) onLog('[INFO] SillyTavern 更新已启动...\n');
            stopInstallPolling();
            _pollLogApi = 'get_update_st_log';
            _pollStart = Date.now();
            _pollUpdateLog(0, callback, onLog, onProgress, rdata.current_version || '');
        }, function () {
            _report(onProgress, '请求更新接口失败');
            if (onLog) onLog('[ERROR] 请求更新接口失败\n');
            if (callback) callback({ status: false, msg: '请求更新接口失败' });
        });
    }

    /**
     * 7. 检查 SillyTavern 是否有新版本（不执行更新）
     *    通过 git fetch + git rev-parse / rev-list 比较本地和远程 commit。
     *
     * @param {function} callback 回调 function(rdata)
     *   { status, is_latest, local_commit, remote_commit, remote_count, local_version, remote_version }
     *   remote_count: 远程领先的提交数量（0 表示已是最新）
     * @param {string}   stPath   自定义路径（可选）
     * @param {string}   branch   分支名（可选，默认 release）
     */
    function checkUpdate(callback, stPath, branch) {
        var params = {};
        if (stPath) params.st_path = stPath;
        if (branch) params.branch = branch;

        request_plugin('check_st_update', params, function (rdata) {
            if (callback) callback(rdata || { status: false, is_latest: false, msg: '请求失败' });
        }, function () {
            if (callback) callback({ status: false, is_latest: false, msg: '请求后端失败' });
        });
    }

    /**
     * 停止安装/更新日志轮询
     */
    function stopInstallPolling() {
        if (_pollTimer) {
            clearInterval(_pollTimer);
            _pollTimer = null;
        }
        _pollStart = null;
        _pollLogApi = null;
    }

    // ======== 内部方法 ========

    /**
     * 启动安装流程：调后端 → 轮询日志
     */
    function _startInstall(callback, onLog, onProgress, installPath, branch) {
        stopInstallPolling();

        var params = {};
        if (installPath) params.install_path = installPath;
        if (branch) params.branch = branch;

        request_plugin('install_sillytavern', params, function (rdata) {
            if (!rdata || rdata.status !== true) {
                var msg = (rdata && rdata.msg) ? rdata.msg : '启动安装失败';
                _report(onProgress, msg);
                if (onLog) onLog('[ERROR] ' + msg + '\n');
                if (callback) callback({ status: false, msg: msg });
                return;
            }

            if (rdata.installing) {
                _report(onProgress, 'SillyTavern 安装已启动，正在等待日志...');
                if (onLog) onLog('[INFO] SillyTavern 安装已启动...\n');
                _pollLogApi = 'get_install_st_log';
                _pollStart = Date.now();
                _pollLog(0, callback, onLog, onProgress, POLL_TIMEOUT_INSTALL);
            } else {
                if (callback) callback({ status: true, msg: rdata.msg || '安装完成' });
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
    function _pollLog(pos, callback, onLog, onProgress, timeout) {
        if (!_pollStart) _pollStart = Date.now();

        // 超时检测
        if (Date.now() - _pollStart > timeout) {
            stopInstallPolling();
            var timeoutMsg = 'SillyTavern 操作超时（' + Math.round(timeout / 60000) + '分钟），请检查日志';
            _report(onProgress, timeoutMsg);
            if (onLog) onLog('[WARN] ' + timeoutMsg + '\n');
            if (callback) callback({ status: false, msg: timeoutMsg });
            return;
        }

        request_plugin('get_install_st_log', { pos: pos }, function (rdata) {
            if (!rdata || rdata.status !== true) {
                _pollTimer = setTimeout(function () {
                    _pollLog(pos, callback, onLog, onProgress, timeout);
                }, POLL_INTERVAL);
                return;
            }

            if (rdata.log && onLog) {
                onLog(rdata.log);
            }

            if (rdata.done) {
                stopInstallPolling();

                // 验证安装结果
                _report(onProgress, '安装脚本执行完毕，正在验证...');
                getSillyTavernVersion(function (verRes) {
                    if (verRes.status && verRes.version) {
                        _report(onProgress, 'SillyTavern 安装成功: v' + verRes.version);
                        if (onLog) onLog('[SUCCESS] SillyTavern 安装成功: v' + verRes.version + '\n');
                        if (callback) callback({ status: true, msg: 'SillyTavern 安装成功', version: verRes.version, path: verRes.path });
                    } else {
                        _report(onProgress, '安装脚本已执行，但验证失败');
                        if (onLog) onLog('[ERROR] 安装完成但验证失败，请检查日志\n');
                        if (callback) callback({ status: false, msg: '安装完成但验证失败，请检查日志' });
                    }
                });
            } else {
                _pollTimer = setTimeout(function () {
                    _pollLog(rdata.pos || pos, callback, onLog, onProgress, timeout);
                }, POLL_INTERVAL);
            }
        }, function () {
            _pollTimer = setTimeout(function () {
                _pollLog(pos, callback, onLog, onProgress, timeout);
            }, POLL_INTERVAL);
        });
    }

    /**
     * 轮询更新日志（和安装类似，但完成后验证方式不同）
     */
    function _pollUpdateLog(pos, callback, onLog, onProgress, prevVersion) {
        if (!_pollStart) _pollStart = Date.now();

        // 超时检测
        if (Date.now() - _pollStart > POLL_TIMEOUT_UPDATE) {
            stopInstallPolling();
            var timeoutMsg = 'SillyTavern 更新超时（' + Math.round(POLL_TIMEOUT_UPDATE / 60000) + '分钟），请检查日志';
            _report(onProgress, timeoutMsg);
            if (onLog) onLog('[WARN] ' + timeoutMsg + '\n');
            if (callback) callback({ status: false, msg: timeoutMsg });
            return;
        }

        request_plugin(_pollLogApi || 'get_install_st_log', { pos: pos }, function (rdata) {
            if (!rdata || rdata.status !== true) {
                _pollTimer = setTimeout(function () {
                    _pollUpdateLog(pos, callback, onLog, onProgress, prevVersion);
                }, POLL_INTERVAL);
                return;
            }

            if (rdata.log && onLog) {
                onLog(rdata.log);
            }

            if (rdata.done) {
                stopInstallPolling();

                // 验证更新结果
                _report(onProgress, '更新脚本执行完毕，正在验证...');
                getSillyTavernVersion(function (verRes) {
                    var newVersion = verRes.version || '';
                    if (verRes.status && newVersion) {
                        var changed = (prevVersion !== newVersion);
                        _report(onProgress, changed
                            ? 'SillyTavern 更新成功: v' + prevVersion + ' → v' + newVersion
                            : 'SillyTavern 已是最新: v' + newVersion);
                        if (onLog) onLog('[SUCCESS] ' + (changed ? '更新成功' : '已是最新') + ': v' + newVersion + '\n');
                        if (callback) callback({
                            status: true,
                            msg: changed ? 'SillyTavern 已更新: v' + prevVersion + ' → v' + newVersion : '已是最新版本: v' + newVersion,
                            current_version: prevVersion,
                            new_version: newVersion
                        });
                    } else {
                        _report(onProgress, '更新脚本已执行，但验证失败');
                        if (onLog) onLog('[ERROR] 更新完成但验证失败，请检查日志\n');
                        if (callback) callback({ status: false, msg: '更新完成但验证失败，请检查日志' });
                    }
                });
            } else {
                _pollTimer = setTimeout(function () {
                    _pollUpdateLog(rdata.pos || pos, callback, onLog, onProgress, prevVersion);
                }, POLL_INTERVAL);
            }
        }, function () {
            _pollTimer = setTimeout(function () {
                _pollUpdateLog(pos, callback, onLog, onProgress, prevVersion);
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
        // 常量
        GITHUB_URL: GITHUB_URL,

        // 方法
        getSillyTavernVersion: getSillyTavernVersion,
        isSillyTavernInstall: isSillyTavernInstall,
        autoInstallSillyTavern: autoInstallSillyTavern,
        setStPath: setStPath,
        getStPath: getStPath,
        deleteSillyTavern: deleteSillyTavern,
        updateSillyTavern: updateSillyTavern,
        checkUpdate: checkUpdate,
        stopInstallPolling: stopInstallPolling
    };
})();

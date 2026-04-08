/**
 * NodeJs 管理模块
 * 通过宝塔 NodeJs 版本管理器插件 (name=nodejs) 提供的能力，
 * 实现 Node.js 版本检测、安装、PM2 模块管理等操作。
 *
 * 注意：本模块调用的是 NodeJs 插件的接口，不是本插件自身的接口，
 *       因此不使用 request_plugin()，而是直接用 $.ajax 指向 nodejs 插件。
 */

var NodeJs = (function () {
    "use strict";

    // NodeJs 配置模板
    var nodejs_config_tpl = {
        main_path: '/www/server/panel/plugin/nodejs',  // NodeJs 插件位置
        install_path: '/www/server/nodejs/',            // NodeJs 安装位置
        plugin_name: 'nodejs'                           // NodeJs 插件标识
    };

    // 预设 NPM 源列表（供页面渲染 select 使用）
    var NPM_REGISTRY_PRESETS = [
        { value: 'https://registry.npmmirror.com/', label: 'npmmirror 中国镜像' },
        { value: 'https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/', label: '清华大学源' },
        { value: 'https://mirrors.ustc.edu.cn/npm/', label: '中科大源' },
        { value: 'https://mirrors.huaweicloud.com/repository/npm/', label: '华为源' },
        { value: 'https://mirrors.cloud.tencent.com/npm/', label: '腾讯源' },
        { value: 'https://registry.npmjs.org/', label: '官方源' }
    ];

    // NodeJs 插件安装状态缓存（null=未检测，true=已安装，false=未安装）
    var _nodejsPluginSetupCache = null;

    /**
     * 向 NodeJs 插件发送请求（跨插件调用）
     * NodeJs 插件的接口统一走 /plugin?action=a&s=方法名&name=nodejs
     *
     * 内置前置检查：如果 NodeJs 插件未安装，直接回调失败，不发请求。
     *
     * @param {string}   s       NodeJs 插件的方法名
     * @param {object}   data    POST 参数
     * @param {function} success 成功回调 (rdata)
     * @param {function} error   失败回调 (xhr, status, error)
     * @param {number}   timeout 超时毫秒数
     */
    function _requestNodejsPlugin(s, data, success, error, timeout) {
        // 前置检查：NodeJs 插件是否已安装
        if (_nodejsPluginSetupCache === false) {
            // 已确认未安装，直接拒绝
            console.warn('[NodeJs] plugin not installed, skip request "' + s + '"');
            if (error) {
                error(null, 'error', 'NodeJs 插件未安装');
            } else {
                layer.msg('NodeJs 版本管理器插件未安装，无法执行此操作', { icon: 2 });
            }
            return;
        }

        if (_nodejsPluginSetupCache === null) {
            // 尚未检测过，先查状态
            isNodejsPluginSetup(function (isSetup) {
                _nodejsPluginSetupCache = !!isSetup;
                if (!_nodejsPluginSetupCache) {
                    console.warn('[NodeJs] plugin not installed, skip request "' + s + '"');
                    if (error) {
                        error(null, 'error', 'NodeJs 插件未安装');
                    } else {
                        layer.msg('NodeJs 版本管理器插件未安装，无法执行此操作', { icon: 2 });
                    }
                    return;
                }
                _doRequestNodejsPlugin(s, data, success, error, timeout);
            });
            return;
        }

        // 已确认已安装，直接发请求
        _doRequestNodejsPlugin(s, data, success, error, timeout);
    }

    /**
     * 实际发送请求到 NodeJs 插件（内部方法，前置检查通过后才调用）
     */
    function _doRequestNodejsPlugin(s, data, success, error, timeout) {
        if (!timeout) timeout = 3600 * 1000;
        $.ajax({
            type: 'POST',
            url: '/plugin?action=a&s=' + s + '&name=' + nodejs_config_tpl.plugin_name,
            data: data,
            timeout: timeout,
            success: function (rdata) {
                if (success) success(rdata);
            },
            error: function (xhr, status, err) {
                console.error('[NodeJs] request "' + s + '" failed:', status, err);
                if (error) {
                    error(xhr, status, err);
                } else {
                    layer.msg('请求 NodeJs 插件失败: ' + err, { icon: 2 });
                }
            }
        });
    }

    /**
     * 向宝塔面板 API 发送请求（用于获取插件列表等面板级接口）
     *
     * @param {string}   action  面板 action 参数（如 'get_soft_list'）
     * @param {object}   data    POST 参数
     * @param {function} success 成功回调
     * @param {function} error   失败回调
     * @param {number}   timeout 超时毫秒数
     */
    function _requestPanel(action, data, success, error, timeout) {
        if (!timeout) timeout = 3600 * 1000;
        $.ajax({
            type: 'POST',
            url: '/plugin?action=' + action,
            data: data,
            timeout: timeout,
            success: function (rdata) {
                if (success) success(rdata);
            },
            error: function (xhr, status, err) {
                console.error('[NodeJs] panel request "' + action + '" failed:', status, err);
                if (error) {
                    error(xhr, status, err);
                } else {
                    layer.msg('请求面板失败: ' + err, { icon: 2 });
                }
            }
        });
    }

    // ======== 公开方法 ========

    /**
     * 1. 获取系统当前默认的 NodeJs 版本
     *    通过本插件 Python 后端执行 node -v 获取。
     *
     * @param {function} callback 回调 function(version)  version 形如 "v20.10.0"，失败时为 null
     */
    function getSysNodejsVersion(callback) {
        request_plugin('get_nodejs_version', {}, function (rdata) {
            if (rdata.status && rdata.version) {
                if (callback) callback(rdata.version);
            } else {
                if (callback) callback(null);
            }
        }, function () {
            if (callback) callback(null);
        });
    }

    /**
     * 2. 获取 NodeJs 插件是否已安装
     *    通过面板的 get_soft_list 接口查询 nodejs 插件的 setup 字段。
     *
     * @param {function} callback 回调 function(isSetup)  true=已安装, false=未安装
     */
    function isNodejsPluginSetup(callback) {
        _requestPanel('get_soft_list', {
            type: 0,
            query: '管理node.js版本',
            p: 1,
            row: 15,
            force: 0
        }, function (rdata) {
            if (!rdata || !rdata.list || !rdata.list.data) {
                if (callback) callback(false);
                return;
            }
            var nodejsPlugin = null;
            for (var i = 0; i < rdata.list.data.length; i++) {
                if (rdata.list.data[i].name === 'nodejs') {
                    nodejsPlugin = rdata.list.data[i];
                    break;
                }
            }
            var isSetup = nodejsPlugin ? !!nodejsPlugin.setup : false;
            _nodejsPluginSetupCache = isSetup; // 同步更新缓存
            if (callback) callback(isSetup);
        }, function () {
            _nodejsPluginSetupCache = false;
            if (callback) callback(false);
        });
    }

    /**
     * 3. 获取 NodeJs 插件状态是否正常
     *    通过面板的 get_soft_list 接口查询 nodejs 插件的 status 字段。
     *
     * @param {function} callback 回调 function(isOk)  true=正常, false=异常/未安装
     */
    function isNodejsPluginStatus(callback) {
        _requestPanel('get_soft_list', {
            type: 0,
            query: '管理node.js版本',
            p: 1,
            row: 15,
            force: 0
        }, function (rdata) {
            if (!rdata || !rdata.list || !rdata.list.data) {
                if (callback) callback(false);
                return;
            }
            var nodejsPlugin = null;
            for (var i = 0; i < rdata.list.data.length; i++) {
                if (rdata.list.data[i].name === 'nodejs') {
                    nodejsPlugin = rdata.list.data[i];
                    break;
                }
            }
            if (!nodejsPlugin) {
                if (callback) callback(false);
                return;
            }
            // setup=true 且 status=true 才算正常
            if (callback) callback(!!nodejsPlugin.setup && !!nodejsPlugin.status);
        }, function () {
            if (callback) callback(false);
        });
    }

    /**
     * 4. 安装 NodeJs 插件（宝塔面板插件商店）
     *    完整流程：
     *      1) 通过 get_soft_list 确认 nodejs 插件未安装
     *      2) 调用 install_plugin 下载插件安装包（返回 tmp_path）
     *      3) 调用 input_package 使用 tmp_path 确认安装
     *
     * @param {function} callback 回调 function(rdata)  { status: true/false, msg: '...' }
     * @param {function} onProgress 进度回调 function(msg)  安装阶段提示
     */
    function installNodejsPlugin(callback, onProgress) {
        // 第 0 步：确认 nodejs 插件确实未安装
        _report(onProgress, '正在检查 NodeJs 插件安装状态...');

        _requestPanel('get_soft_list', {
            type: 0,
            query: '管理node.js版本',
            p: 1,
            row: 15,
            force: 0
        }, function (rdata) {
            if (rdata && rdata.list && rdata.list.data) {
                for (var i = 0; i < rdata.list.data.length; i++) {
                    if (rdata.list.data[i].name === 'nodejs' && rdata.list.data[i].setup) {
                        _report(onProgress, 'NodeJs 插件已安装，无需重复安装');
                        if (callback) callback({ status: true, msg: 'NodeJs 插件已安装' });
                        return;
                    }
                }
            }

            // 第 1 步：下载插件
            _report(onProgress, 'NodeJs 插件未安装，正在下载...');

            _requestPanel('install_plugin', {
                sName: 'nodejs',
                version: 2,
                min_version: 7
            }, function (rdata) {
                if (!rdata || !rdata.tmp_path) {
                    _report(onProgress, '下载 NodeJs 插件失败');
                    if (callback) callback({ status: false, msg: '下载 NodeJs 插件失败' });
                    return;
                }

                var tmpPath = rdata.tmp_path;
                _report(onProgress, '插件下载完成，正在安装...');

                // 第 2 步：使用 input_package 确认安装
                _requestPanel('input_package', {
                    plugin_name: 'nodejs',
                    tmp_path: tmpPath,
                    install_opt: 'i'
                }, function (installRes) {
                    if (!installRes || !installRes.status) {
                        var msg = (installRes && installRes.msg) ? installRes.msg : '安装 NodeJs 插件失败';
                        _report(onProgress, msg);
                        if (callback) callback({ status: false, msg: msg });
                        return;
                    }

                    _report(onProgress, 'NodeJs 版本管理器插件安装成功');
                    if (callback) callback({ status: true, msg: 'NodeJs 版本管理器插件安装成功' });
                });
            });
        });
    }

    /**
     * 5. 查询指定 NodeJs 版本是否已安装
     *    通过 NodeJs 插件的 get_online_version_list 获取版本列表，
     *    匹配版本号的 setup 字段，1=已安装，0=未安装。
     *
     * @param {string}   version  要查询的版本号，如 "v20.10.0"
     * @param {function} callback 回调 function(isInstalled)  true=已安装, false=未安装
     */
    function isNodejsVersionInstalled(version, callback) {
        if (!version) {
            if (callback) callback(false);
            return;
        }
        if (version.charAt(0) !== 'v') {
            version = 'v' + version;
        }

        _requestNodejsPlugin('get_online_version_list', { show_type: 1, force: 1 }, function (list) {
            if (!list || !Array.isArray(list) || list.length === 0) {
                if (callback) callback(false);
                return;
            }
            for (var i = 0; i < list.length; i++) {
                if (list[i].version === version) {
                    if (callback) callback(list[i].setup === 1);
                    return;
                }
            }
            if (callback) callback(false);
        }, function () {
            if (callback) callback(false);
        });
    }

    /**
     * 6. 获取最新 LTS 版本号
     *    从 get_online_version_list 列表中找到第一个 lts 非空且 security=true 的版本。
     *
     * @param {function} callback 回调 function(version)  形如 "v20.10.0"，失败时为 null
     */
    function getLatestLtsVersion(callback) {
        _requestNodejsPlugin('get_online_version_list', { show_type: 1, force: 1 }, function (list) {
            if (!list || !Array.isArray(list) || list.length === 0) {
                if (callback) callback(null);
                return;
            }
            // 列表已按时间倒序，找第一个有 lts 名称且 security=true 的
            for (var i = 0; i < list.length; i++) {
                if (list[i].lts && list[i].security === true) {
                    if (callback) callback(list[i].version);
                    return;
                }
            }
            // 没找到 security=true 的 LTS，退而求其次找第一个有 lts 的
            for (var j = 0; j < list.length; j++) {
                if (list[j].lts) {
                    if (callback) callback(list[j].version);
                    return;
                }
            }
            if (callback) callback(null);
        }, function () {
            if (callback) callback(null);
        });
    }

    /**
     * 7. 获取最佳已安装版本（>= v20，多个取最大）
     *    从版本列表中找到 setup=1 且主版本号 >= 20 的版本，
     *    如果有多个，返回版本号最大的那个。
     *
     * @param {function} callback 回调 function(version)  形如 "v22.10.0"，无可用版本时为 null
     */
    function getBestInstalledVersion(callback) {
        _requestNodejsPlugin('get_online_version_list', { show_type: 1, force: 1 }, function (list) {
            if (!list || !Array.isArray(list) || list.length === 0) {
                if (callback) callback(null);
                return;
            }
            var best = null;
            var bestMajor = -1;
            for (var i = 0; i < list.length; i++) {
                if (list[i].setup !== 1) continue;
                var major = _parseMajorVersion(list[i].version);
                if (major < 20) continue;
                // 选主版本号最大的
                if (major > bestMajor || (major === bestMajor && _compareVersion(list[i].version, best) > 0)) {
                    best = list[i].version;
                    bestMajor = major;
                }
            }
            if (callback) callback(best);
        }, function () {
            if (callback) callback(null);
        });
    }

    /**
     * 9. 获取当前 NPM 源
     *    通过本插件 Python 后端执行 npm config get registry 获取。
     *
     * @param {function} callback 回调 function(rdata)  { status, registry }
     *   registry 为当前源地址，如 "https://registry.npmmirror.com/"
     *   失败时 registry 为空字符串
     */
    function getNpmRegistry(callback) {
        request_plugin('get_npm_registry', {}, function (rdata) {
            if (callback) callback(rdata || { status: false, registry: '' });
        }, function () {
            if (callback) callback({ status: false, registry: '', msg: '请求后端失败' });
        });
    }

    /**
     * 10. 设置 NPM 源
     *    同时执行两步：
     *      1) NodeJs 插件 set_registry_url — 设置当前版本的 NPM 源（临时）
     *      2) 本插件后端 set_npm_registry — 执行 npm config set registry（全局）
     *    需要前置检查 NodeJs 插件是否已安装（由 _requestNodejsPlugin 内置拦截）。
     *
     * @param {string}   registry 要设置的 NPM 源地址，如 "https://registry.npmmirror.com/"
     * @param {function} callback 回调 function(rdata)  { status, msg }
     */
    function setNpmRegistry(registry, callback) {
        if (!registry) {
            if (callback) callback({ status: false, msg: 'registry 不能为空' });
            return;
        }

        // 第 1 步：通过 NodeJs 插件设置当前版本 NPM 源（临时）
        _requestNodejsPlugin('set_registry_url', { registry: registry }, function (rdata) {
            if (!rdata || rdata.status !== true) {
                var msg = (rdata && (rdata.msg || rdata.error_msg)) ? (rdata.msg || rdata.error_msg) : '设置当前版本 NPM 源失败';
                if (callback) callback({ status: false, msg: msg });
                return;
            }

            // 第 2 步：通过本插件后端全局设置 NPM 源
            request_plugin('set_npm_registry', { registry: registry }, function (globalRes) {
                if (globalRes && globalRes.status) {
                    if (callback) callback({ status: true, msg: 'NPM 源已设置（当前版本 + 全局）：' + registry });
                } else {
                    // 全局设置失败，当前版本已成功，部分成功
                    var warn = (globalRes && globalRes.msg) ? globalRes.msg : '全局设置失败';
                    if (callback) callback({ status: true, msg: '当前版本 NPM 源已设置，但全局设置失败（' + warn + '）' });
                }
            }, function () {
                if (callback) callback({ status: true, msg: '当前版本 NPM 源已设置，全局设置请求失败' });
            });
        }, function () {
            if (callback) callback({ status: false, msg: '设置 NPM 源失败，请检查 NodeJs 插件状态' });
        });
    }

    /**
     * 11. 获取当前 NPM 源的可读名称
     *    先获取当前源 URL，再从 NPM_REGISTRY_PRESETS 中匹配 value 返回对应的 label。
     *    匹配不到时返回原始 URL。
     *
     * @param {function} callback 回调 function(rdata)  { status, registry, label }
     *   registry: 当前源 URL
     *   label: 预设名称（如 "npmmirror 中国镜像"）或原始 URL
     */
    function getNpmRegistryLabel(callback) {
        getNpmRegistry(function (rdata) {
            if (!rdata.status || !rdata.registry) {
                if (callback) callback({ status: false, registry: '', label: '未知' });
                return;
            }
            var url = rdata.registry;
            var label = url; // 默认返回原始 URL
            for (var i = 0; i < NPM_REGISTRY_PRESETS.length; i++) {
                if (NPM_REGISTRY_PRESETS[i].value === url) {
                    label = NPM_REGISTRY_PRESETS[i].label;
                    break;
                }
            }
            if (callback) callback({ status: true, registry: url, label: label });
        });
    }

    /**
     * 8. 一键自动配置 NodeJs 环境与 PM2
     *    智能策略：自动获取版本，仅安装缺失的部分
     *    流程：
     *      1) 检查 NodeJs 插件是否已安装 → 未安装则安装
     *      2) 获取版本列表，查找已安装的 >=v20 版本
     *         - 有可用的 → 选最大版本，设为默认
     *         - 没有可用的 → 获取最新 LTS 版本并安装
     *      3) 检测 PM2 是否已安装 → 未安装才安装
     *      4) 设置为默认版本
     *
     * @param {function} callback    回调 function(rdata)  { status, msg, version }
     * @param {function} onProgress  进度回调 function(progress)  { stage, msg }
     */
    function autoSetupNodejsPluginAndPM2AndSetDefault(callback, onProgress) {
        // === 第 1 步：检查并安装 NodeJs 插件 ===
        _report(onProgress, { stage: 'check_plugin', msg: '正在检查 NodeJs 插件安装状态...' });

        isNodejsPluginSetup(function (isSetup) {
            if (isSetup) {
                _report(onProgress, { stage: 'check_plugin', msg: 'NodeJs 插件已安装，跳过' });
                _resolveNodejsVersion(callback, onProgress);
            } else {
                _report(onProgress, { stage: 'install_plugin', msg: 'NodeJs 插件未安装，正在安装...' });
                installNodejsPlugin(
                    function (rdata) {
                        if (!rdata.status) {
                            if (callback) callback({ status: false, msg: '安装 NodeJs 插件失败: ' + rdata.msg });
                            return;
                        }
                        _report(onProgress, { stage: 'install_plugin', msg: 'NodeJs 插件安装成功' });
                        _nodejsPluginSetupCache = true; // 安装成功，更新缓存
                        _resolveNodejsVersion(callback, onProgress);
                    },
                    function (msg) {
                        _report(onProgress, { stage: 'install_plugin', msg: msg });
                    }
                );
            }
        });
    }

    /**
     * 第 2 步：智能决定使用哪个 NodeJs 版本
     *    优先使用已安装的 >=v20 最大版本，否则安装最新 LTS
     */
    function _resolveNodejsVersion(callback, onProgress) {
        _report(onProgress, { stage: 'check_version', msg: '正在获取 NodeJs 版本列表...' });

        getBestInstalledVersion(function (installedVersion) {
            if (installedVersion) {
                // 已有 >= v20 的可用版本，直接使用
                _report(onProgress, { stage: 'check_version', msg: '已找到可用 NodeJs ' + installedVersion + '，跳过安装' });
                _setDefaultAndInstallPm2(installedVersion, callback, onProgress);
            } else {
                // 没有 >= v20 的版本，安装最新 LTS
                _report(onProgress, { stage: 'check_version', msg: '未找到已安装的 >=v20 版本，正在查找最新 LTS...' });
                getLatestLtsVersion(function (ltsVersion) {
                    if (!ltsVersion) {
                        if (callback) callback({ status: false, msg: '无法获取可用的 NodeJs LTS 版本' });
                        return;
                    }
                    _report(onProgress, { stage: 'install_nodejs', msg: '正在安装 NodeJs ' + ltsVersion + '...' });

                    _requestNodejsPlugin('install_nodejs', { version: ltsVersion }, function (rdata) {
                        if (!rdata || rdata.status !== true) {
                            _report(onProgress, { stage: 'install_nodejs', msg: rdata && rdata.msg ? rdata.msg : '安装 NodeJs 失败' });
                            if (callback) callback({ status: false, msg: rdata && rdata.msg ? rdata.msg : '安装 NodeJs 失败' });
                            return;
                        }
                        _report(onProgress, { stage: 'install_nodejs', msg: rdata.data || ('NodeJs ' + ltsVersion + ' 安装成功') });
                        _setDefaultAndInstallPm2(ltsVersion, callback, onProgress);
                    });
                });
            }
        });
    }

    /**
     * 第 3 步：设为默认版本 + 安装 PM2
     */
    function _setDefaultAndInstallPm2(version, callback, onProgress) {
        _report(onProgress, { stage: 'set_default', msg: '正在设置 ' + version + ' 为默认版本...' });

        _requestNodejsPlugin('set_default_env', { version: version }, function (defRes) {
            if (!defRes || defRes.status !== true) {
                _report(onProgress, { stage: 'set_default', msg: defRes && defRes.msg ? defRes.msg : '设置默认版本失败' });
                if (callback) callback({ status: false, msg: defRes && defRes.msg ? defRes.msg : '设置默认版本失败' });
                return;
            }
            _report(onProgress, { stage: 'set_default', msg: defRes.data || (version + ' 已设为默认版本') });
            _installPm2(version, callback, onProgress);
        });
    }

    /**
     * 第 4 步：检测并安装 PM2 模块
     *    先通过本插件后端检测 PM2 是否已安装，未安装才调用 NodeJs 插件安装
     */
    function _installPm2(version, callback, onProgress) {
        _report(onProgress, { stage: 'install_pm2', msg: '正在检测 PM2 安装状态...' });

        request_plugin('is_pm2_installed', {}, function (rdata) {
            if (rdata.status && rdata.installed) {
                _report(onProgress, { stage: 'install_pm2', msg: 'PM2 已安装（版本 ' + (rdata.version || '') + '），跳过安装' });
                _report(onProgress, { stage: 'done', msg: 'NodeJs ' + version + ' 及 PM2 配置完成，已设为默认版本' });
                if (callback) callback({ status: true, msg: 'NodeJs ' + version + ' 及 PM2 配置完成（PM2 已存在）', version: version });
                return;
            }

            // PM2 未安装，执行安装
            _report(onProgress, { stage: 'install_pm2', msg: 'PM2 未安装，正在安装...' });

            _requestNodejsPlugin('install_module', { version: version, module: 'pm2' }, function (pm2Res) {
                if (!pm2Res || pm2Res.status !== true) {
                    _report(onProgress, { stage: 'install_pm2', msg: pm2Res && pm2Res.msg ? pm2Res.msg : '安装 PM2 失败' });
                    if (callback) callback({ status: false, msg: pm2Res && pm2Res.msg ? pm2Res.msg : '安装 PM2 失败' });
                    return;
                }

                _report(onProgress, { stage: 'install_pm2', msg: pm2Res.data || 'PM2 模块安装成功' });

                // 全部完成
                _report(onProgress, { stage: 'done', msg: 'NodeJs ' + version + ' 及 PM2 配置完成，已设为默认版本' });
                if (callback) callback({ status: true, msg: 'NodeJs ' + version + ' 及 PM2 配置完成，已设为默认版本', version: version });
            });
        }, function () {
            // 检测失败，为安全起见仍然尝试安装（降级为原来的幂等行为）
            _report(onProgress, { stage: 'install_pm2', msg: 'PM2 检测失败，将尝试安装...' });

            _requestNodejsPlugin('install_module', { version: version, module: 'pm2' }, function (pm2Res) {
                if (!pm2Res || pm2Res.status !== true) {
                    _report(onProgress, { stage: 'install_pm2', msg: pm2Res && pm2Res.msg ? pm2Res.msg : '安装 PM2 失败' });
                    if (callback) callback({ status: false, msg: pm2Res && pm2Res.msg ? pm2Res.msg : '安装 PM2 失败' });
                    return;
                }

                _report(onProgress, { stage: 'install_pm2', msg: pm2Res.data || 'PM2 模块安装成功' });
                _report(onProgress, { stage: 'done', msg: 'NodeJs ' + version + ' 及 PM2 配置完成，已设为默认版本' });
                if (callback) callback({ status: true, msg: 'NodeJs ' + version + ' 及 PM2 配置完成，已设为默认版本', version: version });
            });
        });
    }

    // ======== 辅助函数 ========

    /**
     * 解析版本号的主版本号，如 "v20.10.0" → 20
     */
    function _parseMajorVersion(version) {
        if (!version) return -1;
        var v = version.replace(/^v/, '');
        var parts = v.split('.');
        return parts.length > 0 ? parseInt(parts[0], 10) : -1;
    }

    /**
     * 比较两个语义化版本号
     * 返回：>0 表示 a > b，<0 表示 a < b，0 表示相等
     */
    function _compareVersion(a, b) {
        if (!a && !b) return 0;
        if (!a) return -1;
        if (!b) return 1;
        var pa = a.replace(/^v/, '').split('.').map(Number);
        var pb = b.replace(/^v/, '').split('.').map(Number);
        for (var i = 0; i < 3; i++) {
            var va = pa[i] || 0;
            var vb = pb[i] || 0;
            if (va > vb) return 1;
            if (va < vb) return -1;
        }
        return 0;
    }

    /**
     * 安全触发回调（支持 progress 对象和纯字符串）
     */
    function _report(onProgress, data) {
        if (typeof onProgress === 'function') {
            onProgress(data);
        }
    }

    // ======== 公开接口 ========
    return {
        // 配置
        config: nodejs_config_tpl,

        // 预设 NPM 源列表
        npmRegistryPresets: NPM_REGISTRY_PRESETS,

        // 核心方法
        getSysNodejsVersion: getSysNodejsVersion,
        isNodejsPluginSetup: isNodejsPluginSetup,
        isNodejsPluginStatus: isNodejsPluginStatus,
        installNodejsPlugin: installNodejsPlugin,
        isNodejsVersionInstalled: isNodejsVersionInstalled,
        getLatestLtsVersion: getLatestLtsVersion,
        getBestInstalledVersion: getBestInstalledVersion,
        getNpmRegistry: getNpmRegistry,
        getNpmRegistryLabel: getNpmRegistryLabel,
        setNpmRegistry: setNpmRegistry,
        autoSetupNodejsPluginAndPM2AndSetDefault: autoSetupNodejsPluginAndPM2AndSetDefault
    };
})();

/**
 * Nginx 反向代理模块
 *
 * 直接调用宝塔面板 Nginx 模块原生接口（/plugin?action=get_soft_list、
 * /mod/proxy/com/*），不经过本插件 Python 后端。
 *
 * 设计原则：
 *   - 全模块只管一个固定的反向代理项目（PROXY_SITE_NAME），即酒馆专属。
 *   - 增/查/删/改均以 PROXY_SITE_NAME 为唯一键，不操作其他站点。
 *   - 外部调用只需关心端口 + 域名（绑定 IP），其余参数由本模块固定。
 */

var Nginx = (function () {
    "use strict";

    // ======== 常量 ========

    /**
     * 酒馆反向代理的唯一站点名（宝塔 site_name / domains 字段）
     * 所有操作都以这个键为目标，不会影响其他站点。
     */
    var PROXY_SITE_NAME = 'stl-sillytavern';

    /**
     * 固定备注，显示在宝塔反向代理列表里
     */
    var PROXY_REMARK = 'SillyTavern 反向代理服务';

    // ======== 私有工具 ========

    /**
     * 向宝塔面板原生接口发送 POST 请求
     *
     * @param {string}   url      宝塔接口路径，如 '/mod/proxy/com/create'
     * @param {object}   data     POST 参数（plain object）
     * @param {function} success  成功回调 (rdata)
     * @param {function} error    失败回调 (msg)
     * @param {number}   [timeout=15000]
     */
    function _btRequest(url, data, success, error, timeout) {
        $.ajax({
            type: 'POST',
            url: url,
            data: data,
            timeout: timeout || 15000,
            success: function (rdata) {
                if (typeof rdata === 'string') {
                    try { rdata = JSON.parse(rdata); } catch (e) { /* ignore */ }
                }
                if (success) success(rdata);
            },
            error: function (xhr, status, err) {
                var msg = '请求宝塔接口失败：' + (err || status);
                console.error('[Nginx]', url, msg);
                if (error) error(msg);
            }
        });
    }

    /**
     * 内部通用失败结构
     */
    function _fail(msg) {
        return { status: false, msg: msg || '未知错误' };
    }

    // ======== 公开方法 ========

    /**
     * 1. 检测 Nginx 是否已安装（installed）且运行正常（running）
     *
     * 通过 /plugin?action=get_soft_list 查询 name=nginx 的条目。
     * - setup: true  → 已安装
     * - status: true → 服务正在运行
     *
     * @param {function} callback  回调 function({ status, installed, running, msg })
     *   status   — 本次请求是否成功
     *   installed — Nginx 是否已安装
     *   running   — Nginx 服务是否正在运行
     */
    function isNginxInstalled(callback) {
        _btRequest(
            '/plugin?action=get_soft_list',
            { type: 0, query: 'Nginx', p: 1, row: 15, force: 0 },
            function (rdata) {
                if (!rdata || !rdata.list || !rdata.list.data) {
                    if (callback) callback(_fail('接口返回数据异常'));
                    return;
                }
                // 在列表里找 name === 'nginx' 的条目
                var nginxItem = null;
                var list = rdata.list.data;
                for (var i = 0; i < list.length; i++) {
                    if (list[i].name === 'nginx') {
                        nginxItem = list[i];
                        break;
                    }
                }
                if (!nginxItem) {
                    if (callback) callback({ status: true, installed: false, running: false, msg: '未找到 Nginx 条目' });
                    return;
                }
                if (callback) callback({
                    status: true,
                    installed: !!nginxItem.setup,
                    running: !!nginxItem.status,
                    msg: nginxItem.setup
                        ? (nginxItem.status ? 'Nginx 已安装且运行中' : 'Nginx 已安装但未运行')
                        : 'Nginx 未安装'
                });
            },
            function (msg) {
                if (callback) callback(_fail(msg));
            }
        );
    }

    /**
     * 2. 获取当前酒馆反向代理配置
     *
     * 从代理列表里查找 name === PROXY_SITE_NAME 的条目。
     *
     * @param {function} callback  回调 function({ status, exists, proxy, msg })
     *   status — 本次请求是否成功
     *   exists — 代理是否已存在
     *   proxy  — 代理条目原始数据（exists=true 时有值），含 id / proxy_pass / conf_path 等
     */
    function getProxyInfo(callback) {
        _btRequest(
            '/mod/proxy/com/get_list',
            { search: PROXY_SITE_NAME, p: 1, limit: 20 },
            function (rdata) {
                if (!rdata || !rdata.status) {
                    if (callback) callback(_fail((rdata && rdata.msg) || '获取代理列表失败'));
                    return;
                }
                var list = (rdata.data && rdata.data.data) || [];
                var found = null;
                for (var i = 0; i < list.length; i++) {
                    if (list[i].name === PROXY_SITE_NAME) {
                        found = list[i];
                        break;
                    }
                }
                if (callback) callback({
                    status: true,
                    exists: !!found,
                    proxy: found || null,
                    msg: found ? '代理已存在' : '代理不存在'
                });
            },
            function (msg) {
                if (callback) callback(_fail(msg));
            }
        );
    }

    /**
     * 3. 创建酒馆反向代理
     *
     * 固定参数：
     *   domains     = PROXY_SITE_NAME（站点名/绑定域名）
     *   remark      = PROXY_REMARK
     *   proxy_type  = http
     *   proxy_host  = $http_host
     *
     * @param {object}   options           配置项
     * @param {string}   options.port      酒馆监听端口，如 '8000'（必填）
     * @param {string}   [options.host]    代理目标 host，默认 '127.0.0.1'
     * @param {function} callback          回调 function({ status, msg, data })
     */
    function createProxy(options, callback) {
        if (!options || !options.port) {
            if (callback) callback(_fail('缺少 port 参数'));
            return;
        }
        var host = options.host || '127.0.0.1';
        var proxyPass = 'http://' + host + ':' + options.port;

        _btRequest(
            '/mod/proxy/com/create',
            {
                remark: PROXY_REMARK,
                proxy_type: 'http',
                proxy_pass: proxyPass,
                domains: PROXY_SITE_NAME,
                proxy_host: '$http_host'
            },
            function (rdata) {
                if (callback) callback({
                    status: !!(rdata && rdata.status),
                    msg: (rdata && rdata.msg) || '未知响应',
                    data: rdata || null
                });
            },
            function (msg) {
                if (callback) callback(_fail(msg));
            }
        );
    }

    /**
     * 4. 删除酒馆反向代理
     *
     * 先查询代理 ID，再执行删除（宝塔删除接口需要 id + site_name）。
     * remove_path=1 会同时删除站点目录，适合反向代理这种无实际文件的场景。
     *
     * @param {function} callback  回调 function({ status, msg })
     */
    function deleteProxy(callback) {
        getProxyInfo(function (info) {
            if (!info.status) {
                if (callback) callback(info);
                return;
            }
            if (!info.exists) {
                // 不存在也算成功，幂等处理
                if (callback) callback({ status: true, msg: '代理不存在，无需删除' });
                return;
            }

            var proxyId = info.proxy.id;
            _btRequest(
                '/mod/proxy/com/delete',
                {
                    remove_path: 1,
                    id: proxyId,
                    site_name: PROXY_SITE_NAME
                },
                function (rdata) {
                    if (callback) callback({
                        status: !!(rdata && rdata.status),
                        msg: (rdata && rdata.msg) || '未知响应'
                    });
                },
                function (msg) {
                    if (callback) callback(_fail(msg));
                }
            );
        });
    }

    /**
     * 5. 更新酒馆反向代理的目标端口（先删后建）
     *
     * 如果代理不存在则直接新建。
     *
     * @param {object}   options      同 createProxy 的 options
     * @param {function} callback     回调 function({ status, msg })
     */
    function updateProxy(options, callback) {
        getProxyInfo(function (info) {
            if (!info.status) {
                if (callback) callback(info);
                return;
            }

            if (!info.exists) {
                // 不存在就直接创建
                createProxy(options, callback);
                return;
            }

            // 存在则先删后建
            deleteProxy(function (delResult) {
                if (!delResult.status) {
                    if (callback) callback(delResult);
                    return;
                }
                createProxy(options, callback);
            });
        });
    }

    /**
     * 6. 确保代理存在（不存在则创建，存在则检查 proxy_pass 是否一致，不一致则更新）
     *
     * 典型场景：页面初始化时调用，保证代理与当前端口配置同步。
     *
     * @param {object}   options      同 createProxy 的 options
     * @param {function} callback     回调 function({ status, action, msg })
     *   action: 'created' | 'updated' | 'exists' | 'failed'
     */
    function ensureProxy(options, callback) {
        if (!options || !options.port) {
            if (callback) callback(_fail('缺少 port 参数'));
            return;
        }
        var host = options.host || '127.0.0.1';
        var expectedPass = 'http://' + host + ':' + options.port;

        getProxyInfo(function (info) {
            if (!info.status) {
                if (callback) callback({ status: false, action: 'failed', msg: info.msg });
                return;
            }

            if (!info.exists) {
                createProxy(options, function (res) {
                    if (callback) callback({
                        status: res.status,
                        action: res.status ? 'created' : 'failed',
                        msg: res.msg
                    });
                });
                return;
            }

            // 已存在，检查 proxy_pass 是否一致
            if (info.proxy.proxy_pass === expectedPass) {
                if (callback) callback({ status: true, action: 'exists', msg: '代理已存在且配置正确' });
                return;
            }

            // proxy_pass 不一致，需要更新
            updateProxy(options, function (res) {
                if (callback) callback({
                    status: res.status,
                    action: res.status ? 'updated' : 'failed',
                    msg: res.msg
                });
            });
        });
    }

    // ======== 对外暴露 ========

    return {
        /** Nginx 是否安装 + 运行状态检测 */
        isNginxInstalled: isNginxInstalled,

        /** 获取当前酒馆代理信息（含 id / proxy_pass 等） */
        getProxyInfo: getProxyInfo,

        /** 创建反向代理（端口 + 可选 host） */
        createProxy: createProxy,

        /** 删除反向代理（自动查 id，幂等） */
        deleteProxy: deleteProxy,

        /** 更新反向代理目标（先删后建） */
        updateProxy: updateProxy,

        /**
         * 确保代理与指定端口同步
         * 最常用的入口：传端口即可，模块自己处理创建/更新/跳过
         */
        ensureProxy: ensureProxy,

        /** 当前使用的站点唯一键（只读，供外部展示用） */
        PROXY_SITE_NAME: PROXY_SITE_NAME
    };
})();

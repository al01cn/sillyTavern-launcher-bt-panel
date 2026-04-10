/**
 * Nginx 反向代理模块
 *
 * 直接调用宝塔面板 Nginx 模块原生接口（/plugin?action=get_soft_list、
 * /mod/proxy/com/*、/site?action=GetSSL 等），不经过本插件 Python 后端。
 *
 * 设计原则：
 *   - 全模块只管一个固定的反向代理项目（PROXY_SITE_NAME），即酒馆专属。
 *   - 增/查/删/改/SSL 均以 PROXY_SITE_NAME 为唯一键，不操作其他站点。
 *   - 外部调用只需关心端口 + 域名，其余参数由本模块固定。
 */

var Nginx = (function () {
    "use strict";

    // ======== 站点名（动态，由 proxy-modal 创建后缓存） ========

    /**
     * 当前代理站点的 site_name，从后端 proxy_site_name 配置读取
     * 初始为空字符串，创建成功后由 ProxyModal 调用 setSiteName() 设置
     */
    var _siteName = '';

    /**
     * 设置当前代理站点的 site_name
     * @param {string} name  站点名（即用户绑定的域名）
     */
    function setSiteName(name) {
        _siteName = name || '';
    }

    /**
     * 固定备注，显示在宝塔反向代理列表里
     */
    var PROXY_REMARK = 'SillyTavern 反向代理服务';

    /**
     * 反向代理路径（默认根路径）
     */
    var PROXY_PATH = '/';

    /**
     * 默认代理类型
     */
    var PROXY_TYPE = 'http';

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
     *   proxy  — 代理条目原始数据（exists=true 时有值），含 id / proxy_pass / conf_path / ssl 等
     */
    /**
     * 内部：从列表条目判断是否是酒馆代理
     *   优先用 _siteName 匹配条目 name
     *   其次 ps 备注匹配
     *   兜底（仅 _siteName 为空时）：proxy_pass 指向 127.0.0.1
     */
    function _isOurProxy(item) {
        if (!item) return false;
        // 优先：site_name 匹配条目 name
        if (_siteName && (item.name || '') === _siteName) {
            return true;
        }
        // 其次：ps 备注匹配
        if ((item.ps || '') === PROXY_REMARK) {
            return true;
        }
        // 兜底：_siteName 为空时，用 proxy_pass 特征匹配
        // 避免误匹配其他用户的反向代理
        if (!_siteName && (item.proxy_pass || '').indexOf('127.0.0.1') !== -1) {
            return true;
        }
        return false;
    }

    function getProxyInfo(callback) {
        _btRequest(
            '/mod/proxy/com/get_list',
            { p: 1, limit: 500 },
            function (rdata) {
                if (!rdata || !rdata.status) {
                    if (callback) callback(_fail((rdata && rdata.msg) || '获取代理列表失败'));
                    return;
                }
                var list = (rdata.data && rdata.data.data) || [];
                var found = null;
                for (var i = 0; i < list.length; i++) {
                    if (_isOurProxy(list[i])) {
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
     *   domains     = PROXY_SITE_NAME
     *   remark      = PROXY_REMARK
     *   proxy_type  = http
     *   proxy_host  = $http_host
     *   proxy_path  = /
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
                proxy_type: PROXY_TYPE,
                proxy_pass: proxyPass,
                domains: _siteName,
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
                    site_name: _siteName
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
     * 5. 更新反向代理配置（直接调用宝塔 set_url_proxy）
     *
     * 与先删后建不同，此方法直接修改现有代理的各项参数。
     * 注意：需要代理已存在，否则宝塔会报错。
     *
     * @param {object}   options                      配置项
     * @param {string}   options.port                酒馆监听端口（必填）
     * @param {string}   [options.host]              代理目标 host，默认 '127.0.0.1'
     * @param {string}   [options.proxyPath]          代理路径，默认 '/'
     * @param {string}   [options.proxyHost]         代理头，默认 '$http_host'
     * @param {number}   [options.websocket]          是否启用 WebSocket，1=启用，0=关闭，默认 1
     * @param {number}   [options.connectTimeout]     proxy_connect_timeout，默认 60
     * @param {number}   [options.sendTimeout]       proxy_send_timeout，默认 600
     * @param {number}   [options.readTimeout]       proxy_read_timeout，默认 600
     * @param {function} callback                     回调 function({ status, msg, data })
     */
    function setProxyConfig(options, callback) {
        if (!options || !options.port) {
            if (callback) callback(_fail('缺少 port 参数'));
            return;
        }
        var host = options.host || '127.0.0.1';
        var proxyPass = 'http://' + host + ':' + options.port;

        _btRequest(
            '/mod/proxy/com/set_url_proxy',
            {
                site_name: _siteName,
                proxy_path: options.proxyPath || PROXY_PATH,
                proxy_pass: proxyPass,
                proxy_host: options.proxyHost || '$http_host',
                proxy_type: PROXY_TYPE,
                remark: PROXY_REMARK,
                websocket: (options.websocket !== undefined) ? options.websocket : 1,
                proxy_connect_timeout: options.connectTimeout || 60,
                proxy_send_timeout: options.sendTimeout || 600,
                proxy_read_timeout: options.readTimeout || 600
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
     * 6. 更新酒馆反向代理的目标端口（先删后建）
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
                createProxy(options, callback);
                return;
            }

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
     * 7. 确保代理存在（不存在则创建，存在则检查 proxy_pass 是否一致，不一致则更新）
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

            if (info.proxy.proxy_pass === expectedPass) {
                if (callback) callback({ status: true, action: 'exists', msg: '代理已存在且配置正确' });
                return;
            }

            updateProxy(options, function (res) {
                if (callback) callback({
                    status: res.status,
                    action: res.status ? 'updated' : 'failed',
                    msg: res.msg
                });
            });
        });
    }

    // ======== SSL 相关方法 ========

    /**
     * 8. 获取酒馆代理的 SSL 证书信息
     *
     * @param {function} callback  回调 function({ status, hasSsl, sslInfo, msg })
     *   hasSsl  — 是否已配置 SSL
     *   sslInfo — SSL 详情（hasSsl=true 时），含 key / csr / cert_data / tls_versions 等
     */
    function getSslInfo(callback) {
        _btRequest(
            '/site?action=GetSSL',
            { siteName: _siteName },
            function (rdata) {
                if (!rdata) {
                    if (callback) callback(_fail('获取 SSL 信息失败'));
                    return;
                }
                var hasSsl = !!(rdata && rdata.cert_data && rdata.cert_data.subject);
                if (callback) callback({
                    status: true,
                    hasSsl: hasSsl,
                    sslInfo: hasSsl ? rdata : null,
                    msg: hasSsl ? '已配置 SSL' : '未配置 SSL'
                });
            },
            function (msg) {
                if (callback) callback(_fail(msg));
            }
        );
    }

    /**
     * 9. 验证 SSL 证书与密钥格式是否匹配
     *
     * @param {string}   key        私钥内容（不含 URL 编码）
     * @param {string}   cert       证书内容（不含 URL 编码）
     * @param {function} callback   回调 function({ status, msg })
     */
    function verifyCertificate(key, cert, callback) {
        if (!key || !cert) {
            if (callback) callback(_fail('key 和 cert 参数均不能为空'));
            return;
        }
        _btRequest(
            '/ssl/cert/verify_certificate_chain',
            {
                key: encodeURIComponent(key),
                cert: encodeURIComponent(cert)
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
    }

    /**
     * 10. 设置 SSL 证书（手动上传）
     *
     * @param {string}   key        私钥内容（不含 URL 编码）
     * @param {string}   cert       证书内容（不含 URL 编码）
     * @param {function} callback   回调 function({ status, msg })
     */
    function setSslCertificate(key, cert, callback) {
        if (!key || !cert) {
            if (callback) callback(_fail('key 和 cert 参数均不能为空'));
            return;
        }
        _btRequest(
            '/mod/proxy/com/set_ssl',
            {
                site_name: _siteName,
                key: encodeURIComponent(key),
                csr: encodeURIComponent(cert)
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
    }

    /**
     * 11. 申请免费 Let's Encrypt SSL 证书
     *
     * @param {string[]} domains     要申请的域名数组，如 ['example.com', 'www.example.com']
     * @param {function} callback   回调 function({ status, msg, cert, privateKey, data })
     *   成功时 data 包含 cert / root / private_key / save_path 等
     */
    function applyLetsEncryptCert(domains, callback) {
        if (!domains || !domains.length) {
            if (callback) callback(_fail('domains 参数不能为空'));
            return;
        }
        var domainsJson = JSON.stringify(domains);
        var domainsEncode = encodeURIComponent(domainsJson);
        var authToEncode = encodeURIComponent(domainsJson);

        // 需要先获取 proxy id
        getProxyInfo(function (info) {
            if (!info.status || !info.exists) {
                if (callback) callback(_fail('代理不存在，无法申请证书'));
                return;
            }
            var proxyId = info.proxy.id;

                _btRequest(
                '/mod/proxy/com/apply_cert_api',
                {
                    domains: domainsEncode,
                    auth_type: 'http',
                    auth_to: authToEncode,
                    auto_wildcard: 0,
                    id: proxyId,
                    ca: 'letsencrypt',
                    site_name: _siteName
                },
                function (rdata) {
                    if (callback) callback({
                        status: !!(rdata && rdata.status),
                        msg: (rdata && rdata.msg) || '未知响应',
                        cert: (rdata && rdata.cert) || null,
                        privateKey: (rdata && rdata.private_key) || null,
                        data: rdata || null
                    });
                },
                function (msg) {
                    if (callback) callback(_fail(msg));
                }
            );
        });
    }

    /**
     * 12. 开启/关闭 HTTP 强制跳转 HTTPS
     *
     * @param {boolean}  enable     true=开启强制 HTTPS，false=关闭
     * @param {function} callback   回调 function({ status, msg })
     */
    function setForceHttps(enable, callback) {
        _btRequest(
            '/mod/proxy/com/set_force_https',
            {
                site_name: _siteName,
                force_https: enable ? 1 : 0
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
    }

    /**
     * 13. 关闭 SSL（移除证书配置）
     *
     * @param {function} callback  回调 function({ status, msg })
     */
    function closeSsl(callback) {
        _btRequest(
            '/mod/proxy/com/close_ssl',
            { site_name: _siteName },
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
    }

    /**
     * 14. 一键申请 Let's Encrypt + 强制 HTTPS（完整流程）
     *
     * 依次执行：申请证书 → 上传证书 → 开启强制跳转
     *
     * @param {string[]} domains           要申请的域名数组
     * @param {function} callback          回调 function({ status, step, msg })
     *   step: 'apply' | 'set_ssl' | 'force_https' | 'done' | 'failed'
     */
    function setupSslWithLetsEncrypt(domains, callback) {
        applyLetsEncryptCert(domains, function (res) {
            if (!res.status) {
                if (callback) callback({ status: false, step: 'apply', msg: res.msg });
                return;
            }

            // 申请成功后自动上传证书
            var cert = res.cert;
            var rootCert = (res.data && res.data.root) || '';
            var fullCert = cert + (rootCert ? '\n' + rootCert : '');
            var privateKey = res.privateKey;

            setSslCertificate(privateKey, fullCert, function (sslRes) {
                if (!sslRes.status) {
                    if (callback) callback({ status: false, step: 'set_ssl', msg: sslRes.msg });
                    return;
                }

                // 证书上传成功后开启强制 HTTPS
                setForceHttps(true, function (httpsRes) {
                    if (!httpsRes.status) {
                        if (callback) callback({ status: false, step: 'force_https', msg: httpsRes.msg });
                        return;
                    }
                    if (callback) callback({ status: true, step: 'done', msg: 'SSL 配置完成，强制 HTTPS 已开启' });
                });
            });
        });
    }

    /**
     * 15. 添加绑定域名
     *
     * 通过宝塔 /mod/proxy/com/add_domain 接口，
     * 将一个或多个域名绑定到已有的代理站点。
     *
     * @param {string}   domain     要添加的域名（如 'stl.example.com'）
     * @param {function} callback   回调 function({ status, results, msg })
     *   results: [{ name, status, msg }] 数组
     */
    function addDomain(domain, callback) {
        if (!domain || !domain.trim()) {
            if (callback) callback(_fail('域名不能为空'));
            return;
        }
        getProxyInfo(function (info) {
            if (!info.status || !info.exists) {
                if (callback) callback(_fail('代理不存在，请先开启反向代理'));
                return;
            }
            _btRequest(
                '/mod/proxy/com/add_domain',
                {
                    id: info.proxy.id,
                    site_name: _siteName,
                    domains: domain.trim()
                },
                function (rdata) {
                    if (!rdata || !rdata.status) {
                        if (callback) callback({
                            status: false,
                            msg: (rdata && rdata.msg) || '添加域名失败',
                            results: (rdata && rdata.data) || []
                        });
                        return;
                    }
                    if (callback) callback({
                        status: true,
                        msg: '域名添加完成',
                        results: (rdata && rdata.data) || []
                    });
                },
                function (msg) {
                    if (callback) callback(_fail(msg));
                }
            );
        });
    }

    /**
     * 16. 删除绑定域名
     *
     * @param {string}   domain     要删除的域名
     * @param {function} callback   回调 function({ status, msg })
     */
    function delDomain(domain, callback) {
        if (!domain || !domain.trim()) {
            if (callback) callback(_fail('域名不能为空'));
            return;
        }
        getProxyInfo(function (info) {
            if (!info.status || !info.exists) {
                if (callback) callback(_fail('代理不存在'));
                return;
            }
            _btRequest(
                '/mod/proxy/com/del_domain',
                {
                    id: info.proxy.id,
                    site_name: _siteName,
                    domain: domain.trim(),
                    port: 80
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
     * 17. 获取已绑定的域名列表
     *
     * @param {function} callback  回调 function({ status, domains, https_port, msg })
     *   domains: [{ id, pid, name, port, addtime, cn_name, healthy }] 数组
     */
    function getDomainList(callback) {
        getProxyInfo(function (info) {
            if (!info.status || !info.exists) {
                if (callback) callback({ status: true, domains: [], https_port: '', msg: '代理不存在' });
                return;
            }
            _btRequest(
                '/mod/proxy/com/get_domain_list',
                {
                    site_name: _siteName,
                    id: info.proxy.id
                },
                function (rdata) {
                    if (!rdata || !rdata.status) {
                        if (callback) callback(_fail((rdata && rdata.msg) || '获取域名列表失败'));
                        return;
                    }
                    var domainList = (rdata.data && rdata.data.domain_list) || [];
                    if (callback) callback({
                        status: true,
                        domains: domainList,
                        https_port: (rdata.data && rdata.data.https_port) || '',
                        msg: 'OK'
                    });
                },
                function (msg) {
                    if (callback) callback(_fail(msg));
                }
            );
        });
    }

    // ======== 对外暴露 ========

    return {
        // --- 反向代理基础 ---

        /** Nginx 是否安装 + 运行状态检测 */
        isNginxInstalled: isNginxInstalled,

        /** 获取当前酒馆代理信息（含 id / proxy_pass / ssl 等） */
        getProxyInfo: getProxyInfo,

        /** 创建反向代理（端口 + 可选 host） */
        createProxy: createProxy,

        /** 删除反向代理（自动查 id，幂等） */
        deleteProxy: deleteProxy,

        /** 直接修改反向代理配置（需代理已存在） */
        setProxyConfig: setProxyConfig,

        /** 更新反向代理目标（先删后建） */
        updateProxy: updateProxy,

        /**
         * 确保代理与指定端口同步
         * 最常用的入口：传端口即可，模块自己处理创建/更新/跳过
         */
        ensureProxy: ensureProxy,

        // --- SSL 相关 ---

        /** 获取已配置的 SSL 证书信息 */
        getSslInfo: getSslInfo,

        /** 验证证书与密钥格式是否匹配 */
        verifyCertificate: verifyCertificate,

        /** 手动上传 SSL 证书（key + cert） */
        setSslCertificate: setSslCertificate,

        /** 申请 Let's Encrypt 免费证书 */
        applyLetsEncryptCert: applyLetsEncryptCert,

        /** 开启/关闭强制 HTTPS 跳转 */
        setForceHttps: setForceHttps,

        /** 关闭 SSL，移除证书配置 */
        closeSsl: closeSsl,

        /**
         * 一键申请 Let's Encrypt + 上传证书 + 开启强制 HTTPS
         * @param {string[]} domains  要申请的域名数组
         */
        setupSslWithLetsEncrypt: setupSslWithLetsEncrypt,

        // --- 域名绑定 ---

        /** 添加绑定域名 */
        addDomain: addDomain,

        /** 删除绑定域名 */
        delDomain: delDomain,

        /** 获取已绑定的域名列表 */
        getDomainList: getDomainList,

        // --- 站点名管理 ---

        /** 设置当前代理的站点名（即用户绑定的域名），由 ProxyModal 调用 */
        setSiteName: setSiteName
    };
})();

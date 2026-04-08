/**
 * GithubProxy 模块 - GitHub 加速管理
 *
 * 功能：
 *   - 获取公共加速地址列表（API + 静态回退）
 *   - 对全部节点进行 TCPing 延迟测试（后端执行，前端轮询日志）
 *   - 延迟结果通过 CacheUtil 持久化，页面加载自动恢复
 *   - 启用/禁用加速、选择/自定义加速地址
 *   - 持久化配置到后端 config.json
 */

var GithubProxy = (function () {

    // ── 常量 ──────────────────────────────────────────

    var PROXY_API = 'https://api.akams.cn/github';
    var DEFAULT_URL = 'https://ghfast.top/';
    var CACHE_KEY = 'GITHUB_PROXY_LATENCY';  // CacheUtil key（会自动加 STL_ 前缀）
    var CACHE_TTL = 3 * 24 * 60 * 60 * 1000;  // 缓存有效期 3 天

    /** 静态回退列表（API 不可用时兜底） */
    var FALLBACK_LIST = [
        { url: 'https://ghfast.top/',        location: '默认',  tag: '推荐' },
        { url: 'https://ghproxy.net/',       location: '备用',  tag: '备用' },
        { url: 'https://mirror.ghproxy.com/', location: '备用',  tag: '备用' },
        { url: 'https://gh.api.99988866.xyz/', location: '备用',  tag: '备用' },
        { url: 'https://gh.llkk.cc/',        location: '备用',  tag: '备用' }
    ];

    var LATENCY_FAIL = 9999; // 不可达标记
    var POLL_INTERVAL = 500; // 轮询间隔 ms

    // ── 内部状态 ──────────────────────────────────────

    var _cache = null;       // 最近一次获取的列表（含延迟）
    var _testing = false;    // 是否正在批量测试
    var _pollTimer = null;   // 轮询定时器
    var _polling = false;    // 请求锁：防止上一次轮询没回来就发下一次

    // ── 工具 ──────────────────────────────────────────

    function _report(onProgress, msg) {
        if (onProgress) onProgress(msg);
    }

    /**
     * URL 规范化：trim + 确保尾部有斜杠（用于缓存 key 和 DOM 匹配统一）
     * 因为 API 返回的 URL 可能带/不带尾部斜杠，后端 tcping 日志原样输出，
     * 如果不做统一会导致缓存查找和 DOM 属性选择器匹配失败。
     */
    function _normalizeUrl(url) {
        if (!url) return '';
        url = url.trim();
        // 去掉尾部斜杠后统一添加，保证一致
        url = url.replace(/\/+$/, '');
        if (url) url += '/';
        return url;
    }

    /**
     * 从 URL 提取域名（纯地址）
     */
    function _extractHost(url) {
        if (!url) return '';
        return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    }

    /**
     * 格式化延迟显示
     */
    function _formatLatency(ms) {
        if (ms >= LATENCY_FAIL) return '<span style="color:#d9534f;">超时</span>';
        if (ms < 100) return '<span style="color:#20a53a;">' + ms + 'ms</span>';
        if (ms < 500) return '<span style="color:#faad14;">' + ms + 'ms</span>';
        return '<span style="color:#d9534f;">' + ms + 'ms</span>';
    }

    /**
     * 解析日志行，返回 { url, latency }
     * 日志格式：TCPING (1/5) https://ghfast.top/: 123ms
     */
    function _parseLogLine(line) {
        var match = line.match(/TCPING \(\d+\/\d+\)\s+(.+?):\s+(\d+)ms/);
        if (match) {
            return { url: _normalizeUrl(match[1].trim()), latency: parseInt(match[2], 10) };
        }
        // 超时或不可达
        match = line.match(/TCPING \(\d+\/\d+\)\s+(.+?):\s+(超时|不可达)/);
        if (match) {
            return { url: _normalizeUrl(match[1].trim()), latency: LATENCY_FAIL };
        }
        return null;
    }

    // ── 延迟缓存（CacheUtil 持久化） ──────────────────

    /**
     * 从 CacheUtil 读取延迟缓存
     * 返回 { url: latency } 或 null（过期/不存在）
     */
    function _loadLatencyCache() {
        try {
            var cached = CacheUtil.localGet(CACHE_KEY, null);
            if (!cached || !cached.data || !cached.timestamp) return null;
            // 检查是否过期
            if (Date.now() - cached.timestamp > CACHE_TTL) {
                CacheUtil.localRemove(CACHE_KEY);
                return null;
            }
            return cached.data; // { url: latency, ... }
        } catch (e) {
            return null;
        }
    }

    /**
     * 写入延迟缓存到 CacheUtil
     * @param {Array} list - [{ url, latency }]
     */
    function _saveLatencyCache(list) {
        try {
            var data = {};
            list.forEach(function (item) {
                if (item.url) {
                    data[_normalizeUrl(item.url)] = item.latency;
                }
            });
            CacheUtil.localSet(CACHE_KEY, {
                data: data,
                timestamp: Date.now()
            });
        } catch (e) {
            // localStorage 写入失败（如隐私模式），忽略
        }
    }

    /**
     * 单个节点结果写入缓存（实时更新，不刷新时间戳）
     */
    function _updateLatencyCacheItem(url, latency) {
        try {
            var normUrl = _normalizeUrl(url);
            var cached = CacheUtil.localGet(CACHE_KEY, null);
            if (!cached || !cached.data) {
                cached = { data: {}, timestamp: Date.now() };
            }
            cached.data[normUrl] = latency;
            // 不刷新 timestamp，保持原始过期时间
            CacheUtil.localSet(CACHE_KEY, cached);
        } catch (e) {
            // 忽略
        }
    }

    /**
     * 将缓存的延迟数据合并到节点列表，并按延迟排序
     * 支持 normalize 容错：对 cache key 和 item url 分别做 normalize 匹配
     */
    function _mergeLatencyFromCache(list) {
        var latencyMap = _loadLatencyCache();
        if (!latencyMap) return list;

        // 构建 normalize 后的查找表（兼容旧缓存）
        var normMap = {};
        Object.keys(latencyMap).forEach(function (key) {
            normMap[_normalizeUrl(key)] = latencyMap[key];
        });

        list.forEach(function (item) {
            if (item.url) {
                var normUrl = _normalizeUrl(item.url);
                if (normMap[normUrl] !== undefined) {
                    item.latency = normMap[normUrl];
                }
            }
        });

        // 按延迟从小到大排序，未测试（null）排最后
        list.sort(function (a, b) {
            var la = (a.latency != null) ? a.latency : Infinity;
            var lb = (b.latency != null) ? b.latency : Infinity;
            return la - lb;
        });

        return list;
    }

    // ── 获取加速列表 ──────────────────────────────────

    /**
     * 获取加速地址列表（优先 API，失败回退静态列表）
     *
     * @param {function} callback - function(list)
     *   list: [{ url, location, latency, tag }]
     */
    function getProxyList(callback) {
        if (_cache) {
            callback(_cache);
            return;
        }

        _fetchFromAPI(function (apiList) {
            if (apiList && apiList.length > 0) {
                // 合并缓存延迟数据
                _mergeLatencyFromCache(apiList);
                _cache = apiList;
                callback(apiList);
                return;
            }

            _useFallback(function (fallbackList) {
                _mergeLatencyFromCache(fallbackList);
                _cache = fallbackList;
                callback(fallbackList);
            });
        });
    }

    /**
     * 从 API 获取加速列表
     */
    function _fetchFromAPI(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', PROXY_API, true);
        xhr.timeout = 10000;

        xhr.onload = function () {
            try {
                var data = JSON.parse(xhr.responseText);
                if (data && data.code === 200 && Array.isArray(data.data) && data.data.length > 0) {
                    var list = data.data.map(function (item) {
                        return {
                            url: _normalizeUrl(item.url || ''),
                            location: item.location || '',
                            latency: null, // 不用 API 的延迟，统一从缓存取
                            tag: item.tag || ''
                        };
                    });

                    // 去重
                    var seen = {};
                    list = list.filter(function (item) {
                        if (seen[item.url]) return false;
                        seen[item.url] = true;
                        return item.url;
                    });

                    // 确保 ghfast.top 在首位
                    var hasDefault = list.some(function (item) { return item.url === _normalizeUrl(DEFAULT_URL); });
                    if (!hasDefault) {
                        list.unshift({
                            url: _normalizeUrl(DEFAULT_URL),
                            location: '默认',
                            latency: null,
                            tag: '推荐'
                        });
                    }

                    callback(list);
                    return;
                }
            } catch (e) {
                // 解析失败，走回退
            }
            callback(null);
        };

        xhr.onerror = function () { callback(null); };
        xhr.ontimeout = function () { callback(null); };
        xhr.send();
    }

    /**
     * 使用静态回退列表
     */
    function _useFallback(callback) {
        var list = FALLBACK_LIST.map(function (item) {
            return {
                url: _normalizeUrl(item.url),
                location: item.location,
                latency: null,
                tag: item.tag
            };
        });
        callback(list);
    }

    // ── 延迟测试（后端 TCPing + 前端轮询日志） ────────

    /**
     * 批量测试所有节点延迟（后端 TCPing）
     *
     * @param {function} callback    - function(results) 全部测完回调
     *   results: [{ url, latency }]
     * @param {function} onItemDone  - function(result, index, total) 单个完成回调
     * @param {function} onProgress  - function(logText) 日志行回调（用于弹窗实时输出）
     */
    function testAllLatency(callback, onItemDone, onProgress) {
        if (_testing) {
            callback(_cache || []);
            return;
        }

        _testing = true;
        _polling = false;

        getProxyList(function (list) {
            var urls = list.map(function (item) { return item.url; });
            var total = urls.length;

            if (total === 0) {
                _testing = false;
                callback(list);
                return;
            }

            // 调后端开始 tcping
            request_plugin('tcping_proxies', { urls: urls.join(',') }, function (rdata) {
                if (!rdata || !rdata.status) {
                    _testing = false;
                    _report(onProgress, '启动测试失败：' + (rdata ? rdata.msg : '未知错误'));
                    callback(list);
                    return;
                }

                // 开始轮询日志
                var pos = 0;
                var doneCount = 0;

                var pollStartTime = Date.now();
                var POLL_TIMEOUT = 90000; // 前端兜底超时 90s

                _pollTimer = setInterval(function () {
                    // 请求锁：上一次轮询没回来，跳过这次
                    if (_polling) return;
                    _polling = true;

                    // 前端兜底超时保护
                    if (Date.now() - pollStartTime > POLL_TIMEOUT) {
                        clearInterval(_pollTimer);
                        _pollTimer = null;
                        _testing = false;
                        _polling = false;
                        _report(onProgress, '--- 测试超时，已强制结束 ---');
                        _saveLatencyCache(list);
                        list.sort(function (a, b) { return a.latency - b.latency; });
                        _cache = list;
                        if (callback) callback(list);
                        return;
                    }

                    request_plugin('get_tcping_log', { pos: pos }, function (logData) {
                        _polling = false; // 释放请求锁

                        if (!logData) return;

                        pos = logData.pos || pos;

                        // 有新日志行
                        if (logData.log) {
                            var lines = logData.log.split('\n');
                            lines.forEach(function (line) {
                                if (!line.trim()) return;

                                // 报告进度（原始日志行）
                                _report(onProgress, line);

                                // 解析结果
                                var parsed = _parseLogLine(line);
                                if (parsed) {
                                    doneCount++;

                                    // 更新缓存中的延迟
                                    for (var i = 0; i < list.length; i++) {
                                        if (list[i].url === parsed.url) {
                                            list[i].latency = parsed.latency;
                                            break;
                                        }
                                    }

                                    // 实时写入持久化缓存
                                    _updateLatencyCacheItem(parsed.url, parsed.latency);

                                    // 回调单个完成（实时更新表格）
                                    if (onItemDone) {
                                        onItemDone(parsed, doneCount, total);
                                    }
                                }
                            });
                        }

                        // 全部完成
                        if (logData.done) {
                            clearInterval(_pollTimer);
                            _pollTimer = null;
                            _testing = false;

                            // 持久化完整结果
                            _saveLatencyCache(list);

                            // 按延迟排序
                            list.sort(function (a, b) { return a.latency - b.latency; });
                            _cache = list;

                            _report(onProgress, '--- 测试完成 ---');
                            if (callback) callback(list);
                        }
                    });
                }, POLL_INTERVAL);
            });
        });
    }

    /**
     * 停止测试轮询
     */
    function stopTest() {
        if (_pollTimer) {
            clearInterval(_pollTimer);
            _pollTimer = null;
        }
        _testing = false;
        _polling = false;
    }

    // ── 配置读写 ──────────────────────────────────────

    /**
     * 获取当前 GitHub 代理配置
     *
     * @param {function} callback - function({ enabled, url })
     */
    function getConfig(callback) {
        request_plugin('get_github_proxy_config', {}, function (rdata) {
            if (rdata && rdata.status) {
                callback({
                    enabled: !!rdata.enabled,
                    url: rdata.url || DEFAULT_URL
                });
            } else {
                callback({
                    enabled: false,
                    url: DEFAULT_URL
                });
            }
        });
    }

    /**
     * 保存 GitHub 代理配置
     *
     * @param {boolean}  enabled
     * @param {string}   url
     * @param {function} callback - function({ status, msg })
     */
    function saveConfig(enabled, url, callback) {
        request_plugin('save_github_proxy_config', {
            enabled: enabled,
            url: url
        }, function (rdata) {
            if (callback) {
                callback(rdata || { status: false, msg: '请求失败' });
            }
        });
    }

    // ── 一键选择最佳 ──────────────────────────────────

    /**
     * 自动选择延迟最低的节点并启用
     *
     * @param {function} callback    - function({ status, msg, url, list })
     *   list: 排序后的完整节点列表（含延迟），可直接用于渲染表格
     * @param {function} onProgress  - 进度回调（日志行）
     * @param {function} onItemDone  - 单个完成回调（透传给 testAllLatency）
     */
    function autoSelectBest(callback, onProgress, onItemDone) {
        _report(onProgress, '正在测试所有节点延迟...');

        testAllLatency(
            function (list) {
                var available = list.filter(function (item) {
                    return item.latency < LATENCY_FAIL;
                });

                if (available.length === 0) {
                    _report(onProgress, '所有节点均不可达');
                    if (callback) callback({ status: false, msg: '所有节点均不可达，请检查网络环境', list: list });
                    return;
                }

                var best = available[0];
                _report(onProgress, '最佳节点: ' + best.url + ' (' + best.latency + 'ms)');

                saveConfig(true, best.url, function (rdata) {
                    if (callback) {
                        callback({
                            status: rdata.status,
                            msg: rdata.status
                                ? '已切换到 ' + best.url + ' (' + best.latency + 'ms)'
                                : (rdata.msg || '保存失败'),
                            url: best.url,
                            list: list  // 把排序后的完整列表传出去
                        });
                    }
                });
            },
            onItemDone,
            onProgress
        );
    }

    // ── 导出 ──────────────────────────────────────────

    return {
        /** 获取加速地址列表（优先 API，失败回退静态，自动合并缓存延迟） */
        getProxyList: getProxyList,

        /** 批量测试所有节点延迟（后端 TCPing，前端轮询日志） */
        testAllLatency: testAllLatency,

        /** 停止测试 */
        stopTest: stopTest,

        /** 获取当前配置 */
        getConfig: getConfig,

        /** 保存配置 */
        saveConfig: saveConfig,

        /** 一键选择最佳节点并启用 */
        autoSelectBest: autoSelectBest,

        /** 格式化延迟显示 */
        formatLatency: _formatLatency,

        /** 从 URL 提取域名 */
        extractHost: _extractHost,

        /** URL 规范化（统一尾部斜杠，用于缓存 key 和 DOM 匹配） */
        normalizeUrl: _normalizeUrl,

        /** 清除列表缓存（强制下次重新从 API 获取） */
        clearCache: function () { _cache = null; },

        /** 清除延迟缓存（localStorage） */
        clearLatencyCache: function () { CacheUtil.localRemove(CACHE_KEY); },

        /** 默认加速地址 */
        DEFAULT_URL: DEFAULT_URL,

        /** 不可达标记 */
        LATENCY_FAIL: LATENCY_FAIL
    };

})();

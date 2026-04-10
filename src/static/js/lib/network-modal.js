/**
 * NetworkModal - 访问酒馆弹窗
 *
 * 展示 QR 码和可点击地址，方便移动端扫码访问。
 * 根据当前访问模式（局域网/公网）从后端获取对应的 IP 地址。
 * 反向代理开启时额外显示域名入口。
 */

var NetworkModal = (function () {
    "use strict";

    // ======== DOM 引用 ========

    var $modal;
    var _layerIdx = null;

    // ======== 内部状态 ========

    var _port = '';
    var _ipv4 = '';
    var _ipv6 = '';
    var _proxyUrl = '';
    var _interfaces = [];

    // ======== 弹窗 HTML ========

    var MODAL_HTML =
        '<div class="stl-nm-modal" id="stl-nm-modal">' +

            // 头部
            '<div class="stl-nm-header">' +
                '<div class="stl-nm-title stl-nm-drag-handle">' +
                    '<i class="bi bi-globe" id="nm-mode-icon"></i> ' +
                    '<span id="nm-title-text">访问酒馆</span>' +
                '</div>' +
                '<button class="stl-nm-close" onclick="NetworkModal.close()"><i class="bi bi-x-lg"></i></button>' +
            '</div>' +

            // 端口信息栏
            '<div class="stl-nm-port">' +
                '<div class="stl-nm-port-label"><i class="bi bi-hdd-stack"></i> 监听端口</div>' +
                '<code id="nm-port">8000</code>' +
                '<button class="stl-nm-btn-refresh" onclick="NetworkModal.refresh()" title="刷新"><i class="bi bi-arrow-clockwise"></i></button>' +
            '</div>' +

            // 局域网模式：网卡选择器
            '<div class="stl-nm-section" id="nm-iface-section" style="display:none;">' +
                '<div class="stl-nm-section-title"><i class="bi bi-diagram-3"></i> 网络接口</div>' +
                '<select class="stl-nm-select" id="nm-iface-select" onchange="NetworkModal.onInterfaceChange()"></select>' +
            '</div>' +

            // 加载状态
            '<div class="stl-nm-loading" id="nm-loading">' +
                '<div class="stl-nm-spinner"></div>' +
                '<span>正在获取网络地址...</span>' +
            '</div>' +

            // 地址卡片区域（动态渲染）
            '<div class="stl-nm-cards" id="nm-cards" style="display:none;"></div>' +

            // 底部提示
            '<div class="stl-nm-footer">' +
                '<i class="bi bi-qr-code"></i> ' +
                '<span>使用手机扫码即可访问酒馆</span>' +
            '</div>' +

        '</div>';

    // ======== 工具方法 ========

    function _buildUrl(ip) {
        var host = ip.indexOf(':') !== -1 ? '[' + ip + ']' : ip;
        return 'http://' + host + ':' + _port;
    }

    function _updateTitle(mode) {
        if (mode === 'lan') {
            $('#nm-title-text').text('局域网访问');
            $('#nm-mode-icon').attr('class', 'bi bi-wifi');
        } else {
            $('#nm-title-text').text('公网访问');
            $('#nm-mode-icon').attr('class', 'bi bi-globe');
        }
    }

    function _copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                layer.msg('已复制到剪贴板', { icon: 1 });
            }).catch(function () {
                _fallbackCopy(text);
            });
        } else {
            _fallbackCopy(text);
        }
    }

    function _fallbackCopy(text) {
        var $tmp = $('<textarea>').val(text).css({
            position: 'fixed', left: '-9999px', opacity: '0'
        }).appendTo('body');
        $tmp[0].select();
        try {
            document.execCommand('copy');
            layer.msg('已复制到剪贴板', { icon: 1 });
        } catch (e) {
            layer.msg('复制失败', { icon: 2 });
        }
        $tmp.remove();
    }

    function _escapeHtml(text) {
        if (!text) return '';
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    // ======== 数据获取 ========

    function _fetchData() {
        // 先获取端口
        request_plugin('get_st_listen_port', {}, function (portRes) {
            _port = (portRes.status && portRes.port) ? portRes.port : '8000';
            $('#nm-port').text(_port);

            var mode = localStorage.getItem('stl_access_mode') || 'wan';
            _updateTitle(mode);

            // 显示加载
            $('#nm-loading').show();
            $('#nm-cards').hide();
            $('#nm-iface-section').hide();

            // 并行获取反向代理状态 + IP 地址
            _fetchProxyAndIp(mode);
        });
    }

    function _fetchProxyAndIp(mode) {
        var done = { proxy: false, ip: false };
        var result = { proxyInfo: null, ipv4: '', ipv6: '', interfaces: [] };

        function tryRender() {
            if (done.proxy && done.ip) {
                _renderCards(result.proxyInfo, result.ipv4, result.ipv6, result.interfaces);
            }
        }

        // 获取反向代理状态
        Nginx.getProxyInfo(function (proxyInfo) {
            result.proxyInfo = proxyInfo;
            done.proxy = true;
            tryRender();
        });

        // 获取 IP 地址
        if (mode === 'lan') {
            _fetchLanIps(function (ipv4, ipv6, interfaces) {
                result.ipv4 = ipv4;
                result.ipv6 = ipv6;
                result.interfaces = interfaces;
                done.ip = true;
                tryRender();
            });
        } else {
            _fetchPublicIps(function (ipv4, ipv6) {
                result.ipv4 = ipv4;
                result.ipv6 = ipv6;
                done.ip = true;
                tryRender();
            });
        }
    }

    function _fetchPublicIps(callback) {
        request_plugin('get_public_ips', {}, function (rdata) {
            callback(
                (rdata && rdata.status && rdata.ipv4) ? rdata.ipv4 : '',
                (rdata && rdata.status && rdata.ipv6) ? rdata.ipv6 : ''
            );
        });
    }

    function _fetchLanIps(callback) {
        request_plugin('get_network_interfaces', {}, function (rdata) {
            if (!rdata || !rdata.status || !rdata.interfaces || rdata.interfaces.length === 0) {
                _fetchLanFallbackIps(callback);
                return;
            }

            _interfaces = rdata.interfaces;
            $('#nm-iface-section').show();

            var $select = $('#nm-iface-select').empty();
            var preferredIdx = 0;

            for (var i = 0; i < _interfaces.length; i++) {
                var iface = _interfaces[i];
                var label = iface.name;
                var parts = [];
                if (iface.ipv4 && iface.ipv4.length > 0) parts.push('IPv4: ' + iface.ipv4[0]);
                if (iface.ipv6 && iface.ipv6.length > 0) parts.push('IPv6: ' + iface.ipv6[0]);
                if (parts.length > 0) label += '  (' + parts.join(' | ') + ')';

                $select.append('<option value="' + i + '">' + label + '</option>');
                if (preferredIdx === 0 && iface.ipv4 && iface.ipv4.length > 0) {
                    preferredIdx = i;
                }
            }

            $select.val(preferredIdx);

            var defaultIface = _interfaces[preferredIdx];
            callback(
                (defaultIface.ipv4 && defaultIface.ipv4.length > 0) ? defaultIface.ipv4[0] : '',
                (defaultIface.ipv6 && defaultIface.ipv6.length > 0) ? defaultIface.ipv6[0] : '',
                _interfaces
            );
        });
    }

    function _fetchLanFallbackIps(callback) {
        request_plugin('get_access_url', { mode: 'lan' }, function (urlData) {
            var ipv4 = '', ipv6 = '';
            if (urlData && urlData.status && urlData.url) {
                var match = urlData.url.match(/http:\/\/([^:]+):(\d+)/);
                if (match) {
                    ipv4 = match[1].indexOf(':') === -1 ? match[1] : '';
                    ipv6 = match[1].indexOf(':') !== -1 ? match[1] : '';
                }
            }
            callback(ipv4, ipv6, []);
        });
    }

    // ======== 卡片渲染 ========

    /**
     * 统一入口：拿到代理信息后决定要不要再异步拿域名
     */
    function _renderCards(proxyInfo, ipv4, ipv6, interfaces) {
        var hasProxy = proxyInfo && proxyInfo.status && proxyInfo.exists;

        if (hasProxy) {
            // 再异步拿域名列表
            Nginx.getDomainList(function (domData) {
                var domain = '';
                var protocol = 'http';
                if (domData && domData.status && domData.domains && domData.domains.length > 0) {
                    domain = domData.domains[0].name;
                    protocol = (proxyInfo.ssl) ? 'https' : 'http';
                }
                _proxyUrl = domain ? (protocol + '://' + domain) : '';
                _doRender(ipv4, ipv6);
            });
        } else {
            _proxyUrl = '';
            _doRender(ipv4, ipv6);
        }
    }

    /**
     * 实际渲染：根据 _ipv4 / _ipv6 / _proxyUrl 动态生成卡片
     *
     * 布局规则：
     * - 有域名 + 有 IPv6 → [域名] [IPv6]（域名优先，占左位）
     * - 有域名 + 无 IPv6 → [IPv4] [域名]（IPv6 位置被域名替代）
     * - 无域名 → [IPv4] [IPv6]（不可用灰显）
     */
    function _doRender(ipv4, ipv6) {
        _ipv4 = ipv4;
        _ipv6 = ipv6;

        var cards = [];

        if (_proxyUrl) {
            // 有域名
            if (ipv6) {
                cards.push(_makeProxyCard(_proxyUrl));
                cards.push(_makeIpCard('IPv6', ipv6, 'v6'));
            } else {
                if (ipv4) cards.push(_makeIpCard('IPv4', ipv4, 'v4'));
                cards.push(_makeProxyCard(_proxyUrl));
            }
        } else {
            // 无域名：始终显示 IPv4 + IPv6
            cards.push(ipv4 ? _makeIpCard('IPv4', ipv4, 'v4') : _makeEmptyCard('IPv4'));
            cards.push(ipv6 ? _makeIpCard('IPv6', ipv6, 'v6') : _makeEmptyCard('IPv6'));
        }

        $('#nm-cards').html(cards.join(''));
        $('#nm-loading').hide();
        $('#nm-cards').show();

        // QR 码需要 DOM 先存在
        if (ipv4) QRCodeUtil.render($('#nm-qr4'), _buildUrl(ipv4));
        if (ipv6) QRCodeUtil.render($('#nm-qr6'), _buildUrl(ipv6));
        if (_proxyUrl) QRCodeUtil.render($('#nm-qr-proxy'), _proxyUrl);

        // 内容渲染完成后，重新计算弹窗高度
        if (_layerIdx !== null) {
            // 延迟执行，确保 DOM 已完全渲染
            setTimeout(function() {
                // 使用 layer.style 重新设置高度为 auto
                layer.style(_layerIdx, {
                    height: 'auto'
                });
            }, 150);
        }
    }

    /**
     * IP 地址卡片
     */
    function _makeIpCard(label, ip, type) {
        var url = _buildUrl(ip);
        var qrId = type === 'v4' ? '4' : '6';
        return '<div class="stl-nm-card">' +
            '<div class="stl-nm-card-label">' + label + '</div>' +
            '<div class="stl-nm-qr-wrap">' +
                '<div class="stl-nm-qr" id="nm-qr' + qrId + '"></div>' +
            '</div>' +
            '<div class="stl-nm-card-url">' + _escapeHtml(url) + '</div>' +
            '<div class="stl-nm-card-actions">' +
                '<button class="stl-nm-btn-sm" onclick="NetworkModal.copyUrl(\'' + type + '\')">' +
                    '<i class="bi bi-clipboard"></i> 复制' +
                '</button>' +
                '<button class="stl-nm-btn-sm stl-nm-btn-sm-primary" onclick="NetworkModal.openUrl(\'' + type + '\')">' +
                    '<i class="bi bi-box-arrow-up-right"></i> 打开' +
                '</button>' +
            '</div>' +
        '</div>';
    }

    /**
     * 域名卡片（蓝色主题）
     */
    function _makeProxyCard(url) {
        return '<div class="stl-nm-card stl-nm-card-proxy">' +
            '<div class="stl-nm-card-label"><i class="bi bi-shield-lock"></i> 域名访问</div>' +
            '<div class="stl-nm-qr-wrap">' +
                '<div class="stl-nm-qr" id="nm-qr-proxy"></div>' +
            '</div>' +
            '<div class="stl-nm-card-url">' + _escapeHtml(url) + '</div>' +
            '<div class="stl-nm-card-actions">' +
                '<button class="stl-nm-btn-sm" onclick="NetworkModal.copyProxyUrl()">' +
                    '<i class="bi bi-clipboard"></i> 复制' +
                '</button>' +
                '<button class="stl-nm-btn-sm stl-nm-btn-sm-primary" onclick="NetworkModal.openProxyUrl()">' +
                    '<i class="bi bi-box-arrow-up-right"></i> 打开' +
                '</button>' +
            '</div>' +
        '</div>';
    }

    /**
     * 不可用卡片
     */
    function _makeEmptyCard(label) {
        return '<div class="stl-nm-card stl-nm-card-empty">' +
            '<div class="stl-nm-card-label">' + label + '</div>' +
            '<div class="stl-nm-qr-wrap">' +
                '<div class="stl-nm-no-ip">不可用</div>' +
            '</div>' +
            '<div class="stl-nm-card-url">&nbsp;</div>' +
            '<div class="stl-nm-card-actions">&nbsp;</div>' +
        '</div>';
    }

    // ======== 公开方法 ========

    function open() {
        if (_layerIdx !== null) {
            _fetchData();
            return;
        }

        // 先从后端缓存读取 proxy_site_name，确保 Nginx._siteName 已初始化
        // 否则 getProxyInfo 的 _isOurProxy 可能匹配不到条目
        request_plugin('get_config', { key: 'proxy_site_name' }, function (cfgRes) {
            var cachedDomain = (cfgRes && cfgRes.status && cfgRes.value) || '';
            if (cachedDomain) {
                Nginx.setSiteName(cachedDomain);
            }
            _doOpen();
        });
    }

    function _doOpen() {
        _layerIdx = layer.open({
            type: 1,
            title: false,
            closeBtn: 0,
            shade: 0.3,
            shadeClose: true,
            area: ['580px', '520px'],
            move: '.stl-nm-drag-handle',
            content: MODAL_HTML,
            success: function (layero, idx) {
                _layerIdx = idx;
                $modal = layero.find('.stl-nm-modal');
                _fetchData();
            },
            end: function () {
                _layerIdx = null;
                _ipv4 = '';
                _ipv6 = '';
                _proxyUrl = '';
                _interfaces = [];
            }
        });
    }

    function close() {
        if (_layerIdx !== null) {
            layer.close(_layerIdx);
            _layerIdx = null;
        }
    }

    function refresh() {
        _fetchData();
    }

    function onInterfaceChange() {
        var idx = parseInt($('#nm-iface-select').val(), 10);
        if (isNaN(idx) || !_interfaces[idx]) return;

        var iface = _interfaces[idx];
        var ipv4 = (iface.ipv4 && iface.ipv4.length > 0) ? iface.ipv4[0] : '';
        var ipv6 = (iface.ipv6 && iface.ipv6.length > 0) ? iface.ipv6[0] : '';
        _doRender(ipv4, ipv6);
    }

    function copyUrl(type) {
        var ip = (type === 'v4') ? _ipv4 : _ipv6;
        if (!ip) { layer.msg('无可用地址', { icon: 2 }); return; }
        _copyToClipboard(_buildUrl(ip));
    }

    function openUrl(type) {
        var ip = (type === 'v4') ? _ipv4 : _ipv6;
        if (!ip) { layer.msg('无可用地址', { icon: 2 }); return; }
        window.open(_buildUrl(ip), '_blank');
    }

    function copyProxyUrl() {
        if (!_proxyUrl) { layer.msg('无可用域名', { icon: 2 }); return; }
        _copyToClipboard(_proxyUrl);
    }

    function openProxyUrl() {
        if (!_proxyUrl) { layer.msg('无可用域名', { icon: 2 }); return; }
        window.open(_proxyUrl, '_blank');
    }

    // ======== 对外暴露 ========

    return {
        open: open,
        close: close,
        refresh: refresh,
        onInterfaceChange: onInterfaceChange,
        copyUrl: copyUrl,
        openUrl: openUrl,
        copyProxyUrl: copyProxyUrl,
        openProxyUrl: openProxyUrl
    };
})();

window.NetworkModal = NetworkModal;

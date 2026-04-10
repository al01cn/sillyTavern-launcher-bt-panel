/**
 * 反向代理管理弹窗
 *
 * 提供基础配置（开关、域名）和 SSL 设置两个 Tab，
 * 所有操作通过 Nginx 模块完成。
 */

var ProxyModal = (function () {
    "use strict";

    // ======== DOM 引用（弹窗内元素） ========

    var $layer;        // layer DOM wrapper
    var $modal;        // .stl-proxy-modal

    var $tabBasic;     // 基础配置 Tab 按钮
    var $tabSsl;       // SSL 设置 Tab 按钮
    var $panelBasic;   // 基础配置面板
    var $panelSsl;     // SSL 面板

    var $toggle;       // 反向代理开关
    var $tavernUrl;    // 酒馆访问地址（只读）
    var $domainInput;  // 域名绑定输入框
    var $domainSaveBtn; // 保存域名按钮

    var $sslStatus;    // SSL 状态文字
    var $sslTypeBtns;  // 手动上传 / 申请证书 单选按钮组
    var $manualPanel;  // 手动上传面板
    var $lePanel;      // Let's Encrypt 面板
    var $certInput;   // 证书文件 input
    var $keyInput;    // 密钥文件 input
    var $certText;    // 证书内容 textarea
    var $keyText;     // 密钥内容 textarea
    var $leDomainInput; // Let's Encrypt 域名输入
    var $leApplyBtn;   // 申请证书按钮

    var _currentTavernPort = null;   // 当前酒馆端口
    var _savedDomain = '';            // 保存过的域名（用于判断是否有变更）
    var _layerIdx = null;             // layer.open 返回的 index，用于精准关闭

    // ======== 弹窗渲染 HTML ========

    var MODAL_HTML =
        '<div class="stl-proxy-modal" id="stl-proxy-modal">' +

            // 头部
            '<div class="stl-pm-header">' +
                '<div class="stl-pm-title stl-pm-drag-handle">' +
                    '<i class="bi bi-shield-lock"></i> 反向代理管理' +
                '</div>' +
                '<button class="stl-pm-close" onclick="ProxyModal.close()"><i class="bi bi-x-lg"></i></button>' +
            '</div>' +

            // Nginx 未安装提示
            '<div class="stl-pm-alert stl-pm-alert-warning" id="pm-alert-nginx" style="display:none;">' +
                '<i class="bi bi-exclamation-triangle"></i>' +
                '<span>Nginx 未安装或未运行，无法使用反向代理功能</span>' +
            '</div>' +

            // Tab 切换
            '<div class="stl-pm-tabs">' +
                '<button class="stl-pm-tab active" data-tab="basic" onclick="ProxyModal.switchTab(\'basic\')">基础配置</button>' +
                '<button class="stl-pm-tab" data-tab="ssl" onclick="ProxyModal.switchTab(\'ssl\')">SSL 设置</button>' +
            '</div>' +

            // 基础配置面板
            '<div class="stl-pm-panel active" id="pm-panel-basic">' +
                '<div class="stl-pm-section">' +
                    '<div class="stl-pm-row">' +
                        '<label class="stl-pm-label">反向代理</label>' +
                        '<div class="stl-pm-toggle-wrap">' +
                            '<label class="stl-pm-toggle">' +
                                '<input type="checkbox" id="pm-proxy-toggle" onchange="ProxyModal.onToggleChange()">' +
                                '<span class="stl-pm-toggle-slider"></span>' +
                            '</label>' +
                            '<span class="stl-pm-toggle-text" id="pm-toggle-text">关闭</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="stl-pm-section" id="pm-basic-proxy-section">' +
                    '<div class="stl-pm-section-title"><i class="bi bi-link-45deg"></i> 代理配置</div>' +

                    '<div class="stl-pm-field">' +
                        '<label class="stl-pm-field-label">酒馆访问地址</label>' +
                        '<div class="stl-pm-input-group">' +
                            '<input type="text" class="stl-pm-input stl-pm-input-readonly" id="pm-tavern-url" readonly placeholder="获取中...">' +
                            '<button class="stl-pm-btn stl-pm-btn-outline btn-bt-sm" onclick="ProxyModal.refreshTavernUrl()" title="刷新获取">' +
                                '<i class="bi bi-arrow-clockwise"></i>' +
                            '</button>' +
                        '</div>' +
                        '<div class="stl-pm-help">由系统自动检测当前酒馆监听端口，不可编辑</div>' +
                    '</div>' +

                    '<div class="stl-pm-field">' +
                        '<label class="stl-pm-field-label">域名绑定</label>' +
                        '<div class="stl-pm-input-group">' +
                            '<input type="text" class="stl-pm-input" id="pm-domain-input" placeholder="例如：stl.example.com" ' +
                                'oninput="ProxyModal.onDomainInput()">' +
                            '<button class="stl-pm-btn btn-bt btn-bt-sm" id="pm-save-domain-btn" onclick="ProxyModal.saveDomain()" disabled>' +
                                '保存' +
                            '</button>' +
                        '</div>' +
                        '<div class="stl-pm-help">将域名绑定到反向代理站点，留空则仅使用 IP 访问</div>' +
                    '</div>' +
                '</div>' +

                '<div class="stl-pm-footer">' +
                    '<button class="stl-pm-btn btn-bt" id="pm-apply-basic-btn" onclick="ProxyModal.applyBasic()">' +
                        '应用配置' +
                    '</button>' +
                '</div>' +
            '</div>' +

            // SSL 面板
            '<div class="stl-pm-panel" id="pm-panel-ssl">' +
                '<div class="stl-pm-section">' +
                    '<div class="stl-pm-section-title"><i class="bi bi-lock"></i> 当前 SSL 状态</div>' +
                    '<div class="stl-pm-ssl-status" id="pm-ssl-status-text">' +
                        '<span class="stl-pm-loading"><i class="bi bi-hourglass-split"></i> 检测中...</span>' +
                    '</div>' +
                '</div>' +

                '<div class="stl-pm-section">' +
                    '<div class="stl-pm-section-title"><i class="bi bi-upload"></i> 配置方式</div>' +

                    '<div class="stl-pm-ssl-type-btns">' +
                        '<button class="stl-pm-ssl-type-btn active" data-type="manual" onclick="ProxyModal.switchSslType(\'manual\')">' +
                            '<i class="bi bi-file-earmark-text"></i> 手动上传' +
                        '</button>' +
                        '<button class="stl-pm-ssl-type-btn" data-type="letsencrypt" onclick="ProxyModal.switchSslType(\'letsencrypt\')">' +
                            '<i class="bi bi-magic"></i> 申请免费证书' +
                        '</button>' +
                    '</div>' +

                    // 手动上传面板
                    '<div class="stl-pm-ssl-manual" id="pm-ssl-manual">' +
                        // 左右对称布局：证书 | 密钥
                        '<div class="stl-pm-ssl-cols">' +
                            // 左侧：证书
                            '<div class="stl-pm-ssl-col">' +
                                '<div class="stl-pm-field-label" style="margin-bottom:6px;">证书（.crt / .pem）</div>' +
                                '<div class="stl-pm-drop-zone" id="pm-cert-drop" ' +
                                    'ondragover="ProxyModal._onDropOver(event, \'cert\')" ' +
                                    'ondragleave="ProxyModal._onDropLeave(event, \'cert\')" ' +
                                    'ondrop="ProxyModal._onDrop(event, \'cert\')" ' +
                                    'onclick="ProxyModal.browseCert()">' +
                                    '<i class="bi bi-file-earmark-arrow-up" style="font-size:24px;opacity:.4;margin-bottom:4px;"></i><br>' +
                                    '<span id="pm-cert-filename">拖拽 .crt / .pem 到此处<br>或点击选择文件</span>' +
                                '</div>' +
                                '<input type="file" id="pm-cert-file" accept=".crt,.pem,.cer,.cert" style="display:none" onchange="ProxyModal.onCertFileChange(this)">' +
                                '<textarea class="stl-pm-textarea" id="pm-cert-text" ' +
                                    'placeholder="-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----" ' +
                                    'rows="6" style="margin-top:8px;resize:vertical;font-size:11px;" ' +
                                    'oninput="ProxyModal.onManualInput()"></textarea>' +
                            '</div>' +

                            // 右侧：密钥
                            '<div class="stl-pm-ssl-col">' +
                                '<div class="stl-pm-field-label" style="margin-bottom:6px;">密钥（.key）</div>' +
                                '<div class="stl-pm-drop-zone" id="pm-key-drop" ' +
                                    'ondragover="ProxyModal._onDropOver(event, \'key\')" ' +
                                    'ondragleave="ProxyModal._onDropLeave(event, \'key\')" ' +
                                    'ondrop="ProxyModal._onDrop(event, \'key\')" ' +
                                    'onclick="ProxyModal.browseKey()">' +
                                    '<i class="bi bi-file-earmark-lock-arrow-up" style="font-size:24px;opacity:.4;margin-bottom:4px;"></i><br>' +
                                    '<span id="pm-key-filename">拖拽 .key 文件到此处<br>或点击选择文件</span>' +
                                '</div>' +
                                '<input type="file" id="pm-key-file" accept=".key" style="display:none" onchange="ProxyModal.onKeyFileChange(this)">' +
                                '<textarea class="stl-pm-textarea" id="pm-key-text" ' +
                                    'placeholder="-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----" ' +
                                    'rows="6" style="margin-top:8px;resize:vertical;font-size:11px;" ' +
                                    'oninput="ProxyModal.onManualInput()"></textarea>' +
                            '</div>' +
                        '</div>' +

                        '<div class="stl-pm-upload-actions" style="margin-top:12px;">' +
                            '<button class="stl-pm-btn btn-bt" id="pm-upload-cert-btn" onclick="ProxyModal.uploadCert()" disabled>' +
                                '<i class="bi bi-upload"></i> 上传并启用 SSL' +
                            '</button>' +
                        '</div>' +
                    '</div>' +

                    // Let's Encrypt 面板
                    '<div class="stl-pm-ssl-le" id="pm-ssl-le" style="display:none;">' +
                        '<div class="stl-pm-alert stl-pm-alert-info">' +
                            '<i class="bi bi-info-circle"></i>' +
                            '<span>Let\'s Encrypt 是免费的自动证书颁发机构。证书有效期 90 天，到期前自动续期。</span>' +
                        '</div>' +

                        '<div class="stl-pm-field">' +
                            '<label class="stl-pm-field-label">申请域名（需已解析到当前服务器）</label>' +
                            '<input type="text" class="stl-pm-input" id="pm-le-domain" ' +
                                'placeholder="例如：stl.example.com（支持多域名，用英文逗号分隔）">' +
                            '<div class="stl-pm-help">域名必须已经解析到本服务器 IP，且防火墙/安全组已开放 80 端口</div>' +
                        '</div>' +

                        '<div class="stl-pm-upload-actions">' +
                            '<button class="stl-pm-btn btn-bt" id="pm-le-apply-btn" onclick="ProxyModal.applyLetsEncrypt()">' +
                                '<i class="bi bi-magic"></i> 申请并启用证书' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="stl-pm-footer">' +
                    '<button class="stl-pm-btn btn-bt-danger btn-bt-sm" id="pm-close-ssl-btn" onclick="ProxyModal.closeSsl()" style="display:none;">' +
                        '<i class="bi bi-x-circle"></i> 关闭 SSL' +
                    '</button>' +
                '</div>' +
            '</div>' +

        '</div>';

    // ======== 工具方法 ========

    /**
     * 显示加载中状态的按钮
     */
    function setBtnLoading($btn, text, loading) {
        if (loading) {
            $btn.data('orig-text', $btn.html());
            $btn.prop('disabled', true).html('<span class="stl-pm-spin"></span> ' + text + '...');
        } else {
            var orig = $btn.data('orig-text');
            if (orig) $btn.html(orig);
            $btn.prop('disabled', false);
        }
    }

    /**
     * 获取当前酒馆访问地址（内部调用）
     * cb: function(url, port)
     */
    function getTavernUrl(cb) {
        // 从酒馆 config.yaml 读端口，固定 host 为 127.0.0.1
        request_plugin('get_tavern_config', {}, function (res) {
            var port = '8000';
            if (res && res.status && res.config) {
                port = res.config.server?.port || res.config.port || '8000';
            }
            _currentTavernPort = port;
            cb('http://127.0.0.1:' + port, port);
        });
    }

    // ======== Tab 切换 ========

    function switchTab(tab) {
        $tabBasic.toggleClass('active', tab === 'basic');
        $tabSsl.toggleClass('active', tab === 'ssl');
        $panelBasic.toggleClass('active', tab === 'basic');
        $panelSsl.toggleClass('active', tab === 'ssl');

        if (tab === 'ssl') {
            loadSslStatus();
        }
    }

    // ======== 基础配置逻辑 ========

    function onToggleChange() {
        var enabled = $toggle.prop('checked');
        $toggle.closest('.stl-pm-toggle-wrap').find('.stl-pm-toggle-text')
            .text(enabled ? '开启' : '关闭');
        $basicProxySection().toggle(enabled);
        $basicProxySection().find('input, button').prop('disabled', !enabled);
    }

    function onDomainInput() {
        var val = $domainInput.val().trim();
        var changed = val !== _savedDomain;
        $domainSaveBtn.prop('disabled', !changed);
    }

    /**
     * 保存域名：调用宝塔 add_domain 接口绑定域名
     * 域名作为反向代理的主域名，代理站点名也使用该域名。
     */
    function saveDomain() {
        var domain = $domainInput.val().trim();
        if (!domain) {
            layer.msg('请输入要绑定的域名', { icon: 2 });
            return;
        }
        if (domain === _savedDomain) return;

        var btn = $domainSaveBtn;
        setBtnLoading(btn, '保存域名', true);

        // 调用宝塔 add_domain API
        Nginx.addDomain(domain, function (rdata) {
            setBtnLoading(btn, '保存域名', false);
            if (rdata && rdata.status) {
                _savedDomain = domain;
                $domainSaveBtn.prop('disabled', true);
                // 同时更新代理的 site_name 为当前域名
                Nginx.setProxyConfig({
                    port: _currentTavernPort,
                    proxyHost: '$http_host'
                }, function (updateRes) {
                    // 不影响主流程，只提示域名绑定结果
                    layer.msg('域名 ' + domain + ' 绑定成功', { icon: 1 });
                });
            } else {
                // 展示每个域名的添加结果
                var msg = (rdata && rdata.msg) || '添加失败';
                if (rdata && rdata.results && rdata.results.length) {
                    var failed = rdata.results.filter(function (r) { return !r.status; });
                    if (failed.length > 0) {
                        msg = failed[0].msg || msg;
                    }
                }
                layer.msg(msg, { icon: 2 });
            }
        });
    }

    function refreshTavernUrl() {
        $tavernUrl.val('获取中...');
        getTavernUrl(function (url) {
            $tavernUrl.val(url);
        });
    }

    /**
     * 同步域名：将当前域名列表调整为期望的列表
     * newDomains: string[] 要保留的域名数组
     * cb: 同步完成后回调
     */
    function syncDomains(newDomains, cb) {
        Nginx.getDomainList(function (res) {
            if (!res.status) {
                if (cb) cb();
                return;
            }
            var current = res.domains.map(function (d) { return d.name; });

            // 找出需要删除的（存在于当前但不在新列表中）
            var toDelete = current.filter(function (d) { return newDomains.indexOf(d) === -1; });
            // 找出需要添加的（存在于新列表但不在当前列表中）
            var toAdd = newDomains.filter(function (d) { return current.indexOf(d) === -1; });

            var total = toDelete.length + toAdd.length;
            if (total === 0) {
                if (cb) cb();
                return;
            }

            var done = 0;
            function checkDone() {
                done++;
                if (done >= total && cb) cb();
            }

            toDelete.forEach(function (domain) {
                Nginx.delDomain(domain, checkDone);
            });
            toAdd.forEach(function (domain) {
                Nginx.addDomain(domain, checkDone);
            });
        });
    }

    function applyBasic() {
        var enabled = $toggle.prop('checked');
        var btn = $('#pm-apply-basic-btn');

        if (!enabled) {
            // 关闭代理
            setBtnLoading(btn, '应用配置', true);
            Nginx.deleteProxy(function (res) {
                setBtnLoading(btn, '应用配置', false);
                if (res.status) {
                    layer.msg('反向代理已关闭', { icon: 1 });
                } else {
                    layer.msg(res.msg || '操作失败', { icon: 2 });
                }
            });
            return;
        }

        // 开启/更新代理
        setBtnLoading(btn, '应用配置', true);

        getTavernUrl(function (url, port) {
            var domain = $domainInput.val().trim();

            // 先确保代理存在（createProxy 用 domains=domain 参数）
            _ensureProxyWithDomain({ port: port }, domain, function (res) {
                setBtnLoading(btn, '应用配置', false);
                if (!res.status) {
                    layer.msg(res.msg || '操作失败', { icon: 2 });
                    return;
                }

                var actionText = { created: '已创建', updated: '已更新', exists: '已是最新' };
                layer.msg('反向代理 ' + (actionText[res.action] || '操作完成'), { icon: 1 });

                // 同步域名绑定（确保域名在 BT 的域名列表中）
                if (domain) {
                    syncDomains([domain], function () {
                        // 域名同步完成，不影响主提示
                    });
                }
            });
        });
    }

    /**
     * 确保代理存在，并用指定域名作为 domains 参数
     * 如果代理不存在则创建，domains 使用传入的 domain；
     * 如果已存在但端口/host 变了则更新。
     */
    function _ensureProxyWithDomain(options, domain, callback) {
        if (!options || !options.port) {
            if (callback) callback({ status: false, msg: '缺少 port 参数' });
            return;
        }
        var host = options.host || '127.0.0.1';
        var expectedPass = 'http://' + host + ':' + options.port;

        Nginx.getProxyInfo(function (info) {
            if (!info.status) {
                if (callback) callback({ status: false, action: 'failed', msg: info.msg });
                return;
            }

            if (!info.exists) {
                // 不存在 → 创建，domains = 域名（留空则用 IP 占位）
                _createProxyWithDomain({ port: options.port, host: host }, domain, function (res) {
                    if (res.status && domain) {
                        // 创建成功后保存域名到后端缓存，并更新 Nginx 模块的站点名
                        request_plugin('set_config', { key: 'proxy_site_name', value: domain }, function () {
                            Nginx.setSiteName(domain);
                        });
                    }
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

            // 端口变了 → 更新
            Nginx.setProxyConfig({ port: options.port, host: host }, function (res) {
                if (callback) callback({
                    status: res.status,
                    action: res.status ? 'updated' : 'failed',
                    msg: res.msg
                });
            });
        });
    }

    /**
     * 创建反向代理，domains 参数使用传入的 domain
     * 如果 domain 为空，则 domains 使用服务器 IP 占位
     */
    function _createProxyWithDomain(options, domain, callback) {
        if (!options || !options.port) {
            if (callback) callback({ status: false, msg: '缺少 port 参数' });
            return;
        }
        var host = options.host || '127.0.0.1';
        var proxyPass = 'http://' + host + ':' + options.port;
        // 域名作为 domains 参数；留空则使用服务器 IP
        var domains = domain || '';

        $.ajax({
            type: 'POST',
            url: '/mod/proxy/com/create',
            data: {
                remark: 'SillyTavern 反向代理服务',
                proxy_type: 'http',
                proxy_pass: proxyPass,
                domains: domains,
                proxy_host: '$http_host'
            },
            timeout: 15000,
            success: function (rdata) {
                if (typeof rdata === 'string') {
                    try { rdata = JSON.parse(rdata); } catch (e) { /* ignore */ }
                }
                if (callback) callback({
                    status: !!(rdata && rdata.status),
                    msg: (rdata && rdata.msg) || '未知响应'
                });
            },
            error: function (xhr, status, err) {
                if (callback) callback({ status: false, msg: '请求宝塔接口失败：' + (err || status) });
            }
        });
    }

    // ======== SSL 逻辑 ========

    function switchSslType(type) {
        $sslTypeBtns.removeClass('active');
        $sslTypeBtns.filter('[data-type="' + type + '"]').addClass('active');
        $('#pm-ssl-manual').toggle(type === 'manual');
        $('#pm-ssl-le').toggle(type === 'letsencrypt');
    }

    function loadSslStatus() {
        $sslStatus.html('<span class="stl-pm-loading"><i class="bi bi-hourglass-split"></i> 检测中...</span>');
        $('#pm-close-ssl-btn').hide();

        Nginx.getSslInfo(function (res) {
            if (!res.status) {
                $sslStatus.html('<span class="stl-pm-ssl-badge stl-pm-ssl-badge-unknown">' +
                    '<i class="bi bi-question-circle"></i> 检测失败</span>');
                return;
            }

            if (!res.hasSsl) {
                $sslStatus.html('<span class="stl-pm-ssl-badge stl-pm-ssl-badge-none">' +
                    '<i class="bi bi-x-circle"></i> 未配置 SSL</span>');
                return;
            }

            var info = res.sslInfo;
            var subject = (info.cert_data && info.cert_data.subject) ?
                info.cert_data.subject.replace('CN=', '') : '未知';
            var expireDate = (info.cert_data && info.cert_data.dnsnail) ?
                info.cert_data.dnsnail.split(';')[0] : '未知';

            $sslStatus.html(
                '<span class="stl-pm-ssl-badge stl-pm-ssl-badge-ok">' +
                    '<i class="bi bi-check-circle"></i> 已启用 SSL' +
                '</span>' +
                '<span class="stl-pm-ssl-detail">' +
                    '<b>域名：</b>' + subject + ' &nbsp; ' +
                    '<b>到期：</b>' + expireDate +
                '</span>'
            );
            $('#pm-close-ssl-btn').show();
        });
    }

    function browseCert() {
        $('#pm-cert-file').trigger('click');
    }

    function browseKey() {
        $('#pm-key-file').trigger('click');
    }

    function readFileContent(file, cb) {
        var reader = new FileReader();
        reader.onload = function (e) {
            cb(e.target.result);
        };
        reader.onerror = function () {
            cb(null);
        };
        reader.readAsText(file);
    }

    /** 拖拽悬停高亮 */
    function _onDropOver(e, type) {
        e.preventDefault();
        e.stopPropagation();
        $('#pm-' + type + '-drop').addClass('stl-pm-drop-active');
    }

    function _onDropLeave(e, type) {
        e.preventDefault();
        e.stopPropagation();
        $('#pm-' + type + '-drop').removeClass('stl-pm-drop-active');
    }

    /** 拖拽释放时读取文件 */
    function _onDrop(e, type) {
        e.preventDefault();
        e.stopPropagation();
        $('#pm-' + type + '-drop').removeClass('stl-pm-drop-active');
        var file = e.originalEvent.dataTransfer.files[0];
        if (!file) return;
        _handleFile(type, file);
    }

    /** 读取文件并填充对应 textarea */
    function _handleFile(type, file) {
        var ext = file.name.split('.').pop().toLowerCase();
        var $zone = $('#pm-' + type + '-drop');
        var $text = $('#pm-' + type + '-text');
        var $label = $zone.find('span');

        readFileContent(file, function (content) {
            if (content) {
                $text.val(content);
                $label.text(file.name);
                validateManualCert();
            } else {
                layer.msg('读取文件失败', { icon: 2 });
            }
        });
    }

    function onCertFileChange(input) {
        var file = input.files[0];
        if (!file) return;
        _handleFile('cert', file);
    }

    function onKeyFileChange(input) {
        var file = input.files[0];
        if (!file) return;
        _handleFile('key', file);
    }

    function onManualInput() {
        validateManualCert();
    }

    function validateManualCert() {
        var cert = $('#pm-cert-text').val().trim();
        var key = $('#pm-key-text').val().trim();
        var valid = cert.length > 0 && key.length > 0;
        $('#pm-upload-cert-btn').prop('disabled', !valid);
    }

    function uploadCert() {
        var cert = $('#pm-cert-text').val().trim();
        var key = $('#pm-key-text').val().trim();

        if (!cert || !key) {
            layer.msg('请先选择证书和密钥文件，或粘贴内容', { icon: 2 });
            return;
        }

        var btn = $('#pm-upload-cert-btn');
        setBtnLoading(btn, '上传并启用', true);

        Nginx.setSslCertificate(key, cert, function (res) {
            if (res.status) {
                layer.msg('SSL 证书已上传并启用', { icon: 1 });
                loadSslStatus();
            } else {
                layer.msg(res.msg || '上传失败', { icon: 2 });
            }
            setBtnLoading(btn, '上传并启用', false);
        });
    }

    function applyLetsEncrypt() {
        var domainStr = $('#pm-le-domain').val().trim();
        if (!domainStr) {
            layer.msg('请填写要申请的域名', { icon: 2 });
            return;
        }

        var domains = domainStr.split(',').map(function (d) {
            return d.trim();
        }).filter(function (d) {
            return d.length > 0;
        });

        if (!domains.length) {
            layer.msg('域名格式不正确', { icon: 2 });
            return;
        }

        // 先确保代理已开启
        var btn = $('#pm-le-apply-btn');
        setBtnLoading(btn, '申请证书', true);

        getTavernUrl(function (url, port) {
            Nginx.ensureProxy({ port: port }, function (ensureRes) {
                if (!ensureRes.status) {
                    setBtnLoading(btn, '申请证书', false);
                    layer.msg('请先开启反向代理', { icon: 2 });
                    return;
                }

                Nginx.setupSslWithLetsEncrypt(domains, function (res) {
                    setBtnLoading(btn, '申请证书', false);
                    if (res.status) {
                        layer.msg('证书申请并启用成功！', { icon: 1 });
                        loadSslStatus();
                    } else {
                        layer.msg(res.msg || '申请失败', { icon: 2 });
                    }
                });
            });
        });
    }

    function closeSsl() {
        layer.confirm('确定要关闭 SSL 吗？关闭后网站将只能通过 HTTP 访问。', {
            btn: ['确定关闭', '取消']
        }, function () {
            var btn = $('#pm-close-ssl-btn');
            setBtnLoading(btn, '关闭', true);
            Nginx.closeSsl(function (res) {
                setBtnLoading(btn, '关闭 SSL', false);
                if (res.status) {
                    layer.msg('SSL 已关闭', { icon: 1 });
                    loadSslStatus();
                } else {
                    layer.msg(res.msg || '操作失败', { icon: 2 });
                }
            });
        });
    }

    // ======== 辅助 DOM 引用 ========

    function $basicProxySection() {
        return $('#pm-basic-proxy-section');
    }

    // ======== 核心：打开/关闭弹窗 ========

    /**
     * 打开反向代理管理弹窗
     */
    function open() {
        // 先检查 Nginx 是否安装，同时读取缓存的站点域名
        request_plugin('get_config', { key: 'proxy_site_name' }, function (cfgRes) {
            var cachedDomain = (cfgRes && cfgRes.status && cfgRes.value) || '';
            Nginx.setSiteName(cachedDomain);
            _openModal(cachedDomain);
        });
    }

    function _openModal(cachedDomain) {
        Nginx.isNginxInstalled(function (nginxRes) {
            var layerIdx = layer.open({
                type: 1,
                title: false,
                closeBtn: 0,
                shade: 0.3,
                shadeClose: true,
                area: ['580px', 'auto'],
                maxHeight: 580,
                move: '.stl-pm-drag-handle',
                content: MODAL_HTML,
                success: function (layero, idx) {
                    _layerIdx = idx;
                    $layer = layero;
                    $modal = $layer.find('.stl-proxy-modal');

                    // 缓存关键 DOM 引用
                    $tabBasic = $modal.find('[data-tab="basic"]');
                    $tabSsl = $modal.find('[data-tab="ssl"]');
                    $panelBasic = $modal.find('#pm-panel-basic');
                    $panelSsl = $modal.find('#pm-panel-ssl');
                    $toggle = $modal.find('#pm-proxy-toggle');
                    $tavernUrl = $modal.find('#pm-tavern-url');
                    $domainInput = $modal.find('#pm-domain-input');
                    $domainSaveBtn = $modal.find('#pm-save-domain-btn');
                    $sslStatus = $modal.find('#pm-ssl-status-text');
                    $sslTypeBtns = $modal.find('.stl-pm-ssl-type-btn');
                    $certText = $modal.find('#pm-cert-text');
                    $keyText = $modal.find('#pm-key-text');
                    $leApplyBtn = $modal.find('#pm-le-apply-btn');

                    // Nginx 未安装时禁用
                    if (!nginxRes.installed || !nginxRes.running) {
                        $modal.find('#pm-alert-nginx').show();
                        $modal.find('#pm-proxy-toggle').prop('disabled', true);
                        $modal.find('#pm-apply-basic-btn').prop('disabled', true);
                        $modal.find('.stl-pm-ssl-type-btn').addClass('disabled').prop('disabled', true);
                    } else {
                        loadInitialData(cachedDomain);
                    }
                }
            });
        });
    }

    /**
     * 加载初始数据：代理状态 + 酒馆 URL + 域名
     * @param {string} cachedDomain  后端缓存的站点域名
     */
    function loadInitialData(cachedDomain) {
        // 先获取酒馆端口，再查代理状态
        getTavernUrl(function (url, port) {
            $tavernUrl.val(url);

            // 获取代理状态（_siteName 已在 open 时设置）
            Nginx.getProxyInfo(function (res) {
                var enabled = res.status && res.exists;
                $toggle.prop('checked', enabled);
                onToggleChange();

                if (enabled) {
                    // 代理已存在，从 getDomainList 获取真实绑定域名（创建时 name 就是域名，直接取第一个）
                    Nginx.getDomainList(function (domRes) {
                        var domains = (domRes && domRes.domains) || [];
                        var realDomain = (domains.length > 0) ? (domains[0].name || '') : '';
                        _savedDomain = realDomain;
                        $domainInput.val(realDomain);
                    });
                } else {
                    // 代理不存在，回填缓存域名
                    _savedDomain = cachedDomain || '';
                    $domainInput.val(_savedDomain);
                }
            });
        });
    }

    /**
     * 关闭弹窗（由 X 按钮或外部调用）
     */
    function close() {
        if (_layerIdx !== null) {
            layer.close(_layerIdx);
            _layerIdx = null;
        }
    }

    // ======== 对外暴露 ========

    return {
        open: open,
        close: close,
        switchTab: switchTab,
        onToggleChange: onToggleChange,
        onDomainInput: onDomainInput,
        saveDomain: saveDomain,
        refreshTavernUrl: refreshTavernUrl,
        applyBasic: applyBasic,
        switchSslType: switchSslType,
        loadSslStatus: loadSslStatus,
        browseCert: browseCert,
        browseKey: browseKey,
        onCertFileChange: onCertFileChange,
        onKeyFileChange: onKeyFileChange,
        onManualInput: onManualInput,
        validateManualCert: validateManualCert,
        _onDropOver: _onDropOver,
        _onDropLeave: _onDropLeave,
        _onDrop: _onDrop,
        uploadCert: uploadCert,
        applyLetsEncrypt: applyLetsEncrypt,
        closeSsl: closeSsl
    };
})();

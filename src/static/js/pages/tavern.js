/**
 * Tavern 页面 - 酒馆选项配置管理
 */

function renderTavernPage() {
    var html = 
        '<div class="stl-page active" id="page-tavern">' +
            // 顶部操作栏
            '<div class="stl-card">' +
                '<div class="stl-group-title"><i class="bi bi-gear"></i> 酒馆选项配置</div>' +
                '<div style="margin-top: 15px;">' +
                    '<button class="btn btn-bt btn-sm" onclick="TavernConfig.reloadConfig()">' +
                        '<i class="bi bi-arrow-clockwise"></i> 刷新' +
                    '</button> ' +
                    '<button class="btn btn-bt btn-sm" onclick="TavernConfig.resetChanges()">' +
                        '<i class="bi bi-arrow-counterclockwise"></i> 重置' +
                    '</button> ' +
                    '<button class="btn btn-bt btn-success btn-sm" onclick="TavernConfig.forceSave()">' +
                        '<i class="bi bi-save"></i> 立即保存' +
                    '</button>' +
                    '<span id="stl-unsaved-indicator" style="display:none; margin-left: 15px; color: #f0ad4e; font-size: 13px;">' +
                        '<i class="bi bi-circle-fill" style="font-size: 8px; vertical-align: middle;"></i> 未保存' +
                    '</span>' +
                '</div>' +
            '</div>' +
            
            // 配置内容区域
            '<div id="tavern-config-container">' +
                '<div style="text-align: center; padding: 60px 20px; color: #999;">' +
                    '<i class="bi bi-hourglass-split" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>' +
                    '<p>加载中...</p>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    $('.plugin_body').html(html);
    
    // 初始化配置管理器
    TavernConfig.init(function(success) {
        if (!success) {
            console.error('配置加载失败');
        }
    });
}

/**
 * 渲染配置页面内容（由TavernConfig调用）
 */
window.renderTavernPageContent = function(config) {
    var html = '';
    
    // 区块1: 网络基础
    html += renderNetworkSection(config);
    
    // 区块2: 安全与账户
    html += renderSecuritySection(config);
    
    // 区块3: CORS跨域
    html += renderCORSSection(config);
    
    // 区块4: 代理与备份
    html += renderProxyBackupSection(config);
    
    // 区块5: 缩略图设置
    html += renderThumbnailsSection(config);
    
    // 区块6: 性能优化
    html += renderPerformanceSection(config);
    
    // 区块7: 日志与调试
    html += renderLoggingSection(config);
    
    // 区块8: 其他设置
    html += renderMiscSection(config);
    
    $('#tavern-config-container').html(html);
    
    // 绑定事件
    bindTavernEvents();
    
    // 初始化条件显示
    updateConditionalFields();
};

/**
 * 创建配置区块（使用手动折叠控制）
 */
function createConfigSection(id, title, icon, expanded, content) {
    var displayStyle = expanded ? 'display: block;' : 'display: none;';
    var rotateStyle = expanded ? 'transform: rotate(180deg);' : '';
    
    return '<div class="stl-card stl-config-section" style="margin-bottom: 15px;">' +
        '<div class="stl-section-header" onclick="toggleConfigSection(\'' + id + '\')">' +
            '<div class="stl-section-title">' +
                '<i class="bi ' + icon + '"></i> ' + title +
            '</div>' +
            '<i class="bi bi-chevron-down stl-collapse-icon" id="icon-' + id + '" style="' + rotateStyle + '"></i>' +
        '</div>' +
        '<div id="section-' + id + '" class="stl-section-body" style="' + displayStyle + '">' +
            '<div class="stl-section-content">' +
                content +
            '</div>' +
        '</div>' +
    '</div>';
}

/**
 * 切换配置区块展开/折叠
 */
window.toggleConfigSection = function(id) {
    var $section = $('#section-' + id);
    var $icon = $('#icon-' + id);
    
    if ($section.is(':visible')) {
        // 折叠
        $section.slideUp(200);
        $icon.css('transform', 'rotate(0deg)');
    } else {
        // 展开
        $section.slideDown(200);
        $icon.css('transform', 'rotate(180deg)');
    }
};

/**
 * 区块1: 网络基础
 */
function renderNetworkSection(config) {
    return createConfigSection('network', '网络基础', 'bi-wifi', true,
        createInputField('端口号', 'port', config.port, 'number', { min: 1, max: 65535 }) +
        createToggleField('启用IPv4协议', 'protocol.ipv4', config.protocol.ipv4) +
        createToggleField('启用IPv6协议', 'protocol.ipv6', config.protocol.ipv6) +
        createInputField('心跳间隔(秒)', 'heartbeatInterval', config.heartbeatInterval, 'number', { min: 0 })
    );
}

/**
 * 区块2: 安全与账户
 */
function renderSecuritySection(config) {
    return createConfigSection('security', '安全与账户', 'bi-shield-lock', false,
        createToggleField('基本认证模式', 'basicAuthMode', config.basicAuthMode) +
        createToggleField('启用用户账户', 'enableUserAccounts', config.enableUserAccounts) +
        createToggleField('隐蔽登录', 'enableDiscreetLogin', config.enableDiscreetLogin) +
        createToggleField('每用户基本认证', 'perUserBasicAuth', config.perUserBasicAuth) +
        createInputField('用户名', 'basicAuthUser.username', config.basicAuthUser.username, 'text') +
        createInputField('密码', 'basicAuthUser.password', config.basicAuthUser.password, 'password') +
        createToggleField('白名单模式', 'whitelistMode', config.whitelistMode) +
        createDynamicList('IP白名单', 'whitelist', config.whitelist) +
        createToggleField('主机白名单', 'hostWhitelist.enabled', config.hostWhitelist.enabled) +
        createToggleField('主机扫描', 'hostWhitelist.scan', config.hostWhitelist.scan) +
        createDynamicList('主机列表', 'hostWhitelist.hosts', config.hostWhitelist.hosts) +
        createDynamicList('导入域名白名单', 'whitelistImportDomains', config.whitelistImportDomains)
    );
}

/**
 * 区块3: SSL证书
 */
function renderSSLSection(config) {
    return createConfigSection('ssl', 'SSL证书', 'bi-file-earmark-lock', false,
        createToggleField('启用SSL', 'ssl.enabled', config.ssl.enabled) +
        createFileField('证书路径', 'ssl.certPath', config.ssl.certPath) +
        createFileField('私钥路径', 'ssl.keyPath', config.ssl.keyPath) +
        createInputField('私钥密码', 'ssl.keyPassphrase', config.ssl.keyPassphrase, 'password')
    );
}

/**
 * 区块4: CORS跨域
 */
function renderCORSSection(config) {
    return createConfigSection('cors', 'CORS跨域', 'bi-globe', false,
        createToggleField('启用CORS', 'cors.enabled', config.cors.enabled) +
        createDynamicList('允许的源', 'cors.origin', config.cors.origin) +
        createDynamicList('允许的方法', 'cors.methods', config.cors.methods) +
        createDynamicList('允许的请求头', 'cors.allowedHeaders', config.cors.allowedHeaders) +
        createDynamicList('暴露的响应头', 'cors.exposedHeaders', config.cors.exposedHeaders) +
        createToggleField('允许凭证', 'cors.credentials', config.cors.credentials) +
        createInputField('最大缓存时间(秒)', 'cors.maxAge', config.cors.maxAge || '', 'number', { min: 0 })
    );
}

/**
 * 区块5: 代理与备份
 */
function renderProxyBackupSection(config) {
    return createConfigSection('proxy-backup', '代理与备份', 'bi-hdd-network', false,
        createToggleField('启用代理', 'requestProxy.enabled', config.requestProxy.enabled) +
        createInputField('代理URL', 'requestProxy.url', config.requestProxy.url, 'text') +
        createDynamicList('绕过代理列表', 'requestProxy.bypass', config.requestProxy.bypass) +
        '<hr style="margin: 18px 0; border-top: 1px dashed #ddd;">' +
        createInputField('通用备份数量', 'backups.common.numberOfBackups', config.backups.common.numberOfBackups, 'number', { min: 1 }) +
        createToggleField('聊天备份', 'backups.chat.enabled', config.backups.chat.enabled) +
        createToggleField('完整性检查', 'backups.chat.checkIntegrity', config.backups.chat.checkIntegrity) +
        createInputField('最大总备份数(-1无限制)', 'backups.chat.maxTotalBackups', config.backups.chat.maxTotalBackups, 'number') +
        createInputField('节流间隔(毫秒)', 'backups.chat.throttleInterval', config.backups.chat.throttleInterval, 'number', { min: 0 })
    );
}

/**
 * 区块6: 缩略图设置
 */
function renderThumbnailsSection(config) {
    return createConfigSection('thumbnails', '缩略图设置', 'bi-image', false,
        createToggleField('启用缩略图', 'thumbnails.enabled', config.thumbnails.enabled) +
        createSelectField('图片格式', 'thumbnails.format', config.thumbnails.format, [
            { value: 'jpg', text: 'JPG' },
            { value: 'png', text: 'PNG' },
            { value: 'webp', text: 'WebP' }
        ]) +
        createRangeField('压缩质量', 'thumbnails.quality', config.thumbnails.quality, 1, 100) +
        '<div class="stl-form-group">' +
            '<label>背景尺寸 (宽x高)</label>' +
            '<div class="row">' +
                '<div class="col-xs-6">' +
                    '<input type="number" class="stl-form-control" ' +
                        'value="' + config.thumbnails.dimensions.bg[0] + '" ' +
                        'onchange="TavernConfig.updateField(\'thumbnails.dimensions.bg.0\', parseInt(this.value))" />' +
                '</div>' +
                '<div class="col-xs-6">' +
                    '<input type="number" class="stl-form-control" ' +
                        'value="' + config.thumbnails.dimensions.bg[1] + '" ' +
                        'onchange="TavernConfig.updateField(\'thumbnails.dimensions.bg.1\', parseInt(this.value))" />' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="stl-form-group">' +
            '<label>头像尺寸 (宽x高)</label>' +
            '<div class="row">' +
                '<div class="col-xs-6">' +
                    '<input type="number" class="stl-form-control" ' +
                        'value="' + config.thumbnails.dimensions.avatar[0] + '" ' +
                        'onchange="TavernConfig.updateField(\'thumbnails.dimensions.avatar.0\', parseInt(this.value))" />' +
                '</div>' +
                '<div class="col-xs-6">' +
                    '<input type="number" class="stl-form-control" ' +
                        'value="' + config.thumbnails.dimensions.avatar[1] + '" ' +
                        'onchange="TavernConfig.updateField(\'thumbnails.dimensions.avatar.1\', parseInt(this.value))" />' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="stl-form-group">' +
            '<label>角色卡尺寸 (宽x高)</label>' +
            '<div class="row">' +
                '<div class="col-xs-6">' +
                    '<input type="number" class="stl-form-control" ' +
                        'value="' + config.thumbnails.dimensions.persona[0] + '" ' +
                        'onchange="TavernConfig.updateField(\'thumbnails.dimensions.persona.0\', parseInt(this.value))" />' +
                '</div>' +
                '<div class="col-xs-6">' +
                    '<input type="number" class="stl-form-control" ' +
                        'value="' + config.thumbnails.dimensions.persona[1] + '" ' +
                        'onchange="TavernConfig.updateField(\'thumbnails.dimensions.persona.1\', parseInt(this.value))" />' +
                '</div>' +
            '</div>' +
        '</div>'
    );
}

/**
 * 区块7: 性能优化
 */
function renderPerformanceSection(config) {
    var memoryCapacity = config.performance.memoryCacheCapacity.replace('mb', '');
    
    return createConfigSection('performance', '性能优化', 'bi-cpu', false,
        createToggleField('懒加载角色', 'performance.lazyLoadCharacters', config.performance.lazyLoadCharacters) +
        createToggleField('使用磁盘缓存', 'performance.useDiskCache', config.performance.useDiskCache) +
        '<div class="stl-form-group">' +
            '<label>内存缓存容量 (MB)</label>' +
            '<div class="input-group">' +
                '<input type="number" class="stl-form-control" ' +
                    'value="' + memoryCapacity + '" ' +
                    'onchange="TavernConfig.updateField(\'performance.memoryCacheCapacity\', this.value + \'mb\')" />' +
                '<span class="input-group-addon">MB</span>' +
            '</div>' +
        '</div>'
    );
}

/**
 * 区块8: 日志与调试
 */
function renderLoggingSection(config) {
    return createConfigSection('logging', '日志与调试', 'bi-journal-text', false,
        createToggleField('启用访问日志', 'logging.enableAccessLog', config.logging.enableAccessLog) +
        createSelectField('日志级别', 'logging.minLogLevel', config.logging.minLogLevel, [
            { value: 0, text: 'Debug' },
            { value: 1, text: 'Info' },
            { value: 2, text: 'Warn' },
            { value: 3, text: 'Error' }
        ])
    );
}

/**
 * 区块9: 其他设置
 */
function renderMiscSection(config) {
    return createConfigSection('misc', '其他设置', 'bi-sliders', false,
        createInputField('提示占位符', 'promptPlaceholder', config.promptPlaceholder, 'text') +
        createInputField('会话超时(-1永不过期)', 'sessionTimeout', config.sessionTimeout, 'number') +
        createToggleField('禁用CSRF保护', 'disableCsrfProtection', config.disableCsrfProtection) +
        createToggleField('安全覆盖', 'securityOverride', config.securityOverride) +
        createToggleField('允许密钥暴露', 'allowKeysExposure', config.allowKeysExposure) +
        createToggleField('跳过内容检查', 'skipContentCheck', config.skipContentCheck) +
        createToggleField('扩展启用', 'extensions.enabled', config.extensions.enabled) +
        createToggleField('扩展自动更新', 'extensions.autoUpdate', config.extensions.autoUpdate) +
        createToggleField('服务器插件', 'enableServerPlugins', config.enableServerPlugins) +
        createToggleField('插件自动更新', 'enableServerPluginsAutoUpdate', config.enableServerPluginsAutoUpdate) +
        createToggleField('CORS代理', 'enableCorsProxy', config.enableCorsProxy) +
        createToggleField('可下载分词器', 'enableDownloadableTokenizers', config.enableDownloadableTokenizers) +
        createToggleField('Authelia SSO', 'sso.autheliaAuth', config.sso.autheliaAuth) +
        createToggleField('Authentik SSO', 'sso.authentikAuth', config.sso.authentikAuth) +
        createToggleField('缓存清除器', 'cacheBuster.enabled', config.cacheBuster.enabled) +
        createInputField('User-Agent匹配模式', 'cacheBuster.userAgentPattern', config.cacheBuster.userAgentPattern, 'text')
    );
}

// ==================== UI组件辅助函数 ====================

/**
 * 创建输入框字段
 */
function createInputField(label, key, value, type, attrs) {
    attrs = attrs || {};
    var attrStr = '';
    for (var attr in attrs) {
        attrStr += ' ' + attr + '="' + attrs[attr] + '"';
    }
    
    return '<div class="stl-form-group">' +
        '<label class="stl-form-label">' + label + '</label>' +
        '<input type="' + type + '" class="stl-form-control" ' +
            'data-config-key="' + key + '" ' +
            'value="' + (value !== null && value !== undefined ? value : '') + '"' +
            attrStr + ' />' +
    '</div>';
}

/**
 * 创建开关字段
 */
function createToggleField(label, key, checked) {
    var checkedAttr = checked ? 'checked' : '';
    
    return '<div class="stl-form-group">' +
        '<label class="stl-form-checkbox">' +
            '<input type="checkbox" data-config-key="' + key + '" ' + checkedAttr + ' />' +
            '<span>' + label + '</span>' +
        '</label>' +
    '</div>';
}

/**
 * 创建下拉选择字段
 */
function createSelectField(label, key, value, options) {
    var optionsHtml = options.map(function(opt) {
        var selected = opt.value === value ? 'selected' : '';
        return '<option value="' + opt.value + '" ' + selected + '>' + opt.text + '</option>';
    }).join('');
    
    return '<div class="stl-form-group">' +
        '<label class="stl-form-label">' + label + '</label>' +
        '<select class="stl-form-select" data-config-key="' + key + '">' +
            optionsHtml +
        '</select>' +
    '</div>';
}

/**
 * 创建文件路径选择字段
 */
function createFileField(label, key, value) {
    return '<div class="stl-form-group">' +
        '<label class="stl-form-label">' + label + '</label>' +
        '<div class="input-group">' +
            '<input type="text" class="stl-form-control" data-config-key="' + key + '" ' +
                'value="' + (value || '') + '" />' +
            '<span class="input-group-btn">' +
                '<button class="btn btn-default btn-sm stl-browse-path-btn" ' +
                    'data-target-key="' + key + '" ' +
                    'data-start-path="/www">' +
                    '<i class="bi bi-folder2-open"></i> 浏览' +
                '</button>' +
            '</span>' +
        '</div>' +
    '</div>';
}

/**
 * 创建滑块字段
 */
function createRangeField(label, key, value, min, max) {
    return '<div class="stl-form-group">' +
        '<label class="stl-form-label">' + label + ': <span class="stl-range-value">' + value + '</span></label>' +
        '<input type="range" class="stl-form-control" data-config-key="' + key + '" ' +
            'value="' + value + '" min="' + min + '" max="' + max + '" ' +
            'oninput="$(this).prev().find(\'.stl-range-value\').text(this.value)" />' +
    '</div>';
}

/**
 * 创建动态列表
 */
function createDynamicList(label, key, items) {
    if (!Array.isArray(items)) items = [];
    
    var itemsHtml = items.map(function(item, index) {
        return '<div class="stl-list-item" data-index="' + index + '">' +
            '<input type="text" class="stl-form-control input-sm" value="' + item + '" />' +
            '<button class="btn btn-danger btn-xs stl-remove-item-btn" data-index="' + index + '">' +
                '<i class="bi bi-trash"></i>' +
            '</button>' +
        '</div>';
    }).join('');
    
    return '<div class="stl-form-group">' +
        '<div class="stl-dynamic-list" data-config-key="' + key + '">' +
            '<div class="stl-list-header">' +
                '<span>' + label + '</span>' +
                '<button class="btn btn-default btn-sm stl-add-item-btn" data-key="' + key + '">' +
                    '<i class="bi bi-plus"></i> 添加' +
                '</button>' +
            '</div>' +
            '<div class="stl-list-items" data-key="' + key + '">' +
                itemsHtml +
            '</div>' +
        '</div>' +
    '</div>';
}

/**
 * 重新渲染动态列表
 */
function rerenderDynamicList(key) {
    var $listContainer = $('.stl-dynamic-list[data-config-key="' + key + '"] .stl-list-items');
    if ($listContainer.length === 0) return;
    
    var items = TavernConfig.getConfig(key) || [];
    var itemsHtml = items.map(function(item, index) {
        return '<div class="stl-list-item" data-index="' + index + '">' +
            '<input type="text" class="stl-form-control input-sm" value="' + item + '" />' +
            '<button class="btn btn-danger btn-xs stl-remove-item-btn" data-index="' + index + '">' +
                '<i class="bi bi-trash"></i>' +
            '</button>' +
        '</div>';
    }).join('');
    
    $listContainer.html(itemsHtml);
}

/**
 * 绑定事件
 */
function bindTavernEvents() {
    // 输入框变化事件
    $('#tavern-config-container').on('input change', '[data-config-key]', function() {
        var key = $(this).data('config-key');
        var value;
        
        if ($(this).attr('type') === 'checkbox') {
            value = $(this).prop('checked');
        } else if ($(this).attr('type') === 'number') {
            value = parseFloat($(this).val());
            if (isNaN(value)) value = 0;
        } else {
            value = $(this).val();
        }
        
        TavernConfig.updateField(key, value);
        
        // 如果是开关字段，触发条件显示更新
        updateConditionalFields();
    });
    
    // 动态列表 - 添加按钮
    $('#tavern-config-container').on('click', '.stl-add-item-btn', function() {
        var key = $(this).data('key');
        TavernConfig.addListItem(key);
        // 重新渲染该列表
        setTimeout(function() {
            rerenderDynamicList(key);
        }, 100);
    });
    
    // 动态列表 - 删除按钮
    $('#tavern-config-container').on('click', '.stl-remove-item-btn', function() {
        var $item = $(this).closest('.stl-list-item');
        var $list = $item.closest('.stl-dynamic-list');
        var key = $list.data('config-key');
        var index = parseInt($(this).data('index'));
        TavernConfig.removeListItem(key, index);
        // 重新渲染该列表
        setTimeout(function() {
            rerenderDynamicList(key);
        }, 100);
    });
    
    // 动态列表 - 输入框变化
    $('#tavern-config-container').on('input', '.stl-list-item input', function() {
        var $item = $(this).closest('.stl-list-item');
        var $list = $item.closest('.stl-dynamic-list');
        var key = $list.data('config-key');
        var index = parseInt($item.data('index'));
        var list = TavernConfig.getConfig(key) || [];
        list[index] = $(this).val();
        TavernConfig.updateField(key, list);
    });
    
    // 文件浏览按钮
    $('#tavern-config-container').on('click', '.stl-browse-path-btn', function() {
        var targetKey = $(this).data('target-key');
        var startPath = $(this).data('start-path') || '/www';
        
        if (typeof FolderSelector !== 'undefined') {
            FolderSelector.open({
                title: '选择文件路径',
                startPath: startPath,
                onSelect: function(path) {
                    $('[data-config-key="' + targetKey + '"]').val(path);
                    TavernConfig.updateField(targetKey, path);
                }
            });
        } else {
            layer.prompt({
                title: '输入文件路径',
                formType: 0,
                value: ''
            }, function(path, index) {
                $('[data-config-key="' + targetKey + '"]').val(path);
                TavernConfig.updateField(targetKey, path);
                layer.close(index);
            });
        }
    });
}

/**
 * 更新条件显示字段
 */
function updateConditionalFields() {
    // 基本认证相关字段
    var basicAuthEnabled = TavernConfig.getConfig('basicAuthMode');
    toggleFieldVisibility('basicAuthUser.username', basicAuthEnabled);
    toggleFieldVisibility('basicAuthUser.password', basicAuthEnabled);
    toggleFieldVisibility('perUserBasicAuth', basicAuthEnabled);
    
    // 用户账户相关
    var userAccountsEnabled = TavernConfig.getConfig('enableUserAccounts');
    toggleFieldVisibility('enableDiscreetLogin', userAccountsEnabled);
    
    // 白名单相关
    var whitelistEnabled = TavernConfig.getConfig('whitelistMode');
    toggleFieldVisibility('whitelist', whitelistEnabled);
    
    // 主机白名单相关
    var hostWhitelistEnabled = TavernConfig.getConfig('hostWhitelist.enabled');
    toggleFieldVisibility('hostWhitelist.scan', hostWhitelistEnabled);
    toggleFieldVisibility('hostWhitelist.hosts', hostWhitelistEnabled);
    
    // CORS相关
    var corsEnabled = TavernConfig.getConfig('cors.enabled');
    toggleFieldVisibility('cors.origin', corsEnabled);
    toggleFieldVisibility('cors.methods', corsEnabled);
    toggleFieldVisibility('cors.allowedHeaders', corsEnabled);
    toggleFieldVisibility('cors.exposedHeaders', corsEnabled);
    toggleFieldVisibility('cors.credentials', corsEnabled);
    toggleFieldVisibility('cors.maxAge', corsEnabled);
    
    // 代理相关
    var proxyEnabled = TavernConfig.getConfig('requestProxy.enabled');
    toggleFieldVisibility('requestProxy.url', proxyEnabled);
    toggleFieldVisibility('requestProxy.bypass', proxyEnabled);
    
    // 聊天备份相关
    var chatBackupEnabled = TavernConfig.getConfig('backups.chat.enabled');
    toggleFieldVisibility('backups.chat.checkIntegrity', chatBackupEnabled);
    toggleFieldVisibility('backups.chat.maxTotalBackups', chatBackupEnabled);
    toggleFieldVisibility('backups.chat.throttleInterval', chatBackupEnabled);
    
    // 缩略图相关
    var thumbnailsEnabled = TavernConfig.getConfig('thumbnails.enabled');
    toggleFieldVisibility('thumbnails.format', thumbnailsEnabled);
    toggleFieldVisibility('thumbnails.quality', thumbnailsEnabled);
    toggleFieldVisibility('thumbnails.dimensions', thumbnailsEnabled);
    
    // 性能相关
    var diskCacheEnabled = TavernConfig.getConfig('performance.useDiskCache');
    toggleFieldVisibility('performance.memoryCacheCapacity', !diskCacheEnabled);
    
    // 日志相关
    var accessLogEnabled = TavernConfig.getConfig('logging.enableAccessLog');
    toggleFieldVisibility('logging.minLogLevel', accessLogEnabled);
    
    // 扩展相关
    var extensionsEnabled = TavernConfig.getConfig('extensions.enabled');
    toggleFieldVisibility('extensions.autoUpdate', extensionsEnabled);
    
    // 服务器插件相关
    var serverPluginsEnabled = TavernConfig.getConfig('enableServerPlugins');
    toggleFieldVisibility('enableServerPluginsAutoUpdate', serverPluginsEnabled);
    
    // 缓存清除器相关
    var cacheBusterEnabled = TavernConfig.getConfig('cacheBuster.enabled');
    toggleFieldVisibility('cacheBuster.userAgentPattern', cacheBusterEnabled);
    
    // SSO相关
    var autheliaEnabled = TavernConfig.getConfig('sso.autheliaAuth');
    var authentikEnabled = TavernConfig.getConfig('sso.authentikAuth');
}

/**
 * 切换字段可见性
 */
function toggleFieldVisibility(key, visible) {
    // 查找包含该key的form-group
    var $field = $('[data-config-key="' + key + '"]').closest('.stl-form-group');
    if ($field.length > 0) {
        if (visible) {
            $field.show();
        } else {
            $field.hide();
        }
    } else {
        // 对于动态列表，查找stl-dynamic-list
        var $list = $('.stl-dynamic-list[data-config-key="' + key + '"]').closest('.stl-form-group');
        if ($list.length > 0) {
            if (visible) {
                $list.show();
            } else {
                $list.hide();
            }
        }
    }
}

/**
 * SillyTavern 配置管理器
 * 负责配置的加载、修改、保存、缓存
 */
var TavernConfig = (function() {
    "use strict";
    
    // 私有变量
    var configData = {};          // 当前配置（内存副本）
    var originalConfig = {};      // 原始配置（用于重置）
    var saveTimer = null;         // 防抖定时器
    var isSaving = false;         // 保存锁
    var pendingSave = false;      // 待保存标志
    var DEBOUNCE_DELAY = 500;     // 防抖延迟（毫秒）
    var CACHE_KEY = 'STL_TAVERN_CONFIG';
    var CACHE_TTL = 5 * 60 * 1000; // 缓存有效期5分钟
    
    /**
     * 初始化配置管理器
     */
    function init(callback) {
        // 检查酒馆安装状态
        request_plugin('check_tavern_installation', {}, function(rdata) {
            if (!rdata.status) {
                showInstallError(rdata.msg);
                if (callback) callback(false);
                return;
            }
            
            if (!rdata.installed) {
                showNotInstalledMessage();
                if (callback) callback(false);
                return;
            }
            
            if (!rdata.config_exists) {
                layer.msg('配置文件不存在，请先启动一次SillyTavern', { icon: 2 });
                if (callback) callback(false);
                return;
            }
            
            if (rdata.auto_copied) {
                layer.msg('已自动初始化配置文件', { icon: 1 });
            }
            
            // 加载配置
            loadConfig(function(success) {
                if (success && callback) callback(true);
            });
        });
    }
    
    /**
     * 加载配置（缓存优先，但会检查文件是否被修改）
     */
    function loadConfig(callback) {
        // 从后端加载（始终检查文件状态）
        request_plugin('get_tavern_config', {}, function(rdata) {
            if (!rdata.status) {
                layer.msg('加载配置失败: ' + rdata.msg, { icon: 2 });
                if (callback) callback(false);
                return;
            }
            
            var newConfig = normalizeConfig(rdata.config);
            
            // 尝试从缓存读取进行对比
            var cached = CacheUtil.localGet(CACHE_KEY, null);
            var cacheValid = cached && cached.timestamp && 
                            (Date.now() - cached.timestamp < CACHE_TTL) &&
                            cached.file_mtime === rdata.file_mtime;
            
            if (cacheValid) {
                // 缓存有效且文件未修改，使用缓存
                configData = $.extend(true, {}, cached.data);
                originalConfig = $.extend(true, {}, cached.data);
            } else {
                // 缓存无效或文件已修改，使用新数据
                configData = newConfig;
                originalConfig = $.extend(true, {}, configData);
                
                // 更新缓存（包含文件修改时间）
                CacheUtil.localSet(CACHE_KEY, {
                    data: configData,
                    timestamp: Date.now(),
                    file_mtime: rdata.file_mtime  // 记录文件修改时间
                });
            }
            
            renderConfigUI();
            if (callback) callback(true);
        });
    }
    
    /**
     * 规范化配置数据结构（确保所有字段存在）
     */
    function normalizeConfig(config) {
        // 提供默认值，确保所有必需字段存在
        var defaults = {
            port: 8000,
            listen: false,
            listenAddress: { ipv4: '0.0.0.0', ipv6: '[::]' },
            protocol: { ipv4: true, ipv6: false },
            basicAuthMode: false,
            enableUserAccounts: false,
            enableDiscreetLogin: false,
            perUserBasicAuth: false,
            basicAuthUser: { username: 'user', password: 'password' },
            whitelistMode: true,
            whitelist: [],
            cors: {
                enabled: true,
                origin: ['null'],
                methods: ['OPTIONS'],
                allowedHeaders: [],
                exposedHeaders: [],
                credentials: false,
                maxAge: null
            },
            requestProxy: { enabled: false, url: '', bypass: [] },
            backups: {
                common: { numberOfBackups: 50 },
                chat: { 
                    enabled: true, 
                    checkIntegrity: true, 
                    maxTotalBackups: -1, 
                    throttleInterval: 10000 
                }
            },
            thumbnails: {
                enabled: true,
                format: 'jpg',
                quality: 95,
                dimensions: { bg: [160, 90], avatar: [96, 144], persona: [96, 144] }
            },
            browserLaunch: { enabled: false, browser: 'default' },  // 服务器端默认关闭浏览器启动
            ssl: {
                enabled: false,
                certPath: './certs/cert.pem',
                keyPath: './certs/privkey.pem',
                keyPassphrase: ''
            },
            dnsPreferIPv6: false,  // DNS偏好保持默认（优先IPv4）
            heartbeatInterval: 0,
            hostWhitelist: { enabled: false, scan: true, hosts: [] },
            whitelistImportDomains: [],
            sessionTimeout: -1,
            disableCsrfProtection: false,
            securityOverride: false,
            allowKeysExposure: false,
            skipContentCheck: false,
            logging: { enableAccessLog: true, minLogLevel: 0 },
            performance: { 
                lazyLoadCharacters: false, 
                memoryCacheCapacity: '100mb', 
                useDiskCache: true 
            },
            cacheBuster: { enabled: false, userAgentPattern: '' },
            sso: { autheliaAuth: false, authentikAuth: false },
            extensions: { enabled: true, autoUpdate: true },
            enableServerPlugins: false,
            enableServerPluginsAutoUpdate: true,
            enableCorsProxy: false,
            promptPlaceholder: '[Start a new chat]',
            enableDownloadableTokenizers: true
        };
        
        // 深度合并默认值和实际配置
        return deepMerge(defaults, config);
    }
    
    /**
     * 深度合并两个对象
     */
    function deepMerge(target, source) {
        var result = $.extend(true, {}, target);
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                if (isObject(source[key]) && isObject(result[key])) {
                    result[key] = deepMerge(result[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }
    
    /**
     * 判断是否为对象
     */
    function isObject(obj) {
        return obj && typeof obj === 'object' && !Array.isArray(obj);
    }
    
    /**
     * 渲染配置UI
     */
    function renderConfigUI() {
        // 如果renderTavernPage已定义，调用它重新渲染
        if (typeof window.renderTavernPageContent === 'function') {
            window.renderTavernPageContent(configData);
        }
    }
    
    /**
     * 获取配置值（支持嵌套路径如 "network.port"）
     */
    function getConfig(key) {
        return getNestedValue(configData, key);
    }
    
    /**
     * 更新字段（触发防抖保存）
     */
    function updateField(key, value) {
        setNestedValue(configData, key, value);
        
        // 清除旧定时器
        if (saveTimer) clearTimeout(saveTimer);
        
        // 设置新定时器
        saveTimer = setTimeout(function() {
            performSave();
        }, DEBOUNCE_DELAY);
        
        // 显示未保存指示器
        showUnsavedIndicator();
    }
    
    /**
     * 添加列表项
     */
    function addListItem(key) {
        var list = getNestedValue(configData, key) || [];
        list.push('');
        setNestedValue(configData, key, list);
        updateField(key, list);
    }
    
    /**
     * 删除列表项
     */
    function removeListItem(key, index) {
        var list = getNestedValue(configData, key) || [];
        if (index >= 0 && index < list.length) {
            list.splice(index, 1);
            setNestedValue(configData, key, list);
            updateField(key, list);
        }
    }
    
    /**
     * 重置更改
     */
    function resetChanges() {
        configData = $.extend(true, {}, originalConfig);
        renderConfigUI();
        hideUnsavedIndicator();
        layer.msg('已重置为原始配置', { icon: 1 });
    }
    
    /**
     * 重新加载配置（从文件读取，清除缓存）
     */
    function reloadConfig() {
        var loadingIndex = layer.load(1, { shade: [0.3, '#000'] });
        
        // 清除缓存
        CacheUtil.localRemove(CACHE_KEY);
        
        // 重新从后端加载
        request_plugin('get_tavern_config', {}, function(rdata) {
            layer.close(loadingIndex);
            
            if (!rdata.status) {
                layer.msg('刷新失败: ' + rdata.msg, { icon: 2 });
                return;
            }
            
            configData = normalizeConfig(rdata.config);
            originalConfig = $.extend(true, {}, configData);
            
            // 更新缓存
            CacheUtil.localSet(CACHE_KEY, {
                data: configData,
                timestamp: Date.now(),
                file_mtime: rdata.file_mtime
            });
            
            renderConfigUI();
            hideUnsavedIndicator();
            layer.msg('配置已刷新', { icon: 1, time: 1500 });
        });
    }
    
    /**
     * 立即保存（跳过防抖）
     */
    function forceSave() {
        if (saveTimer) clearTimeout(saveTimer);
        performSave();
    }
    
    /**
     * 执行保存操作
     */
    function performSave() {
        if (isSaving) {
            pendingSave = true;
            return;
        }
        
        isSaving = true;
        hideUnsavedIndicator();
        
        var loadingIndex = layer.load(1, { shade: [0.3, '#000'] });
        
        request_plugin('update_tavern_config', {
            config: JSON.stringify(configData)
        }, function(rdata) {
            layer.close(loadingIndex);
            isSaving = false;
            
            if (rdata.status) {
                // 更新缓存
                CacheUtil.localSet(CACHE_KEY, {
                    data: configData,
                    timestamp: Date.now()
                });
                
                // 更新原始副本
                originalConfig = $.extend(true, {}, configData);
                
                layer.msg('配置已保存', { icon: 1, time: 1500 });
                
                // 检查是否有待保存任务
                if (pendingSave) {
                    pendingSave = false;
                    performSave();
                }
            } else {
                layer.msg('保存失败: ' + rdata.msg, { icon: 2 });
                showUnsavedIndicator();
            }
        });
    }
    
    /**
     * 设置嵌套对象的值
     */
    function setNestedValue(obj, path, value) {
        var keys = path.split('.');
        var lastKey = keys.pop();
        var target = keys.reduce(function(acc, key) {
            if (!acc[key]) acc[key] = {};
            return acc[key];
        }, obj);
        target[lastKey] = value;
    }
    
    /**
     * 获取嵌套对象的值
     */
    function getNestedValue(obj, path) {
        var keys = path.split('.');
        var result = keys.reduce(function(acc, key) {
            return acc && acc[key] !== undefined ? acc[key] : undefined;
        }, obj);
        return result;
    }
    
    /**
     * 显示未保存指示器
     */
    function showUnsavedIndicator() {
        var $indicator = $('#stl-unsaved-indicator');
        if ($indicator.length === 0) {
            $('.stl-page-header').append(
                '<span id="stl-unsaved-indicator" class="stl-unsaved-indicator">' +
                '<i class="bi bi-circle-fill"></i> 未保存</span>'
            );
        } else {
            $indicator.show();
        }
    }
    
    /**
     * 隐藏未保存指示器
     */
    function hideUnsavedIndicator() {
        $('#stl-unsaved-indicator').hide();
    }
    
    /**
     * 显示未安装提示
     */
    function showNotInstalledMessage() {
        var html = 
            '<div class="stl-not-installed">' +
                '<div style="text-align: center; padding: 60px 20px;">' +
                    '<i class="bi bi-exclamation-triangle" style="font-size: 64px; color: #f0ad4e; margin-bottom: 20px;"></i>' +
                    '<h3>SillyTavern 未安装</h3>' +
                    '<p style="color: #999; margin: 20px 0;">' +
                        '请先前往版本管理页面安装 SillyTavern' +
                    '</p>' +
                    '<button class="btn btn-primary" onclick="BTPlugin.showPage(\'versions\')">' +
                        '<i class="bi bi-box-arrow-right"></i> 前往版本管理' +
                    '</button>' +
                '</div>' +
            '</div>';
        $('.plugin_body').html(html);
    }
    
    /**
     * 显示安装错误
     */
    function showInstallError(msg) {
        layer.alert(msg, { icon: 2, title: '错误' });
    }
    
    // 公开接口
    return {
        init: init,
        getConfig: getConfig,
        updateField: updateField,
        addListItem: addListItem,
        removeListItem: removeListItem,
        resetChanges: resetChanges,
        reloadConfig: reloadConfig,
        forceSave: forceSave,
        loadConfig: loadConfig
    };
})();

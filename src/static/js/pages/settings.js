/**
 * Settings 页面 - 设置
 */

function renderSettingsPage() {
    var html = 
        '<div class="stl-page active" id="page-settings">' +
            // 通用设置
            '<div class="stl-card">' +
                '<div class="stl-group-title"><i class="bi bi-gear"></i> 通用设置</div>' +
                
                '<div class="stl-form-group">' +
                    '<label class="stl-form-label">语言</label>' +
                    '<select class="stl-form-select" id="setting-lang" onchange="BTPlugin.saveSettings()">' +
                        '<option value="auto">自动检测</option>' +
                        '<option value="zh-CN">简体中文</option>' +
                        '<option value="en">English</option>' +
                    '</select>' +
                '</div>' +
                
                '<div class="stl-form-group">' +
                    '<label class="stl-form-label">主题</label>' +
                    '<select class="stl-form-select" id="setting-theme" onchange="BTPlugin.saveSettings()">' +
                        '<option value="auto">跟随系统</option>' +
                        '<option value="light">浅色</option>' +
                        '<option value="dark">深色</option>' +
                    '</select>' +
                '</div>' +
                
                '<div class="stl-form-group">' +
                    '<label class="stl-form-checkbox">' +
                        '<input type="checkbox" id="setting-animations" checked onchange="BTPlugin.saveSettings()">' +
                        '<span>启用动画效果</span>' +
                    '</label>' +
                '</div>' +
            '</div>' +
            
            // 代理设置
            '<div class="stl-card">' +
                '<div class="stl-group-title"><i class="bi bi-globe"></i> 网络代理</div>' +
                
                '<div class="stl-form-group">' +
                    '<label class="stl-form-checkbox">' +
                        '<input type="checkbox" id="setting-ghproxy-enable" onchange="BTPlugin.saveSettings()">' +
                        '<span>启用 GitHub 代理</span>' +
                    '</label>' +
                '</div>' +
                
                '<div class="stl-form-group">' +
                    '<label class="stl-form-label">代理地址</label>' +
                    '<div class="stl-flex">' +
                        '<input type="text" class="stl-form-control" id="setting-ghproxy-url" placeholder="https://ghfast.top/" style="flex:1;" onchange="BTPlugin.saveSettings()">' +
                    '</div>' +
                    '<div class="stl-form-help">用于加速 GitHub 下载</div>' +
                '</div>' +
                
                '<div class="stl-form-group">' +
                    '<label class="stl-form-label">代理模式</label>' +
                    '<select class="stl-form-select" id="setting-proxy-mode" onchange="BTPlugin.saveSettings()">' +
                        '<option value="none">不使用代理</option>' +
                        '<option value="system">跟随系统</option>' +
                        '<option value="custom">自定义代理</option>' +
                    '</select>' +
                '</div>' +
                
                '<div class="stl-form-group" id="proxy-custom-fields" style="display: none;">' +
                    '<div class="stl-flex stl-flex-gap-10">' +
                        '<input type="text" class="stl-form-control" id="setting-proxy-host" placeholder="127.0.0.1" onchange="BTPlugin.saveSettings()">' +
                        '<input type="number" class="stl-form-control" id="setting-proxy-port" placeholder="7890" onchange="BTPlugin.saveSettings()">' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            // 环境检测
            '<div class="stl-card">' +
                '<div class="stl-group-title"><i class="bi bi-check-circle"></i> 环境检测</div>' +
                
                '<div class="stl-form-group">' +
                    '<div class="stl-info-item">' +
                        '<span class="stl-info-label"><i class="bi bi-terminal"></i> Node.js</span>' +
                        '<span class="stl-info-value" id="check-node">检测中...</span>' +
                    '</div>' +
                    '<button class="btn btn-bt-outline btn-bt-sm" onclick="BTPlugin.checkNode()" style="margin-top: 8px;">检测</button>' +
                '</div>' +
                
                '<div class="stl-form-group">' +
                    '<div class="stl-info-item">' +
                        '<span class="stl-info-label"><i class="bi bi-git"></i> Git</span>' +
                        '<span class="stl-info-value" id="check-git">检测中...</span>' +
                    '</div>' +
                    '<button class="btn btn-bt-outline btn-bt-sm" onclick="BTPlugin.checkGit()" style="margin-top: 8px;">检测</button>' +
                '</div>' +
            '</div>' +
            
            // 启动设置
            '<div class="stl-card">' +
                '<div class="stl-group-title"><i class="bi bi-play"></i> 启动设置</div>' +
                
                '<div class="stl-form-group">' +
                    '<label class="stl-form-label">启动方式</label>' +
                    '<select class="stl-form-select" id="setting-launch-mode" onchange="BTPlugin.saveSettings()">' +
                        '<option value="default">默认方式</option>' +
                        '<option value="background">后台运行</option>' +
                        '<option value="visible">可见窗口</option>' +
                    '</select>' +
                '</div>' +
                
                '<div class="stl-form-group">' +
                    '<label class="stl-form-label">数据目录</label>' +
                    '<select class="stl-form-select" id="setting-data-mode" onchange="BTPlugin.saveSettings()">' +
                        '<option value="default">默认位置</option>' +
                        '<option value="custom">自定义位置</option>' +
                    '</select>' +
                '</div>' +
            '</div>' +
            
            // 保存按钮
            '<div style="text-align: center; margin-top: 20px;">' +
                '<button class="btn btn-bt" onclick="BTPlugin.saveSettings()">' +
                    '<i class="bi bi-check-lg"></i> 保存设置' +
                '</button>' +
            '</div>' +
        '</div>';
    
    $('.plugin_body').html(html);
    
    // 加载设置
    loadSettings();
}

/**
 * 加载设置
 */
function loadSettings() {
    request_plugin('get_settings', {}, function (rdata) {
        if (rdata.status && rdata.data) {
            var settings = rdata.data;
            
            // 语言
            $('#setting-lang').val(settings.lang || 'auto');
            
            // 主题
            $('#setting-theme').val(settings.theme || 'auto');
            
            // 动画
            $('#setting-animations').prop('checked', settings.animations !== false);
            
            // GitHub 代理
            $('#setting-ghproxy-enable').prop('checked', settings.ghproxy_enable);
            $('#setting-ghproxy-url').val(settings.ghproxy_url || '');
            
            // 代理模式
            $('#setting-proxy-mode').val(settings.proxy_mode || 'none');
            $('#proxy-custom-fields').toggle(settings.proxy_mode === 'custom');
            $('#setting-proxy-host').val(settings.proxy_host || '');
            $('#setting-proxy-port').val(settings.proxy_port || '');
            
            // 启动方式
            $('#setting-launch-mode').val(settings.launch_mode || 'default');
            
            // 数据目录
            $('#setting-data-mode').val(settings.data_mode || 'default');
        }
    });
    
    // 模拟数据（实际使用时删除）
    setTimeout(function() {
        $('#check-node').html('<span style="color: #20a53a;">v20.10.0 已安装</span>');
        $('#check-git').html('<span style="color: #20a53a;">v2.43.0 已安装</span>');
    }, 300);
}

/**
 * 保存设置
 */
function saveSettings() {
    var settings = {
        lang: $('#setting-lang').val(),
        theme: $('#setting-theme').val(),
        animations: $('#setting-animations').prop('checked'),
        ghproxy_enable: $('#setting-ghproxy-enable').prop('checked'),
        ghproxy_url: $('#setting-ghproxy-url').val(),
        proxy_mode: $('#setting-proxy-mode').val(),
        proxy_host: $('#setting-proxy-host').val(),
        proxy_port: $('#setting-proxy-port').val(),
        launch_mode: $('#setting-launch-mode').val(),
        data_mode: $('#setting-data-mode').val()
    };
    
    request_plugin('save_settings', settings, function (rdata) {
        if (rdata.status) {
            layer.msg('设置已保存', { icon: 1 });
        } else {
            layer.msg(rdata.msg || '保存失败', { icon: 2 });
        }
    });
}

/**
 * 检测 Node.js
 */
function checkNode() {
    $('#check-node').html('<span class="stl-loading"></span> 检测中...');
    
    request_plugin('check_node', {}, function (rdata) {
        if (rdata.status) {
            $('#check-node').html('<span style="color: #20a53a;">' + rdata.version + ' 已安装</span>');
            layer.msg('Node.js 已安装', { icon: 1 });
        } else {
            $('#check-node').html('<span style="color: #d9534f;">未安装</span>');
            layer.msg(rdata.msg || 'Node.js 未安装', { icon: 2 });
        }
    });
    
    // 模拟数据（实际使用时删除）
    setTimeout(function() {
        $('#check-node').html('<span style="color: #20a53a;">v20.10.0 已安装</span>');
    }, 500);
}

/**
 * 检测 Git
 */
function checkGit() {
    $('#check-git').html('<span class="stl-loading"></span> 检测中...');
    
    request_plugin('check_git', {}, function (rdata) {
        if (rdata.status) {
            $('#check-git').html('<span style="color: #20a53a;">' + rdata.version + ' 已安装</span>');
            layer.msg('Git 已安装', { icon: 1 });
        } else {
            $('#check-git').html('<span style="color: #d9534f;">未安装</span>');
            layer.msg(rdata.msg || 'Git 未安装', { icon: 2 });
        }
    });
    
    // 模拟数据（实际使用时删除）
    setTimeout(function() {
        $('#check-git').html('<span style="color: #20a53a;">v2.43.0 已安装</span>');
    }, 500);
}
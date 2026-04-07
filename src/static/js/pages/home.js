/**
 * Home 页面 - 概览
 */

var plugin = __BT_PLUGIN__ || {};

function renderHomePage() {
    var html = 
        '<div class="stl-page active" id="page-home">' +
            // Banner
            '<img src="/{{#plugin_name#}}/static/images/banner.png" class="stl-banner" alt="Banner" onerror="this.style.display=\'none\'">' +
            
            // 系统信息与启动按钮
            '<div class="row">' +
                // 左侧：系统信息
                '<div class="col-md-7">' +
                    '<div class="stl-card">' +
                        '<div class="stl-card-title">' +
                            '<i class="bi bi-info-circle"></i> 系统信息' +
                        '</div>' +
                        '<div class="stl-info-item">' +
                            '<span class="stl-info-label"><i class="bi bi-box"></i> 启动器版本</span>' +
                            '<span class="stl-info-value" id="app-version">加载中...</span>' +
                        '</div>' +
                        '<div class="stl-info-item">' +
                            '<span class="stl-info-label"><i class="bi bi-terminal"></i> Node版本</span>' +
                            '<span class="stl-info-value" id="node-version">加载中...</span>' +
                        '</div>' +
                        '<div class="stl-info-item">' +
                            '<span class="stl-info-label"><i class="bi bi-cup"></i> 酒馆版本</span>' +
                            '<span class="stl-info-value" id="tavern-version">加载中...</span>' +
                        '</div>' +
                        '<div class="stl-info-item">' +
                            '<span class="stl-info-label"><i class="bi bi-play-circle"></i> 服务状态</span>' +
                            '<span class="stl-info-value"><span class="stl-status stl-status-stopped" id="service-status">未启动</span></span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                // 右侧：启动按钮
                '<div class="col-md-5">' +
                    // 合并：访问模式 + 启动服务
                    '<div class="stl-card">' +
                        // 访问模式
                        '<div class="stl-section-header">' +
                            '<i class="bi bi-globe"></i> 访问模式' +
                        '</div>' +
                        '<div class="stl-mode-switch">' +
                            '<button class="stl-mode-btn active" data-mode="lan" onclick="BTPlugin.switchMode(\'lan\')">' +
                                '<i class="bi bi-wifi"></i> 局域网模式' +
                            '</button>' +
                            '<button class="stl-mode-btn" data-mode="wan" onclick="BTPlugin.switchMode(\'wan\')">' +
                                '<i class="bi bi-globe"></i> 公网模式' +
                            '</button>' +
                        '</div>' +
                        // 启动服务
                        '<div class="stl-section-header" style="margin-top:20px;">' +
                            '<i class="bi bi-rocket"></i> 启动服务' +
                        '</div>' +
                        '<button class="btn btn-bt btn-start-large" id="btn-start" onclick="BTPlugin.startService()">' +
                            '<i class="bi bi-play-fill"></i>' +
                            '<span>启动 SillyTavern</span>' +
                        '</button>' +
                        '<button class="btn btn-bt-danger btn-start-large" id="btn-stop" onclick="BTPlugin.stopService()" style="display:none;">' +
                            '<i class="bi bi-stop-fill"></i>' +
                            '<span>停止服务</span>' +
                        '</button>' +
                        '<div class="stl-flex stl-flex-between" style="margin-top:15px;">' +
                            '<span class="text-muted" id="server-url" style="font-size:12px;"></span>' +
                            '<a href="javascript:void(0)" onclick="BTPlugin.openServer()" id="btn-visit" style="display:none;font-size:12px;">访问酒馆 <i class="bi bi-box-arrow-up-right"></i></a>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    $('.plugin_body').html(html);
    
    // 恢复保存的模式状态
    var savedMode = localStorage.getItem('stl_access_mode') || 'lan';
    $('.stl-mode-btn').removeClass('active');
    $('.stl-mode-btn[data-mode="' + savedMode + '"]').addClass('active');
    
    // 加载系统信息
    loadSystemInfo();
}

/**
 * 加载系统信息（后端接口预留）
 */
function loadSystemInfo() {
    // TODO: 后端接口实现后调用
    // request_plugin('get_system_info', {}, function(rdata) { ... });
    
    // 模拟数据（实际使用时删除）
    $('#app-version').text(plugin.version || '1.0.0');
    $('#node-version').text('v20.10.0');
    $('#tavern-version').text('v1.12.5');
}

/**
 * 打开目录
 */
function openDir(dirType) {
    request_plugin('open_directory', { dir_type: dirType }, function (rdata) {
        if (rdata.status) {
            layer.msg('目录已打开', { icon: 1 });
        }
    });
}

/**
 * 刷新系统信息
 */
function refreshInfo() {
    loadSystemInfo();
    layer.msg('信息已刷新', { icon: 1 });
}

/**
 * 启动服务
 */
function startService() {
    $('#btn-start').html('<span class="stl-loading"></span> 启动中...').prop('disabled', true);
    
    request_plugin('start_service', {}, function (rdata) {
        if (rdata.status) {
            $('#btn-start').hide();
            $('#btn-stop').show();
            $('#service-status').text('运行中').removeClass('stl-status-stopped').addClass('stl-status-started');
            
            // 显示访问链接
            if (rdata.url) {
                $('#server-url').text(rdata.url);
                $('#btn-visit').show();
            }
            
            layer.msg('服务已启动', { icon: 1 });
        } else {
            $('#btn-start').html('<i class="bi bi-play-fill"></i><span>启动 SillyTavern</span>').prop('disabled', false);
            layer.msg(rdata.msg || '启动失败', { icon: 2 });
        }
    });
}

/**
 * 停止服务
 */
function stopService() {
    $('#btn-stop').html('<span class="stl-loading"></span> 停止中...').prop('disabled', true);
    
    request_plugin('stop_service', {}, function (rdata) {
        if (rdata.status) {
            $('#btn-stop').hide();
            $('#btn-start').show();
            $('#service-status').text('已停止').removeClass('stl-status-started').addClass('stl-status-stopped');
            $('#server-url').text('');
            $('#btn-visit').hide();
            
            layer.msg('服务已停止', { icon: 1 });
        } else {
            $('#btn-stop').html('<i class="bi bi-stop-fill"></i><span>停止服务</span>').prop('disabled', false);
            layer.msg(rdata.msg || '停止失败', { icon: 2 });
        }
    });
}

/**
 * 打开酒馆页面
 */
function openServer() {
    var url = $('#server-url').text();
    if (url) {
        window.open(url, '_blank');
    }
}
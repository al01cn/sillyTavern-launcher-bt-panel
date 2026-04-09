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
                            '<span class="stl-info-label"><i class="bi bi-git"></i> Git版本</span>' +
                            '<span class="stl-info-value" id="git-status">加载中...</span>' +
                        '</div>' +
                        '<div class="stl-info-item">' +
                            '<span class="stl-info-label"><i class="bi bi-play-circle"></i> 服务状态</span>' +
                            '<span class="stl-info-value"><span class="stl-status stl-status-stopped" id="service-status">未启动</span></span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                
                // 右侧：启动按钮
                '<div class="col-md-5">' +
                    '<div class="stl-card">' +
                        '<div>' +
                            // 启动服务标题（与左侧系统信息样式一致）
                            '<div class="stl-card-title">' +
                                '<i class="bi bi-rocket"></i> 启动服务' +
                            '</div>' +
                            // 酒馆版本状态
                            '<div class="stl-info-item">' +
                                '<span class="stl-info-label"><i class="bi bi-cup"></i> 酒馆版本</span>' +
                                '<span class="stl-info-value" id="tavern-version">加载中...</span>' +
                            '</div>' +
                            // 访问模式（增加高度）
                            '<div class="stl-mode-switch">' +
                                '<button class="stl-mode-btn active" data-mode="lan" onclick="BTPlugin.switchMode(\'lan\')">' +
                                    '<i class="bi bi-wifi"></i> 局域网模式' +
                                '</button>' +
                                '<button class="stl-mode-btn" data-mode="wan" onclick="BTPlugin.switchMode(\'wan\')">' +
                                    '<i class="bi bi-globe"></i> 公网模式' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            // 启动/停止按钮
                            '<button class="btn btn-bt btn-start-large" id="btn-start" onclick="BTPlugin.startService()" style="padding:21px;">' +
                                '<i class="bi bi-play-fill"></i>' +
                                '<span>启动 SillyTavern</span>' +
                            '</button>' +
                            '<button class="btn btn-bt-danger btn-start-large" id="btn-stop" onclick="BTPlugin.stopService()" style="display:none;padding:21px;">' +
                                '<i class="bi bi-stop-fill"></i>' +
                                '<span>停止服务</span>' +
                            '</button>' +
                            // 访问链接
                            '<div class="stl-flex stl-flex-between"">' +
                                '<span class="text-muted" id="server-url" style="font-size:12px;"></span>' +
                                '<a href="javascript:void(0)" onclick="BTPlugin.openServer()" id="btn-visit" style="display:none;font-size:12px;">访问酒馆 <i class="bi bi-box-arrow-up-right"></i></a>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    $('.plugin_body').html(html);
    
    // 恢复保存的模式状态，默认公网模式
    var savedMode = localStorage.getItem('stl_access_mode') || 'wan';
    $('.stl-mode-btn').removeClass('active');
    $('.stl-mode-btn[data-mode="' + savedMode + '"]').addClass('active');
    
    // 加载系统信息
    loadSystemInfo();
}

/**
 * 加载系统信息
 */
function loadSystemInfo() {
    // 插件版本从全局变量获取（已由宝塔注入）
    $('#app-version').text(plugin.version || '-');
    
    // 优先从缓存读取 Node 和 Git 版本
    var nodeCache = CacheUtil.localGet('ENV_CHECK_NODE', null);
    var gitCache = CacheUtil.localGet('ENV_CHECK_GIT', null);
    
    if (nodeCache && nodeCache.installed) {
        $('#node-version').text(nodeCache.version || '未检测到');
    } else if (nodeCache && !nodeCache.installed) {
        $('#node-version').text('未安装');
    } else {
        $('#node-version').text('检测中...');
    }
    
    if (gitCache && gitCache.installed) {
        $('#git-status').text(gitCache.version || '未检测到');
    } else if (gitCache && !gitCache.installed) {
        $('#git-status').text('未安装');
    } else {
        $('#git-status').text('检测中...');
    }
    
    // 从后端获取酒馆版本和其他信息（如果缓存不存在则更新缓存）
    request_plugin('get_system_info', {}, function(rdata) {
        if (rdata.status) {
            // 更新 Node 版本显示并写缓存
            if (rdata.node_version) {
                $('#node-version').text(rdata.node_version);
                CacheUtil.localSet('ENV_CHECK_NODE', {
                    installed: true,
                    version: rdata.node_version
                });
            } else if ($('#node-version').text() === '检测中...') {
                $('#node-version').text('未检测到');
                CacheUtil.localSet('ENV_CHECK_NODE', {
                    installed: false,
                    version: ''
                });
            }
            
            // 更新 Git 版本显示并写缓存
            if (rdata.git_version) {
                $('#git-status').text(rdata.git_version);
                CacheUtil.localSet('ENV_CHECK_GIT', {
                    installed: true,
                    version: rdata.git_version
                });
            } else if ($('#git-status').text() === '检测中...') {
                $('#git-status').text('未检测到');
                CacheUtil.localSet('ENV_CHECK_GIT', {
                    installed: false,
                    version: ''
                });
            }
            
            // 更新酒馆版本
            $('#tavern-version').text(rdata.tavern_version || '未安装');
        }
    });
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
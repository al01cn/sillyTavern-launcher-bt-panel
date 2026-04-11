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
                            '<span class="stl-info-value">' +
                                '<span class="stl-status stl-status-stopped" id="service-status">未启动</span>' +
                                '<button class="stl-proxy-btn" id="btn-proxy-manage" onclick="ProxyModal.open()" style="margin-left:8px;" title="管理反向代理">' +
                                    '<i class="bi bi-shield-lock"></i> 反向代理' +
                                '</button>' +
                                '<button class="btn btn-bt btn-bt-sm" id="btn-visit-home" onclick="NetworkModal.open()" style="margin-left:8px;display:none;">' +
                                    '<i class="bi bi-box-arrow-up-right"></i> 访问酒馆' +
                                '</button>' +
                            '</span>' +
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
                                '<button class="stl-mode-btn" data-mode="lan" onclick="BTPlugin.switchMode(\'lan\')">' +
                                    '<i class="bi bi-wifi"></i> 局域网模式' +
                                '</button>' +
                                '<button class="stl-mode-btn active" data-mode="wan" onclick="BTPlugin.switchMode(\'wan\')">' +
                                    '<i class="bi bi-globe"></i> 公网模式' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            // 启动/停止按钮
                            '<button class="btn btn-bt btn-start-large btn-disabled" id="btn-start" onclick="BTPlugin.startService()" style="padding:21px;" disabled>' +
                                '<i class="bi bi-play-fill"></i>' +
                                '<span>启动 SillyTavern</span>' +
                            '</button>' +
                            '<button class="btn btn-bt-danger btn-start-large" id="btn-stop" onclick="BTPlugin.stopService()" style="display:none;padding:21px;" disabled>' +
                                '<i class="bi bi-stop-fill"></i>' +
                                '<span>停止服务</span>' +
                            '</button>' +
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
    
    // 检查服务状态，同步按钮显示
    checkServiceStatus();
}

/**
 * 检查服务状态并同步UI
 * 同时检查酒馆安装状态和PM2进程运行状态，决定按钮启用/禁用
 */
function checkServiceStatus() {
    // 先获取安装状态
    request_plugin('get_startup_info', {}, function(startupData) {
        if (!startupData) startupData = {};
        var tavernInstalled = startupData && startupData.status && startupData.tavern_installed;
        
        // 再获取进程状态
        request_plugin('pm2_status', {}, function(rdata) {
            if (!rdata) rdata = {};
            var running = rdata && rdata.status && rdata.running;
            
            if (running) {
                // 服务正在运行
                $('#btn-start').hide();
                $('#btn-stop').show().prop('disabled', false).removeClass('btn-disabled');
                $('#service-status').text('运行中').removeClass('stl-status-stopped').addClass('stl-status-started');
                $('#btn-visit-home').show();
            } else if (rdata && rdata.status) {
                // pm2_status 成功返回，但进程不在运行
                $('#btn-start').show();
                $('#btn-stop').hide();
                $('#service-status').text('已停止').removeClass('stl-status-started').addClass('stl-status-stopped');
                $('#btn-visit-home').hide();
                
                // 启用/禁用启动按钮：酒馆已安装才启用
                if (tavernInstalled) {
                    $('#btn-start').prop('disabled', false).removeClass('btn-disabled');
                } else {
                    $('#btn-start').prop('disabled', true).addClass('btn-disabled');
                }
            } else {
                // pm2_status 请求失败（PM2 可能不可用）
                // 不盲目更新状态，保持当前显示
                // 按钮禁用处理
                $('#btn-start').prop('disabled', true).addClass('btn-disabled');
                $('#btn-stop').prop('disabled', true).addClass('btn-disabled');
                console.warn('服务状态检查失败:', rdata ? rdata.msg : '未知错误');
            }
        });
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
    
    // 第一步：获取环境信息
    request_plugin('get_startup_info', {}, function(envData) {
        if (!envData.status) {
            $('#btn-start').html('<i class="bi bi-play-fill"></i><span>启动 SillyTavern</span>').prop('disabled', false);
            layer.msg('获取环境信息失败', { icon: 2 });
            return;
        }
        
        // 检查酒馆是否安装
        if (!envData.tavern_installed) {
            $('#btn-start').html('<i class="bi bi-play-fill"></i><span>启动 SillyTavern</span>').prop('disabled', false);
            layer.confirm('SillyTavern 尚未安装，是否前往安装？', {
                btn: ['去安装', '取消']
            }, function(index) {
                BTPlugin.showPage('versions');
                layer.close(index);
            });
            return;
        }
        
        // 检查PM2是否安装
        if (!envData.pm2_installed) {
            $('#btn-start').html('<i class="bi bi-play-fill"></i><span>启动 SillyTavern</span>').prop('disabled', false);
            layer.confirm('PM2 未安装，是否立即安装？', {
                btn: ['安装', '取消']
            }, function(index) {
                // 调用 PM2 自动安装功能
                if (window.Pm2 && typeof window.Pm2.autoInstallPm2 === 'function') {
                    window.Pm2.autoInstallPm2(function(rdata) {
                        if (rdata.status) {
                            layer.msg('PM2 安装成功，请重新点击启动', { icon: 1 });
                        } else {
                            layer.msg(rdata.msg || 'PM2 安装失败', { icon: 2 });
                        }
                    });
                } else {
                    layer.msg('PM2 自动安装功能不可用，请手动安装', { icon: 2 });
                }
                layer.close(index);
            });
            return;
        }
        
        // 第二步：执行启动
        request_plugin('start_service', {}, function (rdata) {
            if (rdata.status) {
                $('#btn-start').hide();
                $('#btn-stop').show();
                $('#service-status').text('运行中').removeClass('stl-status-stopped').addClass('stl-status-started');
                $('#btn-visit-home').show();
                
                // 先通知控制台页面（在跳转之前），传递 GitHub 加速日志
                if (window.ConsolePage && typeof window.ConsolePage.onServiceStart === 'function') {
                    window.ConsolePage.onServiceStart(envData, rdata.github_logs);
                }
                
                // 然后跳转到控制台页面
                BTPlugin.showPage('console');
                
                layer.msg('服务已启动', { icon: 1 });
            } else {
                $('#btn-start').html('<i class="bi bi-play-fill"></i><span>启动 SillyTavern</span>').prop('disabled', false);
                layer.msg(rdata.msg || '启动失败', { icon: 2 });
            }
        });
    });
}

/**
 * 停止服务
 */
function stopService() {
    $('#btn-stop').html('<span class="stl-loading"></span> 停止中...').prop('disabled', true);

    // 立即停止轮询，不等后端返回
    if (window.ConsolePage && typeof window.ConsolePage.onServiceStop === 'function') {
        window.ConsolePage.onServiceStop();
    }

    request_plugin('stop_service', {}, function (rdata) {
        if (rdata.status) {
            $('#btn-stop').hide();
            $('#btn-start').show();
            $('#service-status').text('已停止').removeClass('stl-status-started').addClass('stl-status-stopped');
            $('#btn-visit-home').hide();
            
            // 检查酒馆是否已安装，决定是否启用启动按钮
            request_plugin('get_startup_info', {}, function(startupData) {
                if (!startupData) startupData = {};
                var tavernInstalled = startupData && startupData.status && startupData.tavern_installed;
                
                if (tavernInstalled) {
                    $('#btn-start').prop('disabled', false).removeClass('btn-disabled');
                } else {
                    $('#btn-start').prop('disabled', true).addClass('btn-disabled');
                }
            });
            
            layer.msg('服务已停止', { icon: 1 });
        } else {
            $('#btn-stop').html('<i class="bi bi-stop-fill"></i><span>停止服务</span>').prop('disabled', false);
            layer.msg(rdata.msg || '停止失败', { icon: 2 });
            // 如果停止失败，恢复轮询
            if (window.ConsolePage && typeof window.ConsolePage.onServiceResume === 'function') {
                window.ConsolePage.onServiceResume();
            }
        }
    });
}


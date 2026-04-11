/**
 * SillyTavern Launcher 宝塔插件 - 主入口
 * 负责路由切换和工具函数，页面逻辑在各 pages 目录
 */

var BTPlugin = (function () {
    "use strict";

    var plugin = __BT_PLUGIN__ || {};
    var currentPage = 'home';

    // ======== 宝塔面板初始化 ========

    // 定义窗口尺寸
    $('.layui-layer-page').css({ 'width': '900px' });

    // ======== 请求封装 ========

    /**
     * 发送请求到插件（宝塔标准方式）
     */
    function request_plugin(func, args, callback, timeout) {
        if (!timeout) timeout = 3600 * 1000;
        $.ajax({
            type: 'POST',
            url: '/plugin?action=a&s=' + func + '&name=' + plugin.name,
            data: args,
            timeout: timeout,
            success: function (rdata) {
                if (!callback) {
                    layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
                    return;
                }
                return callback(rdata);
            },
            error: function (xhr, status, error) {
                console.error('Request failed:', status, error);
                if (callback) {
                    callback({ status: false, msg: '请求失败: ' + error });
                }
            }
        });
    }

    // ======== 页面切换 ========

    /**
     * 显示指定页面
     */
    function showPage(page) {
        // 触发旧页面隐藏事件前，先标记控制台页面的活跃状态
        if (currentPage === 'console') {
            if (window.ConsolePage && typeof window.ConsolePage._setConsoleActive === 'function') {
                window.ConsolePage._setConsoleActive(false);
            }
        }

        // 触发旧页面隐藏事件
        if (currentPage) {
            $(document).trigger('stl-page-hidden', [currentPage]);
        }
        
        currentPage = page;
        
        // 更新菜单选中状态
        $(".stl-nav-item").removeClass('active');
        var menuMap = { 
            'home': 0, 'tavern': 1, 'versions': 2, 
            'extensions': 3, 'resources': 4, 
            'console': 5, 'settings': 6
        };
        $(".stl-nav-item").eq(menuMap[page] || 0).addClass('active');
        
        // 调用对应页面的渲染函数
        var fnName = 'render' + page.charAt(0).toUpperCase() + page.slice(1) + 'Page';
        var renderFn = window[fnName];
        if (typeof renderFn === 'function') {
            renderFn();
        } else {
            renderHomePage();
        }
        
        // 切换到首页或控制台时，重新检测服务状态以更新按钮
        if (page === 'home' && typeof checkServiceStatus === 'function') {
            checkServiceStatus();
        }
        
        // 触发新页面显示事件
        $(document).trigger('stl-page-shown', [page]);
    }

    // ======== 通用操作 ========

    /**
     * 切换版本
     */
    function switchVersion(path) {
        request_plugin('switch_version', { path: path }, function (rdata) {
            if (rdata.status) {
                layer.msg('版本切换成功', { icon: 1 });
                showPage('versions');
            } else {
                layer.msg(rdata.msg || '切换失败', { icon: 2 });
            }
        });
    }

    /**
     * 删除版本
     */
    function removeVersion(path) {
        layer.confirm('确定要删除这个版本吗？', function (index) {
            request_plugin('remove_version', { path: path }, function (rdata) {
                if (rdata.status) {
                    layer.msg('删除成功', { icon: 1 });
                    showPage('versions');
                } else {
                    layer.msg(rdata.msg || '删除失败', { icon: 2 });
                }
            });
            layer.close(index);
        });
    }

    /**
     * 下载版本
     */
    function downloadVersion(version) {
        layer.msg('正在下载 ' + version + '...', { icon: 16, time: 0 });
        request_plugin('download_version', { version: version }, function (rdata) {
            layer.closeAll();
            if (rdata.status) {
                layer.msg('下载完成', { icon: 1 });
                showPage('versions');
            } else {
                layer.msg(rdata.msg || '下载失败', { icon: 2 });
            }
        });
    }

/**
 * 切换访问模式
 */
function switchMode(mode) {
    $('.stl-mode-btn').removeClass('active');
    $('.stl-mode-btn[data-mode="' + mode + '"]').addClass('active');
    
    // 保存选择到 localStorage
    localStorage.setItem('stl_access_mode', mode);
    
    // 调用后端更新配置
    request_plugin('set_config', { key: 'access_mode', value: mode }, function(rdata) {
        if (rdata && rdata.status) {
            layer.msg('已切换至 ' + (mode === 'lan' ? '局域网' : '公网') + '模式', { icon: 1, time: 1500 });
            
            // 如果当前在酒馆配置页面，提示用户刷新
            if (typeof TavernConfig !== 'undefined' && $('#page-tavern').length > 0 && $('#page-tavern').hasClass('active')) {
                layer.confirm('访问模式已更改，是否立即刷新配置以查看更新后的白名单？', {
                    btn: ['立即刷新', '稍后'],
                    icon: 3,
                    title: '提示'
                }, function(idx) {
                    TavernConfig.loadConfig(function(success) {
                        if (success) {
                            layer.msg('配置已刷新', { icon: 1 });
                        }
                    });
                    layer.close(idx);
                });
            }
        } else {
            layer.msg('模式切换失败', { icon: 2 });
        }
    });
}

/**
 * 切换到在线安装版本（默认路径）
 */
function switchToOnlineVersion() {
    layer.confirm('确定要切换到在线安装的默认版本吗？', {
        icon: 3,
        title: '确认切换'
    }, function(index) {
        layer.close(index);
        var loadingIndex = layer.load(1, { shade: [0.3, '#000'] });
        
        // 将配置置空，后端会自动寻址到默认路径
        request_plugin('set_tavern_path', { path: '' }, function(rdata) {
            layer.close(loadingIndex);
            if (rdata && rdata.status) {
                layer.msg('已切换到在线版本', { icon: 1 });
                // 如果当前在版本页，刷新列表和在线卡片
                // 注意：需要先刷新，因为 set_tavern_path 已经更新了 is_default
                if (typeof loadOnlineInstallCard === 'function') {
                    loadOnlineInstallCard();
                }
                if (typeof loadLocalInstances === 'function') {
                    loadLocalInstances();
                }
            } else {
                layer.msg('切换失败', { icon: 2 });
            }
        });
    });
}

// ======== 公开接口 ========

return {
    // 页面切换
    showPage: showPage,
    
    // 通用操作
    switchVersion: switchVersion,
    removeVersion: removeVersion,
    downloadVersion: downloadVersion,
    switchMode: switchMode,
    switchToOnlineVersion: switchToOnlineVersion,
    
    // 版本管理（新版本）——运行时代理，避免 IIFE 执行时 window.* 尚未加载
    switchVersionTab: function() { return window.switchVersionTab && window.switchVersionTab.apply(this, arguments); },
    addStInstance: function() { return window.addStInstance && window.addStInstance.apply(this, arguments); },
    doSwitchInstance: function() { return window.doSwitchInstance && window.doSwitchInstance.apply(this, arguments); },
    doRemoveInstance: function() { return window.doRemoveInstance && window.doRemoveInstance.apply(this, arguments); },
    doInstallDeps: function() { return window.doInstallDeps && window.doInstallDeps.apply(this, arguments); },
    doRepairDeps: function() { return window.doRepairDeps && window.doRepairDeps.apply(this, arguments); },
    checkForUpdate: function() { return window.checkForUpdate && window.checkForUpdate.apply(this, arguments); },
    installLatestVersion: function() { return window.installLatestVersion && window.installLatestVersion.apply(this, arguments); },
    
    // 页面函数（运行时代理）
    startService: function() { return window.startService && window.startService.apply(this, arguments); },
    stopService: function() { return window.stopService && window.stopService.apply(this, arguments); },
    forceStopService: function() { return window.forceStopService && window.forceStopService.apply(this, arguments); },
    openServer: function() { return window.openServer && window.openServer.apply(this, arguments); },
    saveSettings: function() { return window.saveSettings && window.saveSettings.apply(this, arguments); },
    checkNode: function() { return window.checkNode && window.checkNode.apply(this, arguments); },
    checkGit: function() { return window.checkGit && window.checkGit.apply(this, arguments); },
    installNodeJs: function() { return window.installNodeJs && window.installNodeJs.apply(this, arguments); },
    clearLogs: function() { return window.clearLogs && window.clearLogs.apply(this, arguments); },
    
        // 兼容旧接口
        show_index: renderHomePage,
        get_logs: renderConsolePage,
        hello: function() {
            request_plugin('ping', {}, function (rdata) {
                layer.msg(rdata.msg || 'Hello World!', { icon: 1 });
            });
        }
    };
})();

// 将 request_plugin 暴露到全局作用域，供页面 JS 调用
(function() {
    var plugin = __BT_PLUGIN__ || {};
    window.request_plugin = function(func, args, callback, timeout) {
        if (!timeout) timeout = 3600 * 1000;
        $.ajax({
            type: 'POST',
            url: '/plugin?action=a&s=' + func + '&name=' + plugin.name,
            data: args,
            timeout: timeout,
            success: function (rdata) {
                if (!callback) {
                    layer.msg(rdata.msg, { icon: rdata.status ? 1 : 2 });
                    return;
                }
                return callback(rdata);
            },
            error: function (xhr, status, error) {
                console.error('Request failed:', status, error);
                if (callback) {
                    callback({ status: false, msg: '请求失败: ' + error });
                }
            }
        });
    };
})();

// 页面加载完成后初始化
$(document).ready(function() {
    BTPlugin.showPage('home');
});
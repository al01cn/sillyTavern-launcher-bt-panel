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
    
    layer.msg('已切换至 ' + (mode === 'lan' ? '局域网' : '公网') + '模式', { icon: 1 });
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
    
    // 版本管理（新版本）
    switchVersionTab: window.switchVersionTab,
    addStInstance: window.addStInstance,
    doSwitchInstance: window.doSwitchInstance,
    doRemoveInstance: window.doRemoveInstance,
    checkForUpdate: window.checkForUpdate,
    installLatestVersion: window.installLatestVersion,
    
    // 页面函数（从全局作用域获取）
    startService: window.startService,
    stopService: window.stopService,
    openServer: window.openServer,
    saveSettings: window.saveSettings,
    checkNode: window.checkNode,
    checkGit: window.checkGit,
        
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
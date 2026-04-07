/**
 * 插件前端交互脚本
 *
 * 插件信息通过 __BT_PLUGIN__ 获取（来自 package.js，已冻结不可篡改）
 */

var BTPlugin = (function () {
    "use strict";

    var plugin = __BT_PLUGIN__ || {};

    // ======== 宝塔面板初始化 ========

    // 定义窗口尺寸
    $('.layui-layer-page').css({ 'width': '900px' });

    // 左侧菜单切换效果
    $(".bt-w-menu p").click(function () {
        $(this).addClass('bgw').siblings().removeClass('bgw');
    });

    // ======== 请求封装 ========

    /**
     * 发送请求到插件（宝塔标准方式）
     *
     * @param {string} func       - 后端方法名（对应 _main.py 中的方法）
     * @param {object} args       - 传到插件方法中的参数
     * @param {function} callback - 处理函数，响应内容传入第一个参数
     * @param {number} timeout    - 超时时间（毫秒），默认 1 小时
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
            }
        });
    }

    // ======== 页面内容 ========

    /**
     * 构建概览页
     */
    function show_index() {
        var html = '<div class="bt-plugin-demo">'
            + '<div class="logos">'
            + '<img id="bt-plugin-icon" src="https://ghfast.top/https://raw.githubusercontent.com/al01cn/sillyTavern-launcher/GUI/public/logo.png" alt="Plugin-Icon">'
            + '<span class="plus">+</span>'
            + '<img src="https://www.bt.cn/static/astro/icon/logo.svg" alt="BT-Logo">'
            + '</div>'
            + '<h2>' + (plugin.title || 'Plugin') + '</h2>'
            + '<span class="version">v' + (plugin.version || '1.0') + '</span>'
            + '<button class="btn" onclick="BTPlugin.hello()">Hello World</button>'
            + '</div>';
        $('.plugin_body').html(html);
    }

    /**
     * Hello World demo - 请求后端 ping 接口
     */
    function hello() {
        request_plugin('ping', {}, function (rdata) {
            layer.msg(rdata.msg || 'Hello World!', { icon: 1 });
        });
    }

    // ======== 初始化 ========

    // 第一次打开窗口时调用
    show_index();

    // 公开接口
    return {
        show_index: show_index,
        request: request_plugin,
        hello: hello,
    };
})();

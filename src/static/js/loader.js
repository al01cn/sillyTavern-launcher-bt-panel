/**
 * STL 异步脚本加载器
 * 将 35 个同步 <script> 改为并行预下载 + 顺序执行，显著减少首屏阻塞时间
 * 依赖层级：Layer0(无依赖) → Layer1(工具/UI/核心) → Layer2(页面) → Layer3(入口)
 */
(function () {
    'use strict';

    var BASE = '/{{#plugin_name#}}/static/js/';

    // 各层脚本列表（同层并行下载，下一层在上一层全部执行后再执行）
    var LAYERS = [
        // Layer 0 — 第三方库 + 基础工具（无依赖，可并行）
        [
            'gstinfo.js',
            'jquery.qrcode.min.js',
            'jszip.min.js',
            'lib/cache.js',
            'lib/config.js',
            'lib/qrcode.js',
            'package.js'
        ],
        // Layer 1 — 扩展工具、UI 组件、核心模块（依赖 Layer 0）
        [
            'lib/jszip.js',
            'ui/folder_selector.js',
            'lib/character-card-modal.js',
            'lib/world-info-modal.js',
            'lib/chat-modal.js',
            'lib/upload-char-modal.js',
            'lib/upload-world-modal.js',
            'core/nginx.js',
            'lib/proxy-modal.js',
            'lib/network-modal.js',
            'core/nodejs.js',
            'core/pm2.js',
            'core/git.js',
            'core/github_proxy.js',
            'core/sillytavern/index.js',
            'core/sillytavern/config_manager.js'
        ],
        // Layer 2 — 页面模块（依赖 Layer 1）
        [
            'pages/home.js',
            'pages/tavern.js',
            'pages/console.js',
            'pages/versions.js',
            'pages/extensions.js',
            'pages/resources.js',
            'pages/settings.js'
        ],
        // Layer 3 — 主入口（最后执行）
        [
            'main.js'
        ]
    ];

    /**
     * 预加载（fetch）一组脚本，返回 Promise<Array<{src, text}>>
     * 利用浏览器的并行连接同时下载同层所有文件
     */
    function prefetchLayer(scripts) {
        return Promise.all(scripts.map(function (s) {
            return fetch(BASE + s)
                .then(function (res) {
                    if (!res.ok) throw new Error('Failed to load: ' + s + ' (' + res.status + ')');
                    return res.text();
                })
                .then(function (text) {
                    return { src: s, text: text };
                });
        }));
    }

    /**
     * 执行一组已下载的脚本（按顺序通过 <script> 标签注入）
     */
    function execScripts(results) {
        results.forEach(function (item) {
            try {
                var script = document.createElement('script');
                script.text = item.text;
                // 保留 sourceURL 方便 DevTools 调试
                script.text += '\n//# sourceURL=' + BASE + item.src;
                document.head.appendChild(script);
            } catch (e) {
                console.error('[STL Loader] Error executing ' + item.src, e);
            }
        });
    }

    /**
     * 递归处理每一层：先并行预下载，下载完成后按序执行，再处理下一层
     */
    function processLayer(index) {
        if (index >= LAYERS.length) {
            // 所有层执行完毕，隐藏骨架屏
            var skeleton = document.getElementById('stl-skeleton');
            if (skeleton) skeleton.style.display = 'none';
            return;
        }

        var layer = LAYERS[index];

        // 同层并行预下载
        prefetchLayer(layer)
            .then(function (results) {
                // 按原始顺序执行（results 顺序由 Promise.all 保证）
                execScripts(results);
                // 处理下一层
                processLayer(index + 1);
            })
            .catch(function (err) {
                console.error('[STL Loader] Layer ' + index + ' failed:', err);
                // 出错不阻断后续层，继续尝试
                processLayer(index + 1);
            });
    }

    // 启动加载
    processLayer(0);

})();

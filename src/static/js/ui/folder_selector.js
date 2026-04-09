/**
 * 文件夹选择器组件
 * 基于宝塔面板 files?action=GetDir API 实现
 * 用于让用户选择目录路径
 */

var FolderSelector = (function() {
    "use strict";

    /**
     * 打开文件夹选择器
     * @param {Object} options - 配置选项
     * @param {string} options.title - 弹窗标题，默认"选择文件夹"
     * @param {string} options.startPath - 起始路径，默认"/www"
     * @param {function} options.onSelect - 选择回调 function(path)
     * @param {function} options.onCancel - 取消回调 function()
     */
    function open(options) {
        options = options || {};
        var title = options.title || '选择文件夹';
        var startPath = options.startPath || '/www';
        var onSelect = options.onSelect || function() {};
        var onCancel = options.onCancel || function() {};

        // 当前状态
        var currentPath = startPath;
        var selectedPath = null;

        // 创建弹窗 HTML
        var html = createDialogHtml(currentPath);

        // 打开弹窗
        var dialogIndex = layer.open({
            type: 1,
            title: '<i class="bi bi-folder2-open"></i> ' + title,
            area: ['750px', '550px'],
            content: html,
            btn: ['确定', '取消'],
            shadeClose: false,
            success: function(layero, index) {
                // 加载初始目录
                loadDirectory(currentPath);

                // 绑定事件
                bindEvents(layero, index);
            },
            yes: function(index) {
                // 确定按钮
                if (selectedPath) {
                    layer.close(index);
                    onSelect(selectedPath);
                } else {
                    layer.msg('请先选择一个文件夹', { icon: 2 });
                }
            },
            cancel: function(index) {
                // 取消按钮
                layer.close(index);
                onCancel();
            }
        });

        /**
         * 加载目录内容
         */
        function loadDirectory(path) {
            currentPath = path;
            $('#fs-current-path').val(path);
            $('#fs-file-list').html('<div class="fs-loading"><i class="bi bi-arrow-repeat spin"></i> 加载中...</div>');

            // 自动选择当前浏览的目录
            selectPath(path);

            // 调用面板 API
            $.ajax({
                url: '/files?action=GetDir',
                type: 'POST',
                data: {
                    path: path,
                    disk: true,
                    search: ''
                },
                success: function(res) {
                    if (res && res.DIR) {
                        renderFileList(res.DIR, res.FILES, path);
                    } else {
                        $('#fs-file-list').html('<div class="fs-empty"><i class="bi bi-exclamation-triangle" style="color:#f44747;font-size:32px;"></i><div style="color:#f44747;">加载失败</div></div>');
                    }
                },
                error: function() {
                    $('#fs-file-list').html('<div class="fs-empty"><i class="bi bi-wifi-off" style="color:#f44747;font-size:32px;"></i><div style="color:#f44747;">网络错误</div></div>');
                }
            });
        }

        /**
         * 渲染文件列表
         */
        function renderFileList(dirs, files, currentPath) {
            var html = '';

            // 添加上级目录
            if (currentPath !== '/') {
                var parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
                html += '<div class="fs-item fs-dir" data-path="' + parentPath + '">' +
                    '<i class="bi bi-arrow-90deg-up"></i>' +
                    '<span class="fs-name">..</span>' +
                    '<span class="fs-meta"><span class="fs-time">上级目录</span></span>' +
                '</div>';
            }

            // 渲染目录
            if (dirs && dirs.length > 0) {
                dirs.forEach(function(dirStr) {
                    var parts = dirStr.split(';');
                    var name = parts[0] || '';
                    var modTime = parts[2] || '';
                    var perms = parts[3] || '';

                    // 跳过隐藏目录（除了 . 和 ..）
                    if (name.startsWith('.') && name !== '.' && name !== '..') {
                        return;
                    }

                    var dateStr = formatTimestamp(modTime);
                    html += '<div class="fs-item fs-dir" data-path="' + currentPath + '/' + name + '">' +
                        '<i class="bi bi-folder-fill"></i>' +
                        '<span class="fs-name">' + escapeHtml(name) + '</span>' +
                        '<span class="fs-meta">' +
                            '<span class="fs-time">' + dateStr + '</span>' +
                            '<span class="fs-perms">' + perms + '</span>' +
                        '</span>' +
                    '</div>';
                });
            }

            // 渲染文件（可选，这里只显示目录）
            // if (files && files.length > 0) { ... }

            if (html === '') {
                html = '<div class="fs-empty">' +
                    '<i class="bi bi-folder2-open"></i>' +
                    '<div>空目录</div>' +
                '</div>';
            }

            $('#fs-file-list').html(html);

            // 绑定项目点击事件 - 单击选中目录
            $('.fs-item').on('click', function(e) {
                e.stopPropagation();
                var itemPath = $(this).data('path');

                if ($(this).hasClass('fs-dir')) {
                    // 如果是 ".."，进入上级目录
                    if ($(this).find('.fs-name').text() === '..') {
                        var parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
                        loadDirectory(parentPath);
                    } else {
                        // 选中当前点击的目录
                        selectPath(itemPath);
                    }
                }
            });

            // 双击进入子目录
            $('.fs-dir').on('dblclick', function(e) {
                e.stopPropagation();
                var itemPath = $(this).data('path');
                
                // 如果是 ".."，已经在单击事件中处理了
                if ($(this).find('.fs-name').text() === '..') {
                    return;
                }
                
                if (itemPath) {
                    loadDirectory(itemPath);
                }
            });
        }

        /**
         * 选择路径
         */
        function selectPath(path) {
            selectedPath = path;
            $('#fs-selected-path').text(path);
            $('.fs-item').removeClass('selected');
            $('.fs-item[data-path="' + path + '"]').addClass('selected');
        }

        /**
         * 绑定事件
         */
        function bindEvents(layero, index) {
            // 路径输入框回车
            $('#fs-current-path').on('keypress', function(e) {
                if (e.which === 13) {
                    var path = $(this).val().trim();
                    if (path) {
                        loadDirectory(path);
                    }
                }
            });

            // 快速跳转按钮
            $('#fs-goto-path').on('click', function() {
                var path = $('#fs-current-path').val().trim();
                if (path) {
                    loadDirectory(path);
                }
            });

            // 常用路径快捷方式
            $('.fs-quick-path').on('click', function() {
                var path = $(this).data('path');
                loadDirectory(path);
            });
        }
    }

    /**
     * 创建弹窗 HTML
     */
    function createDialogHtml(currentPath) {
        return '<div class="folder-selector-container">' +
            // 工具栏 - 快捷路径
            '<div class="fs-toolbar">' +
                '<span class="fs-toolbar-label">快速访问：</span>' +
                '<button class="btn btn-default btn-xs fs-quick-path" data-path="/www"><i class="bi bi-house"></i> /www</button>' +
                '<button class="btn btn-default btn-xs fs-quick-path" data-path="/www/server"><i class="bi bi-server"></i> /www/server</button>' +
                '<button class="btn btn-default btn-xs fs-quick-path" data-path="/home"><i class="bi bi-person"></i> /home</button>' +
                '<button class="btn btn-default btn-xs fs-quick-path" data-path="/root"><i class="bi bi-terminal"></i> /root</button>' +
            '</div>' +

            // 路径导航栏
            '<div class="fs-path-bar">' +
                '<i class="bi bi-folder2-open fs-path-icon"></i>' +
                '<input type="text" id="fs-current-path" value="' + escapeHtml(currentPath) + '" ' +
                    'class="fs-path-input" ' +
                    'placeholder="输入路径..." />' +
                '<button id="fs-goto-path" class="btn btn-success btn-xs"><i class="bi bi-arrow-right"></i></button>' +
            '</div>' +

            // 文件列表头部
            '<div class="fs-list-header">' +
                '<span class="fs-col-name">名称</span>' +
                '<span class="fs-col-time">修改时间</span>' +
                '<span class="fs-col-perms">权限</span>' +
            '</div>' +

            // 文件列表
            '<div id="fs-file-list" class="fs-file-list">' +
                '<div class="fs-loading"><i class="bi bi-arrow-repeat spin"></i> 加载中...</div>' +
            '</div>' +

            // 底部状态栏
            '<div class="fs-status-bar">' +
                '<span class="fs-status-label">已选择：</span>' +
                '<code id="fs-selected-path" class="fs-selected-path">未选择</code>' +
            '</div>' +
        '</div>';
    }

    /**
     * 格式化时间戳
     */
    function formatTimestamp(timestamp) {
        if (!timestamp) return '-';
        var date = new Date(parseInt(timestamp) * 1000);
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    /**
     * HTML 转义
     */
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 公开接口
    return {
        open: open
    };
})();

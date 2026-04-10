/**
 * Extensions 页面 - 扩展管理
 */

var ExtensionsPage = {
    selectedVersion: null,
    extensions: [],
    loading: false,
    showOfficial: false,
    currentPage: 1,
    itemsPerPage: 5,

    init: function() {
        this.render();
        this.loadVersions();
    },

    render: function() {
        var html = 
            '<div class="stl-page active" id="page-extensions">' +
                // Header
                '<div class="stl-ext-page-header">' +
                    '<div class="stl-ext-title">' +
                        '<h2>扩展管理</h2>' +
                        '<p>管理 SillyTavern 的功能扩展与插件</p>' +
                    '</div>' +
                    '<div style="display: flex; gap: 10px;">' +
                        '<button class="btn btn-bt" onclick="ExtensionsPage.openInstallDialog()">' +
                            '<i class="bi bi-download"></i> 安装扩展' +
                        '</button>' +
                        '<button class="btn btn-default" onclick="ExtensionsPage.copyExtensionPath()">' +
                            '<i class="bi bi-clipboard"></i> 复制路径' +
                        '</button>' +
                    '</div>' +
                '</div>' +

                // Version Info
                '<div class="stl-ext-card" style="padding: 15px;">' +
                    '<div style="display: flex; align-items: center; gap: 12px;">' +
                        '<div class="stl-version-icon"><i class="bi bi-box-seam"></i></div>' +
                        '<div>' +
                            '<div style="font-weight: 600; color: #333;">当前酒馆版本</div>' +
                            '<div id="ext-current-version" style="font-size: 12px; color: #999;">加载中...</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                // List Container
                '<div class="stl-ext-card">' +
                    '<div style="padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">' +
                        '<h3 style="margin: 0; font-size: 15px; font-weight: bold;"><i class="bi bi-puzzle" style="color: #ccc; margin-right: 8px;"></i>已安装的扩展</h3>' +
                        '<div style="display: flex; align-items: center; gap: 15px;">' +
                            '<label style="font-size: 12px; color: #666; cursor: pointer;">' +
                                '<input type="checkbox" id="show-official-ext" onchange="ExtensionsPage.toggleShowOfficial()" style="margin-right: 4px;"> 显示系统扩展' +
                            '</label>' +
                            '<button class="btn btn-default btn-xs" onclick="ExtensionsPage.refresh(true)">' +
                                '<i class="bi bi-arrow-clockwise"></i>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div id="extensions-list-container"></div>' +
                '</div>' +
            '</div>';
        
        $('.plugin_body').html(html);
    },

    loadVersions: function() {
        request_plugin('get_installed_versions_info', {}, (rdata) => {
            if (rdata.status && rdata.data && rdata.data.length > 0) {
                this.selectedVersion = rdata.data[0];
                $('#ext-current-version').text(this.selectedVersion.version || '未知版本');
                this.refresh();
            } else {
                $('#ext-current-version').text('未检测到已安装的版本');
            }
        });
    },

    refresh: function() {
        if (!this.selectedVersion) return;
        this.loading = true;
        this.renderList();
        
        request_plugin('get_extensions_list', { version_path: this.selectedVersion.path }, (rdata) => {
            this.loading = false;
            if (rdata.status) {
                this.extensions = rdata.data;
                this.currentPage = 1;
                this.renderList();
            } else {
                layer.msg(rdata.msg, { icon: 2 });
            }
        });
    },

    getFilteredExtensions: function() {
        var list = this.extensions;
        if (!this.showOfficial) {
            list = list.filter(ext => !ext.is_system);
        }
        return list.sort((a, b) => {
            const p1 = a.scope === 'user' ? 1 : (a.scope === 'global' ? 2 : 3);
            const p2 = b.scope === 'user' ? 1 : (b.scope === 'global' ? 2 : 3);
            return p1 - p2;
        });
    },

    renderList: function() {
        var container = $('#extensions-list-container');
        if (this.loading) {
            container.html('<div style="padding: 40px; text-align: center; color: #999;"><i class="bi bi-arrow-repeat spin"></i> 正在扫描扩展...</div>');
            return;
        }

        var filtered = this.getFilteredExtensions();
        if (filtered.length === 0) {
            container.html('<div style="padding: 40px; text-align: center; color: #999;"><i class="bi bi-puzzle" style="font-size: 32px; opacity: 0.5;"></i><p>暂无扩展</p></div>');
            return;
        }

        var start = (this.currentPage - 1) * this.itemsPerPage;
        var end = start + this.itemsPerPage;
        var pageItems = filtered.slice(start, end);
        var totalPages = Math.ceil(filtered.length / this.itemsPerPage);

        var html = '';
        pageItems.forEach(ext => {
            html += this.renderExtensionItem(ext);
        });

        if (totalPages > 1) {
            html += '<div style="padding: 12px 15px; background: #f9f9f9; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">' +
                '<span style="font-size: 12px; color: #666;">共 ' + filtered.length + ' 个扩展</span>' +
                '<div style="display: flex; gap: 8px;">' +
                    '<button class="btn btn-default btn-xs" ' + (this.currentPage === 1 ? 'disabled' : '') + ' onclick="ExtensionsPage.prevPage()"><i class="bi bi-chevron-left"></i></button>' +
                    '<span style="font-size: 12px; line-height: 22px;">' + this.currentPage + ' / ' + totalPages + '</span>' +
                    '<button class="btn btn-default btn-xs" ' + (this.currentPage === totalPages ? 'disabled' : '') + ' onclick="ExtensionsPage.nextPage()"><i class="bi bi-chevron-right"></i></button>' +
                '</div>' +
            '</div>';
        }

        container.html(html);
    },

    renderExtensionItem: function(ext) {
        var m = ext.manifest || {};
        var name = m.display_name || ext.id;
        var isCompat = this.checkCompatibility(m.minimum_client_version);
        
        return '<div class="stl-ext-list-item">' +
            '<div style="display: flex; align-items: flex-start;">' +
                '<div class="stl-ext-info">' +
                    '<div class="stl-ext-name-row">' +
                        '<span class="stl-ext-name ' + (!ext.enabled ? 'disabled' : '') + '">' + name + '</span>' +
                        '<span class="stl-ext-badge stl-ext-badge-version">v' + (m.version || '-') + '</span>' +
                        (m.minimum_client_version ? '<span class="stl-ext-badge" style="background:#e3f2fd;color:#1976d2;">ST ≥ ' + m.minimum_client_version + '</span>' : '') +
                        (!isCompat ? '<span class="stl-ext-badge stl-ext-badge-warn"><i class="bi bi-exclamation-triangle"></i> 不兼容</span>' : '') +
                        (!ext.enabled ? '<span class="stl-ext-badge" style="background:#f5f5f5;color:#999;">已禁用</span>' : '') +
                        '<span class="stl-ext-badge ' + (ext.scope === 'global' ? 'stl-ext-badge-scope-global' : 'stl-ext-badge-scope-user') + '">' + (ext.scope === 'global' ? '全局' : '用户') + '</span>' +
                        (ext.is_system ? '<span class="stl-ext-badge stl-ext-badge-system"><i class="bi bi-shield-check"></i> 系统</span>' : '') +
                    '</div>' +
                    '<div class="stl-ext-meta">' +
                        '<span><i class="bi bi-person"></i> ' + (m.author || '未知') + '</span>' +
                        '<span style="color:#ddd;">|</span>' +
                        '<span style="font-family:monospace;"><i class="bi bi-folder"></i> ' + ext.id + '</span>' +
                        (m.homePage && m.homePage !== 'None' ? '<a href="' + m.homePage + '" target="_blank" style="color:#20a53a;"><i class="bi bi-globe"></i> 主页</a>' : '') +
                        (!ext.is_system && !ext.has_git && m.auto_update ? '<button class="btn btn-warning btn-xs" onclick="ExtensionsPage.repairGit(\'' + ext.dir_path + '\')"><i class="bi bi-wrench"></i> 修复 Git</button>' : '') +
                    '</div>' +
                '</div>' +
                '<div class="stl-ext-actions">' +
                    (!ext.is_system ? '<div class="stl-ext-switch-group">' +
                        '<span style="font-size:12px;color:' + (ext.enabled ? '#666' : '#999') + ';">' + (ext.enabled ? '启用' : '禁用') + '</span>' +
                        '<label class="stl-pm-toggle"><input type="checkbox" ' + (ext.enabled ? 'checked' : '') + ' onchange="ExtensionsPage.toggleEnable(\'' + ext.dir_path + '\', this.checked)"><span class="stl-pm-toggle-slider"></span></label>' +
                        '<button class="btn btn-danger btn-xs" style="margin-left:8px;" onclick="ExtensionsPage.deleteExtension(\'' + ext.dir_path + '\', \'' + name.replace(/'/g, "\\'") + '\')"><i class="bi bi-trash"></i></button>' +
                    '</div>' : '') +
                    (m.auto_update !== undefined ? '<div class="stl-ext-switch-group">' +
                        '<span style="font-size:12px;color:#666;">自动更新</span>' +
                        '<label class="stl-pm-toggle"><input type="checkbox" ' + (m.auto_update ? 'checked' : '') + ' onchange="ExtensionsPage.toggleAutoUpdate(\'' + ext.dir_path + '\', this.checked)"><span class="stl-pm-toggle-slider"></span></label>' +
                    '</div>' : '') +
                '</div>' +
            '</div>' +
        '</div>';
    },

    checkCompatibility: function(minVer) {
        if (!minVer || !this.selectedVersion || !this.selectedVersion.version) return true;
        var v1 = this.selectedVersion.version.replace(/[^0-9.]/g, '').split('.').map(Number);
        var v2 = minVer.replace(/[^0-9.]/g, '').split('.').map(Number);
        for (var i = 0; i < Math.max(v1.length, v2.length); i++) {
            var n1 = v1[i] || 0;
            var n2 = v2[i] || 0;
            if (n1 > n2) return true;
            if (n1 < n2) return false;
        }
        return true;
    },

    toggleShowOfficial: function() {
        this.showOfficial = $('#show-official-ext').prop('checked');
        this.renderList();
    },

    prevPage: function() {
        if (this.currentPage > 1) { this.currentPage--; this.renderList(); }
    },

    nextPage: function() {
        var totalPages = Math.ceil(this.getFilteredExtensions().length / this.itemsPerPage);
        if (this.currentPage < totalPages) { this.currentPage++; this.renderList(); }
    },

    openInstallDialog: function() {
        if (!this.selectedVersion) return layer.msg('请先选择版本', {icon: 2});
        var content = 
            '<div style="padding: 20px;">' +
                '<div class="stl-form-group">' +
                    '<label class="stl-form-label">安装方式</label>' +
                    '<select id="install-type-select" class="stl-form-control" onchange="ExtensionsPage.toggleInstallType()">' +
                        '<option value="git">Git 仓库地址</option>' +
                        '<option value="zip">上传 ZIP 文件</option>' +
                    '</select>' +
                '</div>' +
                '<div id="install-git-input" class="stl-form-group">' +
                    '<label class="stl-form-label">仓库 URL</label>' +
                    '<input type="text" id="git-url-input" class="stl-form-control" placeholder="https://github.com/...">' +
                    '<input type="text" id="git-branch-input" class="stl-form-control" placeholder="分支名 (可选)" style="margin-top:5px;">' +
                '</div>' +
                '<div id="install-zip-input" class="stl-form-group" style="display:none;">' +
                    '<label class="stl-form-label">扩展压缩包 (.zip)</label>' +
                    '<div class="stl-tip-box" style="background: #fffbe6; border: 1px solid #ffe58f; padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; font-size: 12px; color: #d48806;">' +
                        '<i class="bi bi-exclamation-triangle-fill"></i> <b>建议：</b>请优先使用“Git仓库”在线安装。若需离线安装，请确保 ZIP <b>文件名为英文</b>（如 my-ext.zip），否则酒馆可能无法识别或加载该扩展。' +
                    '</div>' +
                    '<div id="drop-zone" style="border: 2px dashed #ccc; border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.3s; background: #fafafa;">' +
                        '<i class="bi bi-cloud-upload" style="font-size: 32px; color: #999;"></i>' +
                        '<p style="margin: 10px 0 5px; color: #666;">点击选择或拖拽文件到此处</p>' +
                        '<p id="file-name-display" style="font-size: 12px; color: #20a53a; font-weight: bold;"></p>' +
                        '<input type="file" id="zip-file-input" accept=".zip" style="display: none;">' +
                    '</div>' +
                '</div>' +
                '<div class="stl-form-group">' +
                    '<label class="stl-form-label">安装位置</label>' +
                    '<select id="install-scope-select" class="stl-form-control">' +
                        '<option value="global">全局 (所有用户可用)</option>' +
                        '<option value="user">仅当前用户</option>' +
                    '</select>' +
                '</div>' +
            '</div>';
        
        layer.open({
            type: 1,
            title: '安装扩展',
            area: ['450px', 'auto'],
            content: content,
            btn: ['确定', '取消'],
            yes: function(index) {
                var type = $('#install-type-select').val();
                var scope = $('#install-scope-select').val();
                var versionPath = ExtensionsPage.selectedVersion.path;

                if (type === 'git') {
                    var url = $('#git-url-input').val();
                    var branch = $('#git-branch-input').val();
                    if (!url) return layer.msg('请输入仓库地址', {icon: 2});
                    
                    // 1. 清理旧状态
                    if (window.extLogTimer) clearInterval(window.extLogTimer);
                    window.currentInstallLogFile = null;

                    // 2. 立即弹出进度窗口
                    ExtensionsPage.showInstallLogDialog(index, function() {
                        // 3. 在回调中执行安装请求
                        request_plugin('install_extension_git', {
                            version_path: versionPath,
                            scope: scope,
                            url: url,
                            branch: branch
                        }, function(rdata) {
                            // 将 log_file 挂载到全局，供轮询器使用
                            if (rdata.log_file) {
                                window.currentInstallLogFile = rdata.log_file;
                            }
                            if (!rdata.status && !rdata.log_file) {
                                layer.msg(rdata.msg, {icon: 2});
                                clearInterval(window.extLogTimer);
                            }
                        });
                    });
                } else {
                    // 优先使用全局暂存的已校验文件（解决拖拽后 input.files 为空的问题）
                    var fileToInstall = window.pendingInstallFile;
                    var validationResult = window.pendingInstallResult;
                
                    if (!fileToInstall) {
                        // 如果没有暂存文件，尝试从 input 获取（兼容旧逻辑）
                        var fileInput = $('#zip-file-input')[0];
                        if (fileInput && fileInput.files.length) {
                            fileToInstall = fileInput.files[0];
                        }
                    }
                
                    if (!fileToInstall) return layer.msg('请先选择或拖入 ZIP 文件', {icon: 2});
                                
                    // 如果还没有校验结果，现场校验一次
                    var checkAndInstall = function(result) {
                        var extName = result.extName;
                        var isOfficial = result.isOfficial;
                        var targetScope = scope;
                
                        // 确定检查路径
                        var checkPath = '';
                        if (isOfficial || targetScope === 'global') {
                            checkPath = versionPath + '/public/scripts/extensions/' + extName;
                        } else {
                            checkPath = versionPath + '/data/default-user/extensions/third-party/' + extName;
                        }
                
                        // 检查是否存在
                        request_plugin('check_path_exists', { path: checkPath }, function(rdata) {
                            var doInstall = function(overwrite) {
                                var formData = new FormData();
                                formData.append('file', fileToInstall);
                                formData.append('version_path', versionPath);
                                formData.append('scope', targetScope);
                                if (overwrite) formData.append('overwrite', 'true');
                
                                ExtensionsPage.showInstallLogDialog(index, function() {
                                    $.ajax({
                                        url: '/plugin?action=a&s=upload_and_install_ext&name=' + plugin.name,
                                        type: 'POST',
                                        data: formData,
                                        processData: false,
                                        contentType: false,
                                        success: function(rdata) {
                                            var logDiv = $('#ext-install-log');
                                            if (rdata.status) {
                                                logDiv.text(logDiv.text() + '\n[系统] 上传成功，正在解压...\n[系统] √ 安装完成！');
                                                setTimeout(function() {
                                                    layer.msg('安装完成，即将自动刷新列表', {icon: 1, time: 1500});
                                                    setTimeout(function() {
                                                        var currentLayerIndex = $('.layui-layer-title:contains("扩展安装进度")').parents('.layui-layer').attr('id');
                                                        if (currentLayerIndex) layer.close(currentLayerIndex.replace('layui-layer', ''));
                                                        if (index) layer.close(index);
                                                        ExtensionsPage.refresh();
                                                    }, 2000);
                                                }, 500);
                                            } else {
                                                logDiv.text(logDiv.text() + '\n[系统] ✗ 安装失败: ' + rdata.msg);
                                            }
                                        },
                                        error: function(xhr, status, error) {
                                            $('#ext-install-log').text($('#ext-install-log').text() + '\n[系统] ✗ 网络请求异常: ' + error);
                                        }
                                    });
                                });
                            };
                
                            if (rdata.status && rdata.exists) {
                                layer.confirm('检测到已存在名为 [' + extName + '] 的扩展，是否覆盖安装？', {
                                    icon: 3, title: '覆盖确认'
                                }, function(confirmIndex) {
                                    layer.close(confirmIndex);
                                    doInstall(true);
                                });
                            } else {
                                doInstall(false);
                            }
                        });
                    };
                
                    if (validationResult) {
                        checkAndInstall(validationResult);
                    } else {
                        // 兜底：如果之前没校验过，现在校验
                        STExtensionValidator.validate(fileToInstall).then(checkAndInstall).catch(function(err) {
                            layer.msg(err.msg, {icon: 2});
                        });
                    }
                }
            }
        });
    },

    toggleInstallType: function() {
        var type = $('#install-type-select').val();
        if (type === 'git') {
            $('#install-git-input').show();
            $('#install-zip-input').hide();
        } else {
            $('#install-git-input').hide();
            $('#install-zip-input').show();
            this.initDropZone(); // 初始化拖拽区
        }
    },

    initDropZone: function() {
        var dropZone = $('#drop-zone');
        var fileInput = $('#zip-file-input');
        var nameDisplay = $('#file-name-display');

        // 点击触发选择 - 使用原生 click 避免 jQuery 事件循环
        dropZone.off('click').on('click', function(e) {
            e.stopPropagation(); // 阻止冒泡
            fileInput[0].click(); // 使用原生 DOM 元素的 click 方法
        });

        // 文件选择监听
        fileInput.off('change').on('change', function(e) {
            if (this.files && this.files[0]) {
                ExtensionsPage._validateAndShowInfo(this.files[0], dropZone, nameDisplay);
            }
        });

        // 拖拽事件处理
        dropZone.off('dragover dragleave drop').on({
            dragover: function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).css({'border-color': '#20a53a', 'background': '#e1f3d8'});
            },
            dragleave: function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).css({'border-color': '#ccc', 'background': '#fafafa'});
            },
            drop: function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).css({'border-color': '#ccc', 'background': '#fafafa'});
                var files = e.originalEvent.dataTransfer.files;
                if (files.length > 0) {
                    ExtensionsPage._validateAndShowInfo(files[0], dropZone, nameDisplay);
                }
            }
        });
    },

    /**
     * 内部辅助：校验并显示信息
     */
    _validateAndShowInfo: function(file, dropZone, nameDisplay) {
        if (!file.name.endsWith('.zip')) {
            layer.msg('请拖入或选择 .zip 格式的扩展包', {icon: 2});
            return;
        }

        layer.load(1, {shade: [0.1, '#fff']});
        STExtensionValidator.validate(file).then(function(result) {
            layer.closeAll('loading');
            nameDisplay.html(
                '<i class="bi bi-check-circle-fill"></i> ' + result.extName + 
                ' <span style="color:#999">(v' + (result.manifest.version || '?') + ')</span>'
            );
            dropZone.css({'border-color': '#20a53a', 'background': '#f0f9eb'});
            
            // 关键：将校验后的文件和结果存入全局，供安装按钮直接使用
            window.pendingInstallFile = file;
            window.pendingInstallResult = result;
        }).catch(function(err) {
            layer.closeAll('loading');
            layer.msg(err.msg, {icon: 2});
            nameDisplay.text('');
            dropZone.css({'border-color': '#ccc', 'background': '#fafafa'});
            window.pendingInstallFile = null;
        });
    },

    /**
     * 显示安装日志弹窗
     * @param {number} inputDialogIndex - 输入框弹窗的索引
     * @param {function} onOpen - 弹窗打开后的回调
     */
    showInstallLogDialog: function(inputDialogIndex, onOpen) {
        var logContent = '<div id="ext-install-log" style="height: 350px; overflow-y: auto; background: #1e1e1e; color: #ccc; padding: 15px; font-family: Consolas, monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all;">[系统] 正在准备安装环境...</div>';
        
        var dialogIndex = layer.open({
            type: 1,
            title: '扩展安装进度',
            area: ['650px', '500px'],
            content: '<div style="padding: 15px;">' + logContent + '</div>',
            closeBtn: 1,
            shadeClose: false,
            btn: ['后台运行'],
            yes: function(idx) {
                clearInterval(window.extLogTimer);
                layer.close(idx);
            }
        });

        if (typeof onOpen === 'function') {
            onOpen();
        }

        var lastLength = 0;
        var finishCount = 0;
        var isFinished = false; // 增加标志位，防止重复触发

        window.extLogTimer = setInterval(function() {
            if (!window.currentInstallLogFile) return;
            if (isFinished) return; // 如果已经触发过关闭流程，直接返回

            request_plugin('get_extension_install_log', { log_file: window.currentInstallLogFile }, function(rdata) {
                if (rdata.status && rdata.content) {
                    var logDiv = $('#ext-install-log');
                    if (rdata.content.length > lastLength) {
                        logDiv.text(rdata.content);
                        logDiv.scrollTop(logDiv[0].scrollHeight);
                        lastLength = rdata.content.length;
                    }
                    
                    // 检测是否结束
                    if (rdata.content.includes('√') || rdata.content.includes('✗') || rdata.content.includes('~')) {
                        if (!isFinished) {
                            isFinished = true; // 标记为已结束
                            clearInterval(window.extLogTimer);
                            window.extLogTimer = null;
                            
                            layer.msg('安装完成，即将自动刷新列表', {icon: 1, time: 1500});
                            setTimeout(function() {
                                // 1. 尝试关闭进度弹窗
                                try { layer.close(dialogIndex); } catch(e) {}
                                
                                // 2. 尝试关闭安装输入框弹窗
                                try { 
                                    if (inputDialogIndex) {
                                        layer.close(inputDialogIndex); 
                                    }
                                } catch(e) {}

                                // 3. 再次检查是否还有残留的安装相关弹窗（通过标题匹配）
                                $('.layui-layer-title').each(function() {
                                    var title = $(this).text();
                                    if (title.indexOf('扩展安装') !== -1 || title.indexOf('安装扩展') !== -1) {
                                        layer.close($(this).parents('.layui-layer').attr('id').replace('layui-layer', ''));
                                    }
                                });

                                // 4. 执行刷新
                                ExtensionsPage.refresh();
                            }, 1500);
                        }
                    }
                }
            });
        }, 500);
    },

    /**
     * 复制当前选中版本的扩展根目录路径
     */
    copyExtensionPath: function() {
        if (!this.selectedVersion) return layer.msg('请先选择版本', {icon: 2});
        
        var path = this.selectedVersion.path;
        // 拼接 extensions 目录路径
        var extPath = path + '/public/scripts/extensions';
        
        // 使用宝塔面板的复制功能或浏览器原生 API
        if (typeof copyText === 'function') {
            copyText(extPath);
        } else {
            navigator.clipboard.writeText(extPath).then(function() {
                layer.msg('路径已复制到剪贴板', {icon: 1});
            }).catch(function() {
                layer.msg('复制失败，请手动复制: ' + extPath, {icon: 2});
            });
        }
    },

    openSpecificFolder: function(dirPath) {
        request_plugin('open_specific_extension_folder', { dirPath: dirPath });
    },

    toggleEnable: function(dirPath, enable) {
        request_plugin('toggle_extension_enable', { dir_path: dirPath, enable: enable }, (rdata) => {
            if (rdata.status) {
                this.refresh();
            } else {
                layer.msg(rdata.msg, { icon: 2 });
            }
        });
    },

    deleteExtension: function(dirPath, name) {
        layer.confirm('确定要删除扩展 "' + name + '" 吗？此操作不可恢复。', { title: '删除确认' }, (index) => {
            request_plugin('delete_extension', { dir_path: dirPath }, (rdata) => {
                if (rdata.status) {
                    layer.msg('删除成功', { icon: 1 });
                    this.refresh();
                } else {
                    layer.msg(rdata.msg, { icon: 2 });
                }
            });
            layer.close(index);
        });
    },

    toggleAutoUpdate: function(dirPath, autoUpdate) {
        request_plugin('toggle_extension_auto_update', { dir_path: dirPath, auto_update: autoUpdate }, (rdata) => {
            if (rdata.status) {
                this.refresh();
            } else {
                layer.msg(rdata.msg, { icon: 2 });
            }
        });
    },

    repairGit: function(dirPath) {
        var index = layer.open({
            type: 1,
            title: '修复 Git 仓库',
            area: ['400px', 'auto'],
            content: '<div class="stl-repair-modal">' +
                '<div class="stl-repair-spinner"></div>' +
                '<div class="stl-repair-status">正在尝试修复...</div>' +
                '<div class="stl-repair-log">执行 git fetch 和 reset...</div>' +
            '</div>',
            closeBtn: 0,
            shadeClose: false
        });

        request_plugin('repair_extension_git', { dir_path: dirPath }, (rdata) => {
            layer.close(index);
            if (rdata.status) {
                layer.msg('修复成功', { icon: 1 });
                this.refresh();
            } else {
                layer.msg(rdata.msg, { icon: 2 });
            }
        });
    }
};

function renderExtensionsPage() {
    ExtensionsPage.init();
}

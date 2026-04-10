/**
 * Versions 页面 - 版本管理（重构版）
 */

var versionTab = 'local';

function renderVersionsPage() {
    var html =
        '<div class="stl-page active" id="page-versions">' +
            // Tab 切换
            '<div class="stl-tabs">' +
                '<div class="stl-tab active" id="tab-local" onclick="BTPlugin.switchVersionTab(\'local\')">本地已安装</div>' +
                '<div class="stl-tab" id="tab-online" onclick="BTPlugin.switchVersionTab(\'online\')">在线下载</div>' +
            '</div>' +

            // 本地实例
            '<div id="local-versions">' +
                '<div class="stl-card">' +
                    '<div class="stl-flex stl-flex-between">' +
                        '<div class="stl-card-title" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">' +
                            '<i class="bi bi-folder"></i> 本地实例' +
                        '</div>' +
                        '<button class="btn btn-bt btn-bt-sm" onclick="BTPlugin.addStInstance()">' +
                            '<i class="bi bi-plus-circle"></i> 手动添加' +
                        '</button>' +
                    '</div>' +
                    '<div id="local-instance-list">' +
                        '<div class="stl-empty">' +
                            '<i class="bi bi-folder2-open"></i>' +
                            '<p>点击"手动添加"按钮添加 SillyTavern 实例</p>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            // 在线安装
            '<div id="online-versions" style="display: none;">' +
                '<div id="online-install-card"></div>' +
            '</div>' +
        '</div>';

    $('.plugin_body').html(html);

    // 初始化页面数据
    if (versionTab === 'local') {
        loadLocalInstances();
    } else {
        loadOnlineInstallCard();
    }
}

/**
 * 切换版本 Tab
 */
function switchVersionTab(tab) {
    versionTab = tab;

    // 更新 Tab 样式
    $('#tab-local').toggleClass('active', tab === 'local');
    $('#tab-online').toggleClass('active', tab === 'online');

    // 显示/隐藏对应内容
    $('#local-versions').toggle(tab === 'local');
    $('#online-versions').toggle(tab === 'online');

    // 加载对应数据
    if (tab === 'local') {
        loadLocalInstances();
    } else {
        loadOnlineInstallCard();
    }
}

/**
 * 加载本地实例列表
 */
function loadLocalInstances() {
    SillyTavern.listInstances(function(rdata) {
        if (rdata.status) {
            renderLocalInstancesList(rdata.instances || []);
        } else {
            layer.msg(rdata.msg || '加载失败', { icon: 2 });
        }
    });
}

/**
 * 渲染本地实例列表
 */
function renderLocalInstancesList(instances) {
    if (!instances || instances.length === 0) {
        $('#local-instance-list').html(
            '<div class="stl-empty">' +
                '<i class="bi bi-folder2-open"></i>' +
                '<p>暂无实例，点击"手动添加"开始使用</p>' +
            '</div>'
        );
        return;
    }

    var currentInstanceId = SillyTavern.getCurrentInstanceId();
    var html = '';

    instances.forEach(function(inst) {
        var isCurrent = inst.id === currentInstanceId || inst.is_default;
        var currentBadge = isCurrent ? '<span class="stl-version-badge stl-version-badge-current">当前</span>' : '';

        html +=
            '<div class="stl-version-item ' + (isCurrent ? 'current' : '') + '">' +
                '<div class="stl-version-info">' +
                    '<div class="stl-version-icon"><i class="bi bi-folder"></i></div>' +
                    '<div>' +
                        '<div class="stl-version-name">' + inst.version + currentBadge + '</div>' +
                        '<div class="stl-version-path">' + inst.path + '</div>' +
                        '<div class="stl-version-meta">分支: ' + inst.branch + ' | 添加时间: ' + inst.added_at + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="stl-version-actions">' +
                    (isCurrent ? '' : '<button class="btn btn-bt btn-bt-sm" onclick="BTPlugin.doSwitchInstance(\'' + inst.id + '\')">切换</button>') +
                    '<button class="btn btn-bt-danger btn-bt-sm" onclick="BTPlugin.doRemoveInstance(\'' + inst.id + '\')">删除</button>' +
                '</div>' +
            '</div>';
    });

    $('#local-instance-list').html(html);
}

/**
 * 手动添加实例
 */
function addStInstance() {
    // 使用自定义的文件夹选择器
    if (typeof FolderSelector !== 'undefined') {
        FolderSelector.open({
            title: '选择 SillyTavern 实例目录',
            startPath: '/www/server/stl',
            onSelect: function(path) {
                // 用户选择了目录，开始验证和添加
                doAddInstance(path);
            },
            onCancel: function() {
                // 用户取消选择
            }
        });
    } else {
        // 降级方案：使用手动输入
        showManualPathInput();
    }
}

/**
 * 显示手动路径输入对话框
 */
function showManualPathInput() {
    var html =
        '<div style="padding: 20px;">' +
            '<div style="background: #f0f9ff; border-left: 3px solid #38bdf8; padding: 10px; margin-bottom: 15px;">' +
                '<p style="margin: 0; font-size: 13px; color: #0369a1;">' +
                    '<i class="bi bi-info-circle"></i> ' +
                    '请选择包含 <strong>server.js</strong> 和 <strong>package.json</strong> 的 SillyTavern 目录路径' +
                '</p>' +
            '</div>' +
            '<div style="margin-bottom: 10px;">' +
                '<label style="display: block; margin-bottom: 5px; font-weight: 500; color: #333;">目录路径：</label>' +
                '<input type="text" id="st-path-input" ' +
                    'placeholder="例如: /www/server/stl/sillyTavern" ' +
                    'style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" />' +
            '</div>' +
            '<div style="background: #fef3c7; border-left: 3px solid #f59e0b; padding: 8px; margin-top: 10px;">' +
                '<p style="margin: 0; font-size: 12px; color: #92400e;">' +
                    '<i class="bi bi-lightbulb"></i> ' +
                    '提示：如果您不确定路径，可以在文件管理器中找到 SillyTavern 目录，复制地址栏路径' +
                '</p>' +
            '</div>' +
        '</div>';

    layer.open({
        type: 1,
        title: '<i class="bi bi-plus-circle"></i> 添加 SillyTavern 实例',
        area: ['550px', '320px'],
        content: html,
        btn: ['确定', '取消'],
        yes: function(index) {
            var path = $('#st-path-input').val().trim();
            if (!path) {
                layer.msg('路径不能为空', { icon: 2 });
                return;
            }

            // 规范化路径（去除尾部斜杠）
            path = path.replace(/\/+$/, '');

            layer.close(index);
            doAddInstance(path);
        },
        success: function() {
            // 自动聚焦到输入框
            setTimeout(function() {
                $('#st-path-input').focus();
            }, 100);
        }
    });
}

/**
 * 执行添加实例操作
 */
function doAddInstance(stPath) {
    var loadingIndex = layer.load(1, { shade: [0.3, '#000'] });

    SillyTavern.addInstance(stPath, function(rdata) {
        layer.close(loadingIndex);

        if (rdata.status) {
            layer.msg('实例添加成功', { icon: 1 });
            loadLocalInstances();
        } else {
            layer.msg(rdata.msg || '添加失败', { icon: 2 });
        }
    });
}

/**
 * 执行切换实例操作
 */
function doSwitchInstance(instanceId) {
    layer.confirm('确定要切换到该实例吗？', {
        icon: 3,
        title: '确认切换'
    }, function(index) {
        layer.close(index);

        var loadingIndex = layer.load(1, { shade: [0.3, '#000'] });

        SillyTavern.switchInstance(instanceId, function(rdata) {
            layer.close(loadingIndex);

            if (rdata.status) {
                // 同步更新 config.json 中的路径
                var inst = (SillyTavern.instances || []).find(i => i.id === instanceId);
                if (inst && inst.path) {
                    request_plugin('set_tavern_path', { path: inst.path }, function() {});
                }
                
                layer.msg('切换成功', { icon: 1 });
                loadLocalInstances();
            } else {
                layer.msg(rdata.msg || '切换失败', { icon: 2 });
            }
        });
    });
}

/**
 * 执行删除实例操作
 */
function doRemoveInstance(instanceId) {
    layer.confirm('确定要从列表中移除该实例吗？<br><span style="color: #999; font-size: 12px;">（不会删除物理文件）</span>', {
        icon: 3,
        title: '确认删除'
    }, function(index) {
        layer.close(index);

        var loadingIndex = layer.load(1, { shade: [0.3, '#000'] });

        SillyTavern.removeInstance(instanceId, function(rdata) {
            layer.close(loadingIndex);

            if (rdata.status) {
                layer.msg('实例已移除', { icon: 1 });
                loadLocalInstances();
            } else {
                layer.msg(rdata.msg || '删除失败', { icon: 2 });
            }
        });
    });
}

/**
 * 加载在线安装卡片
 */
function loadOnlineInstallCard() {
    var cardHtml =
        '<div class="stl-card">' +
            '<div class="stl-card-title">' +
                '<i class="bi bi-cloud-download"></i> SillyTavern 最新版本' +
            '</div>' +
            '<div id="online-install-content">' +
                '<div style="text-align: center; padding: 20px;">' +
                    '<i class="bi bi-arrow-repeat spin" style="font-size: 32px; color: #999;"></i>' +
                    '<p style="margin-top: 10px; color: #999;">正在加载...</p>' +
                '</div>' +
            '</div>' +
        '</div>';

    $('#online-install-card').html(cardHtml);

    // 获取在线版本信息
    SillyTavern.getLatestOnlineVersion(function(rdata) {
        if (rdata.status) {
            renderOnlineInstallCard(rdata);
        } else {
            $('#online-install-content').html(
                '<div class="stl-empty">' +
                    '<i class="bi bi-exclamation-triangle"></i>' +
                    '<p>加载失败: ' + (rdata.msg || '未知错误') + '</p>' +
                '</div>'
            );
        }
    });
}

/**
 * 渲染在线安装卡片
 */
function renderOnlineInstallCard(versionInfo) {
    // 检查是否已安装
    SillyTavern.isSillyTavernInstall(function(rdata) {
        var isInstalled = rdata.installed;
        var currentVersion = rdata.version || '';
        var onlineVersion = versionInfo.version || 'latest';

        var statusHtml = '';
        var actionButtons = '';

        if (isInstalled) {
            // 已安装
            var isLatest = currentVersion === onlineVersion;

            statusHtml =
                '<div class="stl-install-status installed">' +
                    '<i class="bi bi-check-circle-fill"></i>' +
                    '<div>' +
                        '<div class="status-title">已安装</div>' +
                        '<div class="status-version">当前版本: v' + currentVersion + '</div>' +
                        (isLatest ? '<div class="status-latest">已是最新版本</div>' : '<div class="status-update">新版本: v' + onlineVersion + '</div>') +
                    '</div>' +
                '</div>';

            actionButtons =
                '<button class="btn btn-bt btn-bt-sm" onclick="BTPlugin.switchToOnlineVersion()">' +
                    '<i class="bi bi-arrow-right-circle"></i> 切换到在线版' +
                '</button>' +
                '<button class="btn btn-bt-outline btn-bt-sm" onclick="BTPlugin.checkForUpdate(\'' + currentVersion + '\', \'' + onlineVersion + '\')">' +
                    '<i class="bi bi-arrow-clockwise"></i> 检查更新' +
                '</button>';
        } else {
            // 未安装
            statusHtml =
                '<div class="stl-install-status not-installed">' +
                    '<i class="bi bi-x-circle-fill"></i>' +
                    '<div>' +
                        '<div class="status-title">未安装</div>' +
                        '<div class="status-version">最新版本: v' + onlineVersion + '</div>' +
                    '</div>' +
                '</div>';

            actionButtons =
                '<button class="btn btn-bt btn-bt-sm" onclick="BTPlugin.installLatestVersion()">' +
                    '<i class="bi bi-download"></i> 一键安装' +
                '</button>';
        }

        var html =
            '<div class="stl-install-card-inner">' +
                statusHtml +
                '<div class="stl-install-actions">' +
                    actionButtons +
                '</div>' +
            '</div>';

        $('#online-install-content').html(html);
    });
}

/**
 * 切换到在线安装版本（默认路径）
 * 逻辑已移至 main.js 中的 BTPlugin.switchToOnlineVersion
 */

/**
 * 检查更新
 */
function checkForUpdate(currentVersion, onlineVersion) {
    if (currentVersion === onlineVersion) {
        layer.msg('当前已是最新版本 (v' + currentVersion + ')', { icon: 1 });
        return;
    }

    layer.confirm(
        '发现新版本 v' + onlineVersion + '，当前版本为 v' + currentVersion + '。<br>是否立即更新？',
        {
            icon: 3,
            title: '确认更新',
            btn: ['立即更新', '稍后再说']
        },
        function(index) {
            layer.close(index);
            // 调用现有的更新功能
            updateSillyTavern();
        }
    );
}

/**
 * 安装最新版本
 */
function installLatestVersion() {
    layer.confirm(
        '确定要安装最新版本的 SillyTavern 吗？<br><span style="color: #999; font-size: 12px;">安装过程可能需要几分钟，请耐心等待。</span>',
        {
            icon: 3,
            title: '确认安装',
            btn: ['开始安装', '取消']
        },
        function(index) {
            layer.close(index);

            // 创建日志窗口
            var logHtml =
                '<div id="install-log-container" style="height: 400px; overflow-y: auto; background: #1e1e1e; color: #d4d4d4; padding: 10px; font-family: monospace; font-size: 12px;">' +
                    '<div class="log-info">[INFO] 正在启动安装程序...</div>' +
                '</div>';

            var isInstalling = true; // 标记是否正在安装
            var logIndex = layer.open({
                type: 1,
                title: '安装进度',
                area: ['700px', '500px'],
                content: logHtml,
                closeBtn: 1, // 显示关闭按钮
                shadeClose: false,
                cancel: function() {
                    // 用户点击关闭按钮
                    if (isInstalling) {
                        layer.confirm('安装正在进行中，确定要取消吗？<br><span style="color: #f44747;">取消后将清理已下载的文件</span>', {
                            icon: 3,
                            title: '确认取消',
                            btn: ['确定取消', '继续安装']
                        }, function(confirmIndex) {
                            layer.close(confirmIndex);
                            isInstalling = false;
                            
                            // 停止安装轮询
                            if (SillyTavern.stopInstallPolling) {
                                SillyTavern.stopInstallPolling();
                            }
                            
                            // 调用后端清理接口
                            request_plugin('cancel_install', {}, function(rdata) {
                                // 关闭窗口
                                layer.close(logIndex);
                                
                                if (rdata && rdata.status) {
                                    layer.msg('已取消安装并清理文件', { icon: 1 });
                                } else {
                                    layer.msg('已取消安装', { icon: 2 });
                                }
                                
                                // 恢复界面状态
                                loadOnlineInstallCard();
                            });
                        });
                    }
                    return false; // 阻止默认关闭
                }
            });

            function appendLog(text, level) {
                var container = $('#install-log-container');
                var logClass = 'log-' + (level || 'info');
                // 对文本进行 HTML 转义
                var escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                container.append('<div class="' + logClass + '">' + escapedText + '</div>');
                container.scrollTop(container[0].scrollHeight);
            }

            // 调用自动安装函数
            SillyTavern.autoInstallSillyTavern(
                function(result) {
                    isInstalling = false;
                    if (result.status) {
                        appendLog('[SUCCESS] ' + result.msg, 'success');
                        
                        // 在线安装成功，将配置置空以使用默认路径
                        request_plugin('set_tavern_path', { path: '' }, function() {});
                        
                        setTimeout(function() {
                            layer.close(logIndex);
                            layer.msg('安装成功！', { icon: 1 });
                            loadOnlineInstallCard();
                        }, 1500);
                    } else {
                        appendLog('[ERROR] ' + result.msg, 'error');
                        // 安装失败时允许关闭
                        setTimeout(function() {
                            layer.close(logIndex);
                            layer.msg('安装失败: ' + result.msg, { icon: 2 });
                            loadOnlineInstallCard();
                        }, 2000);
                    }
                },
                function(logText) {
                    // 实时日志输出
                    if (logText && isInstalling) {
                        var lines = logText.split('\n');
                        lines.forEach(function(line) {
                            if (line.trim()) {
                                // 根据内容判断日志级别
                                var level = 'info';
                                if (line.indexOf('[ERROR]') !== -1 || line.indexOf('error') !== -1 || line.indexOf('fatal') !== -1) {
                                    level = 'error';
                                } else if (line.indexOf('[WARN]') !== -1 || line.indexOf('warning') !== -1) {
                                    level = 'warn';
                                } else if (line.indexOf('npm') !== -1) {
                                    level = 'npm';
                                } else if (line.indexOf('git') !== -1) {
                                    level = 'git';
                                }
                                appendLog(line, level);
                            }
                        });
                    }
                },
                function(progressMsg) {
                    // 进度提示
                    if (isInstalling) {
                        appendLog('[PROGRESS] ' + progressMsg, 'progress');
                    }
                }
            );
        }
    );
}

/**
 * 更新 SillyTavern（调用现有功能）
 */
function updateSillyTavern() {
    // 创建日志窗口
    var logHtml =
        '<div id="update-log-container" style="height: 400px; overflow-y: auto; background: #1e1e1e; color: #d4d4d4; padding: 10px; font-family: monospace; font-size: 12px;">' +
            '<div class="log-info">[INFO] 正在启动更新程序...</div>' +
        '</div>';

    var isUpdating = true; // 标记是否正在更新
    var logIndex = layer.open({
        type: 1,
        title: '更新进度',
        area: ['700px', '500px'],
        content: logHtml,
        closeBtn: 1, // 显示关闭按钮
        shadeClose: false,
        cancel: function() {
            // 用户点击关闭按钮
            if (isUpdating) {
                layer.confirm('更新正在进行中，确定要取消吗？<br><span style="color: #f44747;">取消可能导致版本不一致</span>', {
                    icon: 3,
                    title: '确认取消',
                    btn: ['确定取消', '继续更新']
                }, function(confirmIndex) {
                    layer.close(confirmIndex);
                    isUpdating = false;
                    
                    // 停止更新轮询
                    if (SillyTavern.stopInstallPolling) {
                        SillyTavern.stopInstallPolling();
                    }
                    
                    // 关闭窗口
                    layer.close(logIndex);
                    
                    // 恢复界面状态
                    loadOnlineInstallCard();
                    layer.msg('已取消更新', { icon: 2 });
                });
            }
            return false; // 阻止默认关闭
        }
    });

    function appendLog(text, level) {
        var container = $('#update-log-container');
        var logClass = 'log-' + (level || 'info');
        // 对文本进行 HTML 转义
        var escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        container.append('<div class="' + logClass + '">' + escapedText + '</div>');
        container.scrollTop(container[0].scrollHeight);
    }

    // 调用更新函数
    SillyTavern.updateSillyTavern(
        function(result) {
            isUpdating = false;
            if (result.status) {
                appendLog('[SUCCESS] ' + result.msg, 'success');
                setTimeout(function() {
                    layer.close(logIndex);
                    layer.msg('更新成功！', { icon: 1 });
                    loadOnlineInstallCard();
                }, 1500);
            } else {
                appendLog('[ERROR] ' + result.msg, 'error');
                // 更新失败时允许关闭
                setTimeout(function() {
                    layer.close(logIndex);
                    layer.msg('更新失败: ' + result.msg, { icon: 2 });
                    loadOnlineInstallCard();
                }, 2000);
            }
        },
        function(logText) {
            // 实时日志输出
            if (logText && isUpdating) {
                var lines = logText.split('\n');
                lines.forEach(function(line) {
                    if (line.trim()) {
                        // 根据内容判断日志级别
                        var level = 'info';
                        if (line.indexOf('[ERROR]') !== -1 || line.indexOf('error') !== -1 || line.indexOf('fatal') !== -1) {
                            level = 'error';
                        } else if (line.indexOf('[WARN]') !== -1 || line.indexOf('warning') !== -1) {
                            level = 'warn';
                        } else if (line.indexOf('npm') !== -1) {
                            level = 'npm';
                        } else if (line.indexOf('git') !== -1) {
                            level = 'git';
                        }
                        appendLog(line, level);
                    }
                });
            }
        },
        function(progressMsg) {
            // 进度提示
            if (isUpdating) {
                appendLog('[PROGRESS] ' + progressMsg, 'progress');
            }
        }
    );
}

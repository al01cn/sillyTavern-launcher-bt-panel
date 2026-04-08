/**
 * Debug 测试页面 - SillyTavern 模块测试
 * 临时调试用，上线前删除
 */

// 日志弹窗引用
var _installLogLayerIndex = null;

function renderDebugPage() {
    var html =
        '<div class="stl-page active" id="page-debug">' +

            // 标题
            '<div class="stl-card">' +
                '<div class="stl-card-title">' +
                    '<i class="bi bi-bug"></i> SillyTavern 模块测试' +
                '</div>' +
                '<div class="stl-alert stl-alert-warning">' +
                    '<i class="bi bi-exclamation-triangle" style="margin-right:8px;"></i>' +
                    '此页面仅供开发调试，上线前请移除。' +
                '</div>' +
                '<div class="stl-info-item" style="margin-top:10px;">' +
                    '<span class="stl-info-label"><i class="bi bi-link-45deg"></i> GITHUB_URL</span>' +
                    '<span class="stl-info-value"><code style="word-break:break-all;">' + SillyTavern.GITHUB_URL + '</code></span>' +
                '</div>' +
            '</div>' +

            // 基础检测区
            '<div class="stl-card">' +
                '<div class="stl-section-header">' +
                    '<i class="bi bi-box-seam"></i> 基础检测' +
                '</div>' +

                // 1. 获取版本
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-tag"></i> getSillyTavernVersion()</span>' +
                    '<span class="stl-info-value" id="test-st-version">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testGetVersion()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 获取版本' +
                '</button>' +

                // 2. 检测安装
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-check-circle"></i> isSillyTavernInstall()</span>' +
                    '<span class="stl-info-value" id="test-st-install">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testIsInstalled()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 检测安装' +
                '</button>' +

            '</div>' +

            // 路径管理区
            '<div class="stl-card">' +
                '<div class="stl-section-header">' +
                    '<i class="bi bi-folder2-open"></i> 路径管理' +
                '</div>' +

                // 获取当前路径
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-signpost-2"></i> getStPath()</span>' +
                    '<span class="stl-info-value" id="test-st-path">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testGetPath()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 获取当前路径' +
                '</button>' +

                // 设置自定义路径
                '<div class="stl-flex stl-flex-gap-10" style="margin:0 0 10px 0;">' +
                    '<input type="text" class="stl-form-control" id="test-set-path-input" placeholder="输入自定义酒馆路径" style="flex:1;">' +
                    '<button class="btn btn-bt btn-bt-sm" onclick="testSetPath()">' +
                        '<i class="bi bi-pencil"></i> 设置路径' +
                    '</button>' +
                    '<button class="btn btn-bt-outline btn-bt-sm" onclick="testResetPath()">' +
                        '<i class="bi bi-arrow-counterclockwise"></i> 恢复默认' +
                    '</button>' +
                '</div>' +
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label" style="opacity:0;">状态</span>' +
                    '<span class="stl-info-value" id="test-set-path-result">--</span>' +
                '</div>' +

            '</div>' +

            // 安装区
            '<div class="stl-card">' +
                '<div class="stl-section-header">' +
                    '<i class="bi bi-rocket-takeoff"></i> 安装 SillyTavern' +
                '</div>' +
                '<button class="btn btn-bt" id="test-auto-install-btn" onclick="testAutoInstall()">' +
                    '<i class="bi bi-play-fill"></i> 智能安装（自动检测）' +
                '</button>' +
                '<div class="stl-info-item" style="margin-top:10px;">' +
                    '<span class="stl-info-label"><i class="bi bi-signpost-split"></i> 当前进度</span>' +
                    '<span class="stl-info-value" id="test-st-progress">--</span>' +
                '</div>' +
            '</div>' +

            // 更新区
            '<div class="stl-card">' +
                '<div class="stl-section-header">' +
                    '<i class="bi bi-arrow-repeat"></i> 版本更新' +
                '</div>' +

                // 检查更新
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-search"></i> checkUpdate()</span>' +
                    '<span class="stl-info-value" id="test-st-check-update">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testCheckUpdate()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 检查更新' +
                '</button>' +

                // 执行更新
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-cloud-download"></i> updateSillyTavern()</span>' +
                    '<span class="stl-info-value" id="test-st-update">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testUpdate()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 执行更新' +
                '</button>' +

            '</div>' +

            // 删除区
            '<div class="stl-card">' +
                '<div class="stl-section-header">' +
                    '<i class="bi bi-trash3"></i> 删除 SillyTavern' +
                '</div>' +

                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-x-octagon"></i> deleteSillyTavern()</span>' +
                    '<span class="stl-info-value" id="test-st-delete">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testDelete()" style="margin:0 0 15px 0;background:#d9534f;border-color:#d9534f;">' +
                    '<i class="bi bi-trash3-fill"></i> 删除 SillyTavern' +
                '</button>' +
            '</div>' +

            // 日志输出区
            '<div class="stl-card">' +
                '<div class="stl-console-header">' +
                    '<div class="stl-console-title">' +
                        '<i class="bi bi-terminal"></i>' +
                        '<span>调试日志</span>' +
                    '</div>' +
                    '<div class="stl-console-actions">' +
                        '<button class="btn btn-bt-outline btn-bt-sm" onclick="testClearLog()">' +
                            '<i class="bi bi-trash"></i> 清空' +
                        '</button>' +
                        '<button class="btn btn-bt-outline btn-bt-sm" onclick="testExportLog()">' +
                            '<i class="bi bi-download"></i> 导出' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="stl-console" id="debug-log" style="height:400px;"></div>' +
            '</div>' +

        '</div>';

    $('.plugin_body').html(html);

    // 初始日志
    _debugLog('SYSTEM', 'SillyTavern 模块测试页面已加载，可以开始测试');
    _debugLog('INFO', 'GitHub URL: ' + SillyTavern.GITHUB_URL);

    // 初始加载当前路径和安装状态
    testGetPath();
    testIsInstalled();
}

// ======== 测试方法 ========

/**
 * 测试 1: 获取 SillyTavern 版本
 */
function testGetVersion() {
    _debugLog('INFO', '>>> testGetVersion()');
    $('#test-st-version').html('<span class="stl-loading"></span>');

    SillyTavern.getSillyTavernVersion(function (rdata) {
        if (rdata.status && rdata.version) {
            _debugLog('SUCCESS', '版本: v' + rdata.version + ' | 路径: ' + (rdata.path || ''));
            $('#test-st-version').html(
                '<span style="color:#20a53a;">v' + rdata.version + '</span>' +
                '<span style="color:#999;font-size:12px;margin-left:6px;">' + (rdata.path || '') + '</span>'
            );
        } else {
            _debugLog('WARN', (rdata.msg || '未检测到 SillyTavern'));
            $('#test-st-version').html('<span style="color:#d9534f;">' + (rdata.msg || '未检测到') + '</span>');
        }
    });
}

/**
 * 测试 2: 检测 SillyTavern 是否已安装
 */
function testIsInstalled() {
    _debugLog('INFO', '>>> testIsInstalled()');
    $('#test-st-install').html('<span class="stl-loading"></span>');

    SillyTavern.isSillyTavernInstall(function (rdata) {
        if (rdata.status && rdata.installed) {
            _debugLog('SUCCESS', '已安装: v' + (rdata.version || '') + ' | 路径: ' + (rdata.path || ''));
            $('#test-st-install').html('<span style="color:#20a53a;">已安装 (v' + (rdata.version || '') + ')</span>');
        } else {
            _debugLog('WARN', '未安装: ' + (rdata.msg || ''));
            $('#test-st-install').html('<span style="color:#d9534f;">未安装</span>');
        }
    });
}

/**
 * 测试 3: 获取当前酒馆路径
 */
function testGetPath() {
    _debugLog('INFO', '>>> testGetPath()');
    $('#test-st-path').html('<span class="stl-loading"></span>');

    SillyTavern.getStPath(function (rdata) {
        if (rdata.status) {
            var label = rdata.is_custom ? '（自定义）' : '（默认）';
            _debugLog('SUCCESS', '路径: ' + rdata.path + ' ' + label);
            $('#test-st-path').html(
                '<span style="color:#20a53a;">' + rdata.path + '</span>' +
                '<span style="color:#999;font-size:12px;margin-left:6px;">' + label + '</span>'
            );
        } else {
            _debugLog('WARN', (rdata.msg || '获取路径失败'));
            $('#test-st-path').html('<span style="color:#d9534f;">' + (rdata.msg || '获取失败') + '</span>');
        }
    });
}

/**
 * 测试 4: 设置自定义路径
 */
function testSetPath() {
    var path = $('#test-set-path-input').val().trim();
    if (!path) {
        layer.msg('请输入路径', { icon: 0 });
        return;
    }

    _debugLog('INFO', '>>> testSetPath("' + path + '")');
    $('#test-set-path-result').html('<span class="stl-loading"></span>');

    SillyTavern.setStPath(path, function (rdata) {
        if (rdata.status) {
            _debugLog('SUCCESS', rdata.msg + ': ' + rdata.path);
            $('#test-set-path-result').html('<span style="color:#20a53a;">' + rdata.path + '</span>');
            layer.msg(rdata.msg, { icon: 1 });
            testGetPath();
        } else {
            _debugLog('ERROR', rdata.msg);
            $('#test-set-path-result').html('<span style="color:#d9534f;">' + rdata.msg + '</span>');
            layer.msg(rdata.msg, { icon: 2 });
        }
    });
}

/**
 * 测试 4.1: 恢复默认路径
 */
function testResetPath() {
    _debugLog('INFO', '>>> testResetPath()');
    $('#test-set-path-result').html('<span class="stl-loading"></span>');

    SillyTavern.setStPath('', function (rdata) {
        if (rdata.status) {
            _debugLog('SUCCESS', rdata.msg + ': ' + rdata.path);
            $('#test-set-path-result').html('<span style="color:#20a53a;">' + rdata.path + '</span>');
            layer.msg(rdata.msg, { icon: 1 });
            testGetPath();
        } else {
            _debugLog('ERROR', rdata.msg);
            $('#test-set-path-result').html('<span style="color:#d9534f;">' + rdata.msg + '</span>');
            layer.msg(rdata.msg, { icon: 2 });
        }
    });
}

/**
 * 测试 5: 智能安装 SillyTavern
 */
function testAutoInstall() {
    layer.confirm('确认智能安装 SillyTavern？已安装时将自动跳过。', {
        btn: ['确认', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testAutoInstall()');
        $('#test-auto-install-btn').prop('disabled', true);
        $('#test-st-progress').html('<span class="stl-loading"></span>');

        // 打开日志弹窗
        _openInstallLogLayer('SillyTavern 安装日志');

        SillyTavern.autoInstallSillyTavern(
            // 完成回调
            function (rdata) {
                $('#test-auto-install-btn').prop('disabled', false);

                if (rdata.status) {
                    _debugLog('SUCCESS', rdata.msg);
                    $('#test-st-progress').html('<span style="color:#20a53a;">完成 (v' + (rdata.version || '') + ')</span>');
                    layer.msg(rdata.msg, { icon: 1 });
                    // 安装成功，3 秒后自动关闭日志弹窗
                    setTimeout(function () {
                        if (_installLogLayerIndex) {
                            layer.close(_installLogLayerIndex);
                            _installLogLayerIndex = null;
                        }
                    }, 3000);
                    // 刷新状态
                    testIsInstalled();
                    testGetPath();
                } else {
                    _debugLog('ERROR', rdata.msg);
                    $('#test-st-progress').html('<span style="color:#d9534f;">失败</span>');
                    layer.msg(rdata.msg || '安装失败', { icon: 2 });
                }
            },
            // 日志回调
            function (logText) {
                _appendToLogLayer(logText);
                _debugLog('OUTPUT', logText.replace(/\n$/, ''));
            },
            // 进度回调
            function (msg) {
                $('#test-st-progress').text(msg);
                _debugLog('INFO', msg);
            }
        );
    });
}

/**
 * 测试 6: 检查更新
 */
function testCheckUpdate() {
    _debugLog('INFO', '>>> testCheckUpdate()');
    $('#test-st-check-update').html('<span class="stl-loading"></span>');

    SillyTavern.checkUpdate(function (rdata) {
        if (rdata.status) {
            if (rdata.is_latest) {
                _debugLog('SUCCESS', '已是最新版本: v' + (rdata.local_version || '') + ' (' + (rdata.local_commit || '') + ')');
                $('#test-st-check-update').html(
                    '<span style="color:#20a53a;">已是最新</span>' +
                    '<span style="color:#999;font-size:12px;margin-left:6px;">' +
                        'v' + (rdata.local_version || '') + ' | ' + (rdata.local_commit || '') +
                    '</span>'
                );
            } else {
                _debugLog('INFO', '有新版本可用: v' + (rdata.local_version || '') + ' (' + (rdata.local_commit || '') + ') → v' + (rdata.remote_version || '') + ' (' + (rdata.remote_commit || '') + ')');
                $('#test-st-check-update').html(
                    '<span style="color:#e6a23c;">有更新</span>' +
                    '<span style="color:#999;font-size:12px;margin-left:6px;">' +
                        'v' + (rdata.local_version || '') + ' → v' + (rdata.remote_version || '') +
                    '</span>'
                );
            }
        } else {
            _debugLog('WARN', (rdata.msg || '检查更新失败'));
            $('#test-st-check-update').html('<span style="color:#d9534f;">' + (rdata.msg || '检查失败') + '</span>');
        }
    });
}

/**
 * 测试 7: 执行更新
 */
function testUpdate() {
    layer.confirm('确认更新 SillyTavern？', {
        btn: ['确认', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testUpdate()');
        $('#test-st-update').html('<span class="stl-loading"></span>');

        // 打开日志弹窗
        _openInstallLogLayer('SillyTavern 更新日志');

        SillyTavern.updateSillyTavern(
            // 完成回调
            function (rdata) {
                if (rdata.status) {
                    _debugLog('SUCCESS', rdata.msg);
                    $('#test-st-update').html(
                        '<span style="color:#20a53a;">' + rdata.msg + '</span>'
                    );
                    layer.msg(rdata.msg, { icon: 1 });
                    // 更新成功，3 秒后自动关闭日志弹窗
                    setTimeout(function () {
                        if (_installLogLayerIndex) {
                            layer.close(_installLogLayerIndex);
                            _installLogLayerIndex = null;
                        }
                    }, 3000);
                    // 刷新状态
                    testGetVersion();
                    testCheckUpdate();
                } else {
                    _debugLog('ERROR', rdata.msg);
                    $('#test-st-update').html('<span style="color:#d9534f;">失败</span>');
                    layer.msg(rdata.msg, { icon: 2 });
                }
            },
            // 日志回调
            function (logText) {
                _appendToLogLayer(logText);
                _debugLog('OUTPUT', logText.replace(/\n$/, ''));
            },
            // 进度回调
            function (msg) {
                $('#test-st-update').text(msg);
                _debugLog('INFO', msg);
            }
        );
    });
}

/**
 * 测试 8: 删除 SillyTavern
 */
function testDelete() {
    layer.confirm('⚠️ 确认删除 SillyTavern？\n\n此操作将停止 PM2 进程并删除整个目录，数据不可恢复！', {
        btn: ['确认', '取消'],
        icon: 3
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testDelete()');
        $('#test-st-delete').html('<span class="stl-loading"></span>');

        SillyTavern.deleteSillyTavern(function (rdata) {
            if (rdata.status) {
                _debugLog('SUCCESS', rdata.msg);
                $('#test-st-delete').html('<span style="color:#20a53a;">已删除</span>');
                layer.msg(rdata.msg, { icon: 1 });
                testIsInstalled();
                testGetPath();
            } else {
                _debugLog('ERROR', rdata.msg);
                $('#test-st-delete').html('<span style="color:#d9534f;">失败</span>');
                layer.msg(rdata.msg, { icon: 2 });
            }
        });
    });
}

// ======== 日志弹窗 ========

/**
 * 打开安装日志弹窗
 * @param {string} title 弹窗标题
 */
function _openInstallLogLayer(title) {
    if (_installLogLayerIndex) {
        layer.close(_installLogLayerIndex);
    }

    _installLogLayerIndex = layer.open({
        type: 1,
        title: '<i class="bi bi-terminal" style="margin-right:6px;"></i>' + (title || '安装日志'),
        area: ['700px', '500px'],
        shadeClose: false,
        closeBtn: 1,
        content:
            '<div style="padding:10px;">' +
                '<div id="install-log-output" style="' +
                    'background:#1e1e1e;' +
                    'color:#d4d4d4;' +
                    'font-family:Consolas,Monaco,monospace;' +
                    'font-size:13px;' +
                    'line-height:1.6;' +
                    'padding:12px;' +
                    'border-radius:6px;' +
                    'height:400px;' +
                    'overflow-y:auto;' +
                    'white-space:pre-wrap;' +
                    'word-break:break-all;' +
                '"></div>' +
            '</div>',
        cancel: function () {
            _installLogLayerIndex = null;
        }
    });
}

/**
 * 追加日志到弹窗
 */
function _appendToLogLayer(text) {
    var el = $('#install-log-output');
    if (!el.length) return;
    el.append(_escapeHtml(text));
    el.scrollTop(el[0].scrollHeight);
}

/**
 * HTML 转义
 */
function _escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ======== 调试日志工具 ========

/**
 * 写入调试日志
 */
function _debugLog(type, content) {
    var time = _getTimeStr();
    var typeClass = 'log-type-output';
    if (type === 'INFO') typeClass = 'log-type-info';
    else if (type === 'SUCCESS') typeClass = 'log-type-success';
    else if (type === 'ERROR') typeClass = 'log-type-error';
    else if (type === 'WARN') typeClass = 'log-type-system';
    else if (type === 'SYSTEM') typeClass = 'log-type-system';
    else if (type === 'OUTPUT') typeClass = 'log-type-output';

    var line =
        '<div class="log-line">' +
            '<span class="log-time">' + time + '</span>' +
            '<span class="log-type ' + typeClass + '">' + type + '</span>' +
            '<span class="log-content">' + _escapeHtml(content) + '</span>' +
        '</div>';

    var el = $('#debug-log');
    if (el.length) {
        el.append(line);
        el.scrollTop(el[0].scrollHeight);
    }
}

/**
 * 清空日志
 */
function testClearLog() {
    $('#debug-log').html('');
    _debugLog('SYSTEM', '日志已清空');
}

/**
 * 导出日志（复制到剪贴板）
 */
function testExportLog() {
    var text = '';
    $('#debug-log .log-line').each(function () {
        var t = $(this).find('.log-time').text();
        var tp = $(this).find('.log-type').text();
        var c = $(this).find('.log-content').text();
        text += t + ' [' + tp + '] ' + c + '\n';
    });

    if (!text) {
        layer.msg('日志为空', { icon: 0 });
        return;
    }

    var textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    layer.msg('日志已复制到剪贴板', { icon: 1 });
}

/**
 * 获取时间字符串
 */
function _getTimeStr() {
    var now = new Date();
    var h = now.getHours().toString().padStart(2, '0');
    var m = now.getMinutes().toString().padStart(2, '0');
    var s = now.getSeconds().toString().padStart(2, '0');
    return h + ':' + m + ':' + s;
}

/**
 * Debug 测试页面 - PM2 模块测试
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
                    '<i class="bi bi-bug"></i> PM2 模块测试' +
                '</div>' +
                '<div class="stl-alert stl-alert-warning">' +
                    '<i class="bi bi-exclamation-triangle" style="margin-right:8px;"></i>' +
                    '此页面仅供开发调试，上线前请移除。' +
                '</div>' +
                '<div class="stl-info-item" style="margin-top:10px;">' +
                    '<span class="stl-info-label"><i class="bi bi-key"></i> APP_NAME</span>' +
                    '<span class="stl-info-value"><code>' + Pm2.APP_NAME + '</code></span>' +
                '</div>' +
            '</div>' +

            // 基础检测区
            '<div class="stl-card">' +
                '<div class="stl-section-header">' +
                    '<i class="bi bi-box-seam"></i> 基础检测' +
                '</div>' +

                // 1. 获取 PM2 版本
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-terminal"></i> getPm2Version()</span>' +
                    '<span class="stl-info-value" id="test-pm2-version">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testGetPm2Version()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 获取版本' +
                '</button>' +

                // 2. 检测 PM2 是否已安装
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-check-circle"></i> isPm2Installed()</span>' +
                    '<span class="stl-info-value" id="test-pm2-install">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testIsPm2Installed()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 检测安装' +
                '</button>' +

            '</div>' +

            // 安装区
            '<div class="stl-card">' +
                '<div class="stl-section-header">' +
                    '<i class="bi bi-rocket-takeoff"></i> 安装 PM2' +
                '</div>' +
                '<button class="btn btn-bt" id="test-auto-install-pm2-btn" onclick="testAutoInstallPm2()">' +
                    '<i class="bi bi-play-fill"></i> 智能安装（自动检测）' +
                '</button>' +
                '<div class="stl-info-item" style="margin-top:10px;">' +
                    '<span class="stl-info-label"><i class="bi bi-signpost-split"></i> 当前进度</span>' +
                    '<span class="stl-info-value" id="test-pm2-progress">--</span>' +
                '</div>' +
            '</div>' +

            // SillyTavern 运行管理区
            '<div class="stl-card">' +
                '<div class="stl-section-header">' +
                    '<i class="bi bi-lightning-charge"></i> SillyTavern 运行管理' +
                '</div>' +

                // 3. 获取运行状态
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-activity"></i> getStatus()</span>' +
                    '<span class="stl-info-value" id="test-pm2-status">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testGetStatus()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 查看状态' +
                '</button>' +

                // 4. 创建/启动实例
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-play-circle"></i> start()</span>' +
                    '<span class="stl-info-value" id="test-pm2-start">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testStart()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 启动 SillyTavern' +
                '</button>' +

                // 5. 停止实例
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-stop-circle"></i> stop()</span>' +
                    '<span class="stl-info-value" id="test-pm2-stop">--</span>' +
                '</div>' +
                '<button class="btn btn-bt-outline btn-bt-sm" onclick="testStop()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-stop-fill"></i> 停止 SillyTavern' +
                '</button>' +

                // 8. 重启实例
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-arrow-clockwise"></i> restart()</span>' +
                    '<span class="stl-info-value" id="test-pm2-restart">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testRestart()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-arrow-clockwise"></i> 重启 SillyTavern' +
                '</button>' +

                // 9. 强制停止
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-x-octagon"></i> forceStop()</span>' +
                    '<span class="stl-info-value" id="test-pm2-force-stop">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testForceStop()" style="margin:0 0 15px 0;background:#d9534f;border-color:#d9534f;">' +
                    '<i class="bi bi-x-octagon-fill"></i> 强制停止 SillyTavern' +
                '</button>' +

                // 6. 获取日志
                '<div class="stl-section-header" style="margin-top:10px;">' +
                    '<i class="bi bi-journal-text"></i> getLogs()' +
                '</div>' +
                '<div class="stl-flex stl-flex-gap-10" style="margin:0 0 10px 0;">' +
                    '<select class="stl-form-control" id="test-log-type" style="width:120px;">' +
                        '<option value="all">全部日志</option>' +
                        '<option value="out">标准输出</option>' +
                        '<option value="err">错误输出</option>' +
                    '</select>' +
                    '<input type="number" class="stl-form-control" id="test-log-lines" value="100" min="10" max="2000" style="width:100px;" placeholder="行数">' +
                    '<button class="btn btn-bt btn-bt-sm" onclick="testGetLogs()">' +
                        '<i class="bi bi-play-fill"></i> 获取日志' +
                    '</button>' +
                '</div>' +
                '<div id="test-pm2-logs-area" style="display:none;">' +
                    '<div style="background:#1e1e1e;color:#d4d4d4;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.5;padding:10px;border-radius:6px;height:250px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;" id="test-pm2-logs"></div>' +
                '</div>' +

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
    _debugLog('SYSTEM', 'PM2 模块测试页面已加载，可以开始测试');
    _debugLog('INFO', 'PM2 进程名称: ' + Pm2.APP_NAME);
}

// ======== 测试方法 ========

/**
 * 测试 1: 获取 PM2 版本
 */
function testGetPm2Version() {
    _debugLog('INFO', '>>> testGetPm2Version()');
    $('#test-pm2-version').html('<span class="stl-loading"></span>');

    Pm2.getPm2Version(function (rdata) {
        if (rdata.status && rdata.version) {
            _debugLog('SUCCESS', 'PM2 版本: ' + rdata.version);
            $('#test-pm2-version').html('<span style="color:#20a53a;">' + rdata.version + '</span>');
        } else {
            _debugLog('WARN', (rdata.msg || '未检测到 PM2'));
            $('#test-pm2-version').html('<span style="color:#d9534f;">未检测到</span>');
        }
    });
}

/**
 * 测试 2: 检测 PM2 是否已安装
 */
function testIsPm2Installed() {
    _debugLog('INFO', '>>> testIsPm2Installed()');
    $('#test-pm2-install').html('<span class="stl-loading"></span>');

    Pm2.isPm2Installed(function (rdata) {
        if (rdata.status && rdata.installed) {
            _debugLog('SUCCESS', 'PM2 已安装: ' + (rdata.version || ''));
            $('#test-pm2-install').html('<span style="color:#20a53a;">已安装 (' + (rdata.version || '') + ')</span>');
        } else {
            _debugLog('WARN', 'PM2 未安装');
            $('#test-pm2-install').html('<span style="color:#d9534f;">未安装</span>');
        }
    });
}

/**
 * 测试 3: 智能安装 PM2
 */
function testAutoInstallPm2() {
    layer.confirm('确认智能安装 PM2？已安装时将自动跳过。', {
        btn: ['确认', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testAutoInstallPm2()');
        $('#test-auto-install-pm2-btn').prop('disabled', true);
        $('#test-pm2-progress').html('<span class="stl-loading"></span>');

        // 打开日志弹窗
        _openInstallLogLayer('PM2 安装日志');

        Pm2.autoInstallPm2(
            // 完成回调
            function (rdata) {
                $('#test-auto-install-pm2-btn').prop('disabled', false);

                if (rdata.status) {
                    _debugLog('SUCCESS', rdata.msg);
                    $('#test-pm2-progress').html('<span style="color:#20a53a;">完成 (' + (rdata.version || '') + ')</span>');
                    layer.msg(rdata.msg, { icon: 1 });
                    // 安装成功，3 秒后自动关闭日志弹窗
                    setTimeout(function () {
                        if (_installLogLayerIndex) {
                            layer.close(_installLogLayerIndex);
                            _installLogLayerIndex = null;
                        }
                    }, 3000);
                } else {
                    _debugLog('ERROR', rdata.msg);
                    $('#test-pm2-progress').html('<span style="color:#d9534f;">失败</span>');
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
                $('#test-pm2-progress').text(msg);
                _debugLog('INFO', msg);
            }
        );
    });
}

/**
 * 测试 4: 获取 SillyTavern 运行状态
 */
function testGetStatus() {
    _debugLog('INFO', '>>> testGetStatus()');
    $('#test-pm2-status').html('<span class="stl-loading"></span>');

    Pm2.getStatus(function (rdata) {
        if (rdata.status && rdata.running) {
            var info = rdata.info || {};
            _debugLog('SUCCESS', 'SillyTavern 运行中 PID:' + (info.pid || '') + ' 内存:' + _formatMemory(info.memory || 0));
            $('#test-pm2-status').html(
                '<span style="color:#20a53a;">运行中</span>' +
                '<span style="color:#999;font-size:12px;margin-left:6px;">' +
                    'PID:' + (info.pid || '') +
                    ' | 重启:' + (info.restarts || 0) +
                    ' | 内存:' + _formatMemory(info.memory || 0) +
                '</span>'
            );
        } else {
            var msg = (rdata && rdata.msg) ? rdata.msg : '未运行';
            _debugLog('INFO', 'SillyTavern: ' + msg);
            $('#test-pm2-status').html('<span style="color:#d9534f;">' + msg + '</span>');
        }
    });
}

/**
 * 测试 5: 启动 SillyTavern
 */
function testStart() {
    layer.confirm('确认启动 SillyTavern？', {
        btn: ['确认', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testStart()');
        $('#test-pm2-start').html('<span class="stl-loading"></span>');

        Pm2.start(function (rdata) {
            if (rdata.status) {
                _debugLog('SUCCESS', rdata.msg);
                $('#test-pm2-start').html('<span style="color:#20a53a;">已启动</span>');
                layer.msg(rdata.msg, { icon: 1 });
                // 启动后自动刷新状态
                testGetStatus();
            } else {
                _debugLog('WARN', rdata.msg);
                $('#test-pm2-start').html('<span style="color:#d9534f;">失败</span>');
                layer.msg(rdata.msg, { icon: 2 });
            }
        });
    });
}

/**
 * 测试 6: 停止 SillyTavern
 */
function testStop() {
    layer.confirm('确认停止 SillyTavern？（进程仍在 PM2 列表中，可重启）', {
        btn: ['确认', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testStop()');
        $('#test-pm2-stop').html('<span class="stl-loading"></span>');

        Pm2.stop(function (rdata) {
            if (rdata.status) {
                _debugLog('SUCCESS', rdata.msg);
                $('#test-pm2-stop').html('<span style="color:#20a53a;">已停止</span>');
                layer.msg(rdata.msg, { icon: 1 });
                testGetStatus();
            } else {
                _debugLog('ERROR', rdata.msg);
                $('#test-pm2-stop').html('<span style="color:#d9534f;">失败</span>');
                layer.msg(rdata.msg, { icon: 2 });
            }
        });
    });
}

/**
 * 测试 8: 重启 SillyTavern
 */
function testRestart() {
    layer.confirm('确认重启 SillyTavern？', {
        btn: ['确认', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testRestart()');
        $('#test-pm2-restart').html('<span class="stl-loading"></span>');

        Pm2.restart(function (rdata) {
            if (rdata.status) {
                _debugLog('SUCCESS', rdata.msg);
                $('#test-pm2-restart').html('<span style="color:#20a53a;">已重启</span>');
                layer.msg(rdata.msg, { icon: 1 });
                testGetStatus();
            } else {
                _debugLog('ERROR', rdata.msg);
                $('#test-pm2-restart').html('<span style="color:#d9534f;">失败</span>');
                layer.msg(rdata.msg, { icon: 2 });
            }
        });
    });
}

/**
 * 测试 9: 强制停止 SillyTavern（从 PM2 中彻底移除）
 */
function testForceStop() {
    layer.confirm('⚠️ 确认强制停止？这将从 PM2 中彻底移除 SillyTavern 进程，需要重新启动才能再次运行。', {
        btn: ['确认', '取消'],
        icon: 3
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testForceStop()');
        $('#test-pm2-force-stop').html('<span class="stl-loading"></span>');

        Pm2.forceStop(function (rdata) {
            if (rdata.status) {
                _debugLog('SUCCESS', rdata.msg);
                $('#test-pm2-force-stop').html('<span style="color:#20a53a;">已移除</span>');
                layer.msg(rdata.msg, { icon: 1 });
                testGetStatus();
            } else {
                _debugLog('ERROR', rdata.msg);
                $('#test-pm2-force-stop').html('<span style="color:#d9534f;">失败</span>');
                layer.msg(rdata.msg, { icon: 2 });
            }
        });
    });
}

/**
 * 测试 7: 获取 SillyTavern 日志
 */
function testGetLogs() {
    var type = $('#test-log-type').val();
    var lines = parseInt($('#test-log-lines').val(), 10) || 100;

    _debugLog('INFO', '>>> testGetLogs(type=' + type + ', lines=' + lines + ')');

    Pm2.getLogs(function (rdata) {
        var area = $('#test-pm2-logs-area');
        area.show();

        if (rdata.status && rdata.logs) {
            _debugLog('SUCCESS', '获取日志成功（' + rdata.logs.split('\n').length + ' 行）');
            $('#test-pm2-logs').text(rdata.logs);
            $('#test-pm2-logs').scrollTop($('#test-pm2-logs')[0].scrollHeight);
        } else {
            var msg = (rdata && rdata.msg) ? rdata.msg : '获取日志失败';
            _debugLog('WARN', msg);
            $('#test-pm2-logs').text(msg);
        }
    }, lines, type);
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

// ======== 辅助函数 ========

/**
 * 格式化内存（字节 → MB）
 */
function _formatMemory(bytes) {
    if (!bytes) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
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

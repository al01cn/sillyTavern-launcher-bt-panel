/**
 * Console 页面 - 控制台（增量日志轮询）
 *
 * 策略：
 * 1. 增量轮询：后端追踪文件位置，只返回新增行
 * 2. 前端只追加新行，不做清空/全量重绘
 * 3. 日志轮转由后端通过 inode 检测，前端无感知
 * 4. 简单原则：停止立即停轮询，启动立即启轮询，进入页面立即刷日志
 */

var ConsolePage = (function() {
    "use strict";

    // ============ 轮询状态 ============
    var _pollTimer = null;
    var _isPolling = false;
    var _consolePageActive = false;
    var _serviceRunning = false;
    var _eventsRegistered = false;
    var _refreshInProgress = false;
    var _portConflictHandled = false;

    // ============ UI 状态 ============
    var _autoScroll = true;
    var _userScrolled = false;

    var MAX_DISPLAY_LINES = 500;
    var POLL_INTERVAL = 1000;

    // 日志文件夹路径
    var _logFolderPath = '';

    /**
     * 加载并显示日志文件路径
     */
    function _loadLogPath() {
        request_plugin('get_pm2_log_paths', {}, function(rdata) {
            if (rdata.status && rdata.out_log) {
                $('#log-out-path').text(rdata.out_log);
                $('#log-path-hint').show();
                _logFolderPath = rdata.out_log;
            }
        });
    }

    function openLogFolder() {
        if (_logFolderPath) {
            var folderPath = _logFolderPath.substring(0, _logFolderPath.lastIndexOf('/'));
            if (folderPath === _logFolderPath) {
                folderPath = _logFolderPath.substring(0, _logFolderPath.lastIndexOf('\\'));
            }
            request_plugin('open_directory', { path: folderPath }, function(rdata) {
                layer.msg(rdata.status ? '已打开日志文件夹' : '打开失败: ' + (rdata.msg || '未知错误'),
                    { icon: rdata.status ? 1 : 2 });
            });
        } else {
            layer.msg('日志路径未加载', { icon: 2 });
        }
    }

    /**
     * 渲染控制台页面
     */
    function renderConsolePage() {
        var $output = $('#console-output');
        var totalLines = $output.length > 0 ? $output.find('.log-line').length : 0;
        var hasRealContent = totalLines > 1 || (totalLines === 1 && !$output.text().includes('等待启动服务'));

        _consolePageActive = true;
        _portConflictHandled = false;

        if (hasRealContent) {
            _bindEvents();
            _loadLogPath();
            _checkServiceStatus();
            return;
        }

        var html =
            '<div class="stl-page active" id="page-console">' +
                '<div class="stl-console-header">' +
                    '<div class="stl-console-title">' +
                        '<i class="bi bi-terminal"></i>' +
                        '<span>实时日志</span>' +
                    '</div>' +
                    '<div class="stl-console-actions">' +
                        '<label class="stl-auto-scroll-toggle">' +
                            '<input type="checkbox" id="auto-scroll-checkbox" checked>' +
                            '<span>自动滚动</span>' +
                        '</label>' +
                        '<button class="btn btn-bt btn-bt-sm" onclick="ConsolePage.refreshLogs()">' +
                            '<i class="bi bi-arrow-clockwise"></i> 刷新' +
                        '</button>' +
                        '<button class="btn btn-bt btn-bt-sm" onclick="BTPlugin.clearLogs()">' +
                            '<i class="bi bi-trash"></i> 清空' +
                        '</button>' +
                        '<button class="btn btn-bt-danger btn-bt-sm" id="console-btn-stop" onclick="BTPlugin.stopService()" style="display:none;">' +
                            '<i class="bi bi-stop-fill"></i> 停止' +
                        '</button>' +
                        '<button class="btn btn-bt-danger btn-bt-sm" id="console-btn-force-stop" onclick="BTPlugin.forceStopService()" style="display:none; margin-left: 8px;" title="强制停止并从 PM2 移除">' +
                            '<i class="bi bi-x-circle-fill"></i> 强制停止' +
                        '</button>' +
                        '<button class="btn btn-bt btn-bt-sm btn-disabled" id="console-btn-start" onclick="BTPlugin.startService()" disabled>' +
                            '<i class="bi bi-play-fill"></i> 启动' +
                        '</button>' +
                    '</div>' +
                '</div>' +

                '<div class="stl-log-path-hint" id="log-path-hint" style="display:none;">' +
                    '<i class="bi bi-file-earmark-text"></i> ' +
                    '<span>完整日志文件：</span>' +
                    '<code id="log-out-path"></code>' +
                    ' <a href="javascript:void(0)" onclick="ConsolePage.openLogFolder()" title="打开日志文件夹"><i class="bi bi-folder2-open"></i></a>' +
                '</div>' +

                '<div class="stl-console" id="console-output">' +
                '</div>' +
            '</div>';

        $('.plugin_body').html(html);

        _bindEvents();
        _loadLogPath();

        $('#console-output').html(
            '<div class="log-line">' +
                '<span class="log-time">' + getCurrentTime() + '</span>' +
                '<span class="log-type log-type-system">SYSTEM</span>' +
                '<span class="log-content">等待启动服务...</span>' +
            '</div>'
        );

        _checkServiceStatus();
    }

    function _bindEvents() {
        $('#auto-scroll-checkbox').on('change', function() {
            _autoScroll = $(this).is(':checked');
            if (_autoScroll && !_userScrolled) {
                _scrollToBottom();
            }
        });

        $('#console-output').on('scroll', function() {
            var $output = $(this);
            var scrollHeight = $output[0].scrollHeight;
            var scrollTop = $output.scrollTop();
            var clientHeight = $output[0].clientHeight;
            var isAtBottom = (scrollHeight - scrollTop - clientHeight) < 50;
            _userScrolled = !isAtBottom;
        });

        if (_eventsRegistered) return;
        _eventsRegistered = true;

        // 页面离开
        $(document).on('stl-page-hidden', function() {
            _consolePageActive = false;
            _stopPolling();
        });

        // 页面进入
        $(document).on('stl-page-shown', function(event, page) {
            _consolePageActive = true;
            if (_serviceRunning) {
                // 进入页面时服务在跑 → 立即刷新一次日志，然后启动轮询
                _fetchLogsOnce(function() {
                    _startPolling();
                });
            }
        });
    }

    /**
     * 检查服务状态，更新按钮
     */
    function _checkServiceStatus() {
        request_plugin('get_startup_info', {}, function(startupData) {
            if (!startupData) startupData = {};
            var tavernInstalled = startupData && startupData.status && startupData.tavern_installed;

            request_plugin('pm2_status', {}, function(rdata) {
                if (!rdata) rdata = {};
                var running = rdata && rdata.status && rdata.running;

                if (running) {
                    $('#console-btn-stop').show().prop('disabled', false);
                    $('#console-btn-force-stop').show().prop('disabled', false);
                    $('#console-btn-start').hide();
                    _serviceRunning = true;
                    // 服务在跑 → 立即刷新日志 + 启动轮询
                    _fetchLogsOnce(function() {
                        _startPolling();
                    });
                } else if (rdata && rdata.status) {
                    $('#console-btn-stop').hide();
                    $('#console-btn-force-stop').hide();
                    $('#console-btn-start').show();
                    _serviceRunning = false;
                    _stopPolling();

                    if (tavernInstalled) {
                        $('#console-btn-start').prop('disabled', false).removeClass('btn-disabled');
                    } else {
                        $('#console-btn-start').prop('disabled', true).addClass('btn-disabled');
                    }
                } else {
                    $('#console-btn-start').prop('disabled', true).addClass('btn-disabled');
                    $('#console-btn-stop').prop('disabled', true).addClass('btn-disabled');
                }
            });
        });
    }

    /**
     * 启动轮询（仅当服务在跑 + 页面在控制台时）
     */
    function _startPolling() {
        if (!_serviceRunning || !_consolePageActive) return;
        if (_pollTimer) return;  // 已在轮询中
        _isPolling = true;
        _pollTimer = setTimeout(_pollLogs, POLL_INTERVAL);
    }

    /**
     * 停止轮询
     */
    function _stopPolling() {
        _isPolling = false;
        if (_pollTimer) {
            clearTimeout(_pollTimer);
            _pollTimer = null;
        }
    }

    /**
     * 进入页面时一次性拉取日志（reset 位置）
     */
    function _fetchLogsOnce(callback) {
        var pending = 2;
        var success = false;

        function finish() {
            pending--;
            if (pending > 0) return;
            if (callback) callback();
        }

        request_plugin('pm2_logs', { type: 'out', reset: '1' }, function(rdata) {
            if (rdata.status) {
                $('#console-output').empty();
                _appendLogLine(getCurrentTime(), 'SYSTEM', '--- PM2日志开始 ---');
                if (rdata.lines && rdata.lines.length > 0) {
                    _appendLines('out', rdata.lines);
                    success = true;
                }
            }
            finish();
        });

        request_plugin('pm2_logs', { type: 'err', reset: '1' }, function(rdata) {
            if (rdata.status && rdata.lines && rdata.lines.length > 0) {
                _appendLines('err', rdata.lines);
                success = true;
            }
            finish();
        });
    }

    /**
     * 增量轮询日志（out 和 err 并行）
     */
    function _pollLogs() {
        if (!_isPolling || !_serviceRunning || !_consolePageActive) {
            _stopPolling();
            return;
        }
        if (_refreshInProgress) {
            _pollTimer = null;
            return;
        }

        var pending = 2;
        var hasNewOut = false;
        var hasNewErr = false;

        function scheduleNext() {
            if (_isPolling && _serviceRunning && _consolePageActive && !_refreshInProgress) {
                _pollTimer = setTimeout(_pollLogs, POLL_INTERVAL);
            } else {
                _stopPolling();
            }
        }

        function checkDone() {
            pending--;
            if (pending > 0) return;
            if (_autoScroll && (hasNewOut || hasNewErr)) {
                _scrollToBottom();
            }
            scheduleNext();
        }

        request_plugin('pm2_logs', { type: 'out' }, function(rdata) {
            if (rdata && rdata.running === false) {
                _serviceRunning = false;
                _stopPolling();
                return;
            }
            if (rdata.status && rdata.lines && rdata.lines.length > 0) {
                hasNewOut = true;
                _checkPortConflict(rdata.lines);
                _appendLines('out', rdata.lines);
            }
            checkDone();
        });

        request_plugin('pm2_logs', { type: 'err' }, function(rdata) {
            if (rdata && rdata.running === false) {
                _serviceRunning = false;
                _stopPolling();
                return;
            }
            if (rdata.status && rdata.lines && rdata.lines.length > 0) {
                hasNewErr = true;
                _checkPortConflict(rdata.lines);
                _appendLines('err', rdata.lines);
            }
            checkDone();
        });
    }

    /**
     * 检测端口占用错误
     */
    function _checkPortConflict(lines) {
        if (_portConflictHandled) return;
        for (var i = 0; i < lines.length; i++) {
            var content = lines[i].content || lines[i].raw || '';
            if (content.indexOf('is already in use') !== -1 || content.indexOf('Address') !== -1) {
                _portConflictHandled = true;
                _stopPolling();
                _serviceRunning = false;
                request_plugin('stop_service', {}, function() {
                    if (window.checkServiceStatus) window.checkServiceStatus();
                    _appendLogLine(getCurrentTime(), 'ERROR', '========================================');
                    _appendLogLine(getCurrentTime(), 'ERROR', '端口被占用！');
                    _appendLogLine(getCurrentTime(), 'ERROR', '请先关闭占用端口的程序，或更换端口后再启动');
                    _appendLogLine(getCurrentTime(), 'ERROR', '========================================');
                });
                return;
            }
        }
    }

    /**
     * 强制刷新：重置后端位置，清空前端，重新拉全部历史
     */
    function refreshLogs() {
        if (_refreshInProgress) return;
        _refreshInProgress = true;
        _stopPolling();

        layer.msg('正在刷新日志...', { icon: 16, time: 500 });

        var pending = 2;
        var success = false;

        function finish() {
            pending--;
            if (pending > 0) return;
            _refreshInProgress = false;
            layer.msg(success ? '日志已刷新' : '获取日志失败', { icon: success ? 1 : 2 });
            _startPolling();
        }

        request_plugin('pm2_logs', { type: 'out', reset: '1' }, function(rdata) {
            if (rdata.status) {
                $('#console-output').empty();
                _appendLogLine(getCurrentTime(), 'SYSTEM', '--- PM2日志开始 ---（已刷新）');
                if (rdata.lines && rdata.lines.length > 0) {
                    _appendLines('out', rdata.lines);
                    success = true;
                }
            }
            finish();
        });

        request_plugin('pm2_logs', { type: 'err', reset: '1' }, function(rdata) {
            if (rdata.status && rdata.lines && rdata.lines.length > 0) {
                _appendLines('err', rdata.lines);
                success = true;
            }
            finish();
        });
    }

    /**
     * 追加多行日志
     */
    function _appendLines(logType, lines) {
        var $output = $('#console-output');
        for (var i = 0; i < lines.length; i++) {
            var item = lines[i];
            var displayType = _detectLogType(item.content || item.raw || '', logType);

            var existing = $output.find('.log-line').length;
            if (existing >= MAX_DISPLAY_LINES) {
                $output.find('.log-line').first().remove();
            }

            var html =
                '<div class="log-line">' +
                    '<span class="log-time">' + (item.time || getCurrentTime()) + '</span>' +
                    '<span class="log-type log-type-' + displayType + '">' + displayType.toUpperCase() + '</span>' +
                    '<span class="log-content">' + escapeHtml(item.content || item.raw || '') + '</span>' +
                '</div>';

            $output.append(html);
        }
    }

    /**
     * 追加单行日志
     */
    function _appendLogLine(time, type, content) {
        var $output = $('#console-output');

        var existing = $output.find('.log-line').length;
        if (existing >= MAX_DISPLAY_LINES) {
            $output.find('.log-line').first().remove();
        }

        var html =
            '<div class="log-line">' +
                '<span class="log-time">' + time + '</span>' +
                '<span class="log-type log-type-' + type.toLowerCase() + '">' + type + '</span>' +
                '<span class="log-content">' + escapeHtml(content) + '</span>' +
            '</div>';

        $output.append(html);
    }

    /**
     * 根据日志内容检测类型
     */
    function _detectLogType(text, logType) {
        if (logType === 'err') return 'error';
        if (text.indexOf('[PM2]') !== -1) return 'system';
        if (text.indexOf('ERROR') !== -1 || text.indexOf('error') !== -1) return 'error';
        if (text.indexOf('SUCCESS') !== -1 || text.indexOf('success') !== -1) return 'success';
        if (text.indexOf('INFO') !== -1 || text.indexOf('info') !== -1) return 'info';
        if (text.indexOf('WARN') !== -1 || text.indexOf('warn') !== -1) return 'warn';
        return 'output';
    }

    function _scrollToBottom() {
        var $output = $('#console-output');
        if ($output.length === 0 || !$output[0]) return;
        try {
            $output.animate({ scrollTop: $output[0].scrollHeight }, 200);
        } catch (e) {}
    }

    function escapeHtml(text) {
        text = stripAnsi(text);
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    function stripAnsi(text) {
        if (!text) return '';
        return text
            .replace(/\x1b]\d+;[^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
            .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
            .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
            .replace(/\x1b[()-~][^\x1b]*(?:\x1b\\|\x07)/g, '')
            .replace(/\x1b[PM][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
            .replace(/[\x00-\x1f\x7f]/g, '')
            .replace(/\x1b[><=?][^\x40-\x7e]*/g, '')
            .trim();
    }

    /**
     * 服务启动回调
     */
    function onServiceStart(envData) {
        _serviceRunning = true;
        _portConflictHandled = false;

        var $output = $('#console-output');
        if ($output.length === 0) return;

        $output.empty();
        request_plugin('pm2_logs', { type: 'out', reset: '1' }, function() {});
        request_plugin('pm2_logs', { type: 'err', reset: '1' }, function() {});

        addLog('SYSTEM', '开始启动 SillyTavern...');
        addLog('INFO', '[准备工作] 检测酒馆安装状态...');

        if (envData.tavern_version) addLog('INFO', '酒馆版本: ' + envData.tavern_version);
        if (envData.node_version) addLog('INFO', 'Node.js 版本: ' + envData.node_version);
        if (envData.git_version) addLog('INFO', 'Git 版本: ' + envData.git_version);
        if (envData.pm2_version) addLog('INFO', 'PM2 版本: ' + envData.pm2_version);

        addLog('SYSTEM', '[启动] 使用 PM2 启动 SillyTavern...');
        addLog('SYSTEM', '--- PM2日志开始 ---');

        $('#console-btn-stop').show().prop('disabled', false);
        $('#console-btn-force-stop').show().prop('disabled', false);
        $('#console-btn-start').hide();

        // 启动服务 → 立即启动轮询
        _startPolling();
    }

    /**
     * 服务停止回调
     */
    function onServiceStop() {
        _serviceRunning = false;
        _stopPolling();

        addLog('SYSTEM', '--- PM2日志结束 ---');
        addLog('SYSTEM', 'SillyTavern 已停止');

        // 隐藏停止按钮
        $('#console-btn-stop').hide();
        $('#console-btn-force-stop').hide();

        // 显示并启用启动按钮（统一复用 _checkServiceStatus 判断酒馆是否已安装）
        $('#console-btn-start').show();
        $('#console-btn-start').prop('disabled', false).removeClass('btn-disabled');
    }

    /**
     * 添加日志行
     */
    function addLog(type, content) {
        _appendLogLine(getCurrentTime(), type, content);
        if (_autoScroll) _scrollToBottom();
    }

    /**
     * 清空前端日志
     */
    function clearLogs() {
        $('#console-output').html('');
        addLog('SYSTEM', '日志已清空');
    }

    function getCurrentTime() {
        var now = new Date();
        var h = now.getHours().toString().padStart(2, '0');
        var m = now.getMinutes().toString().padStart(2, '0');
        var s = now.getSeconds().toString().padStart(2, '0');
        return h + ':' + m + ':' + s;
    }

    // ============ 公开 API ============
    return {
        renderConsolePage: renderConsolePage,
        onServiceStart: onServiceStart,
        onServiceStop: onServiceStop,
        refreshLogs: refreshLogs,
        addLog: addLog,
        clearLogs: clearLogs,
        openLogFolder: openLogFolder
    };
})();

// ============ 全局兼容 ============
window.ConsolePage = ConsolePage;

function renderConsolePage() { ConsolePage.renderConsolePage(); }
function clearLogs() { ConsolePage.clearLogs(); }
function addLog(type, content) { ConsolePage.addLog(type, content); }
function getCurrentTime() {
    var now = new Date();
    return now.getHours().toString().padStart(2,'0') + ':' +
           now.getMinutes().toString().padStart(2,'0') + ':' +
           now.getSeconds().toString().padStart(2,'0');
}

function forceStopService() {
    layer.confirm('确定要强制停止服务吗？<br>这将从 PM2 中彻底移除 SillyTavern 进程。', {
        btn: ['强制停止', '取消']
    }, function(index) {
        layer.close(index);
        $('#console-btn-force-stop').html('<span class="stl-loading"></span> 强制停止中...').prop('disabled', true);

        request_plugin('pm2_force_stop', {}, function(rdata) {
            if (rdata.status) {
                if (window.checkServiceStatus) window.checkServiceStatus();
                if (window.ConsolePage && typeof window.ConsolePage.onServiceStop === 'function') {
                    window.ConsolePage.onServiceStop();
                }
                if (window.addLog) {
                    window.addLog('SYSTEM', '--- PM2日志结束 ---');
                    window.addLog('SYSTEM', 'SillyTavern 已强制停止并从 PM2 移除');
                }
                layer.msg('已强制停止', { icon: 1 });
            } else {
                $('#console-btn-force-stop').html('<i class="bi bi-x-circle-fill"></i> 强制停止').prop('disabled', false);
                layer.msg(rdata.msg || '强制停止失败', { icon: 2 });
            }
        });
    });
}

/**
 * Debug 测试页面 - Git 模块测试
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
                    '<i class="bi bi-bug"></i> Git 模块测试' +
                '</div>' +
                '<div class="stl-alert stl-alert-warning">' +
                    '<i class="bi bi-exclamation-triangle" style="margin-right:8px;"></i>' +
                    '此页面仅供开发调试，上线前请移除。' +
                '</div>' +
            '</div>' +

            // 测试方法区
            '<div class="stl-card">' +
                '<div class="stl-section-header">' +
                    '<i class="bi bi-play-circle"></i> 测试方法' +
                '</div>' +

                // 1. 获取 Git 版本
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-terminal"></i> getGitVersion()</span>' +
                    '<span class="stl-info-value" id="test-git-version">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testGetGitVersion()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 执行' +
                '</button>' +

                // 2. 检测 Git 是否已安装
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-box-seam"></i> isGitInstall()</span>' +
                    '<span class="stl-info-value" id="test-git-install">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testIsGitInstall()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 执行' +
                '</button>' +

                // 3. 智能安装 Git
                '<div class="stl-section-header" style="margin-top:10px;">' +
                    '<i class="bi bi-rocket-takeoff"></i> autoInstallGit()' +
                '</div>' +
                '<div class="stl-flex stl-flex-gap-10" style="margin:0 0 10px 0;">' +
                    '<button class="btn btn-bt" id="test-auto-install-btn" onclick="testAutoInstallGit()">' +
                        '<i class="bi bi-play-fill"></i> 智能安装（自动检测）' +
                    '</button>' +
                    '<button class="btn btn-bt-outline" id="test-force-install-btn" onclick="testForceInstallGit()">' +
                        '<i class="bi bi-arrow-counterclockwise"></i> 强制安装' +
                    '</button>' +
                '</div>' +
                '<div class="stl-info-item" style="margin-top:10px;">' +
                    '<span class="stl-info-label"><i class="bi bi-signpost-split"></i> 当前进度</span>' +
                    '<span class="stl-info-value" id="test-git-progress">--</span>' +
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
    _debugLog('SYSTEM', 'Git 模块测试页面已加载，可以开始测试');
}

// ======== 测试方法 ========

/**
 * 测试 1: 获取 Git 版本
 */
function testGetGitVersion() {
    _debugLog('INFO', '>>> testGetGitVersion()');
    $('#test-git-version').html('<span class="stl-loading"></span>');

    Git.getGitVersion(function (rdata) {
        if (rdata.status && rdata.version) {
            _debugLog('SUCCESS', 'Git 版本: ' + rdata.version);
            $('#test-git-version').html('<span style="color:#20a53a;">' + rdata.version + '</span>');
        } else {
            _debugLog('WARN', (rdata.msg || '未检测到 Git'));
            $('#test-git-version').html('<span style="color:#d9534f;">未检测到</span>');
        }
    });
}

/**
 * 测试 2: 检测 Git 是否已安装
 */
function testIsGitInstall() {
    _debugLog('INFO', '>>> testIsGitInstall()');
    $('#test-git-install').html('<span class="stl-loading"></span>');

    Git.isGitInstall(function (rdata) {
        if (rdata.status && rdata.installed) {
            _debugLog('SUCCESS', 'Git 已安装: ' + (rdata.version || ''));
            $('#test-git-install').html('<span style="color:#20a53a;">已安装 (' + (rdata.version || '') + ')</span>');
        } else {
            _debugLog('WARN', 'Git 未安装');
            $('#test-git-install').html('<span style="color:#d9534f;">未安装</span>');
        }
    });
}

/**
 * 测试 3: 智能安装 Git（自动检测，已安装则跳过）
 */
function testAutoInstallGit() {
    layer.confirm('确认智能安装 Git？已安装时将自动跳过。', {
        btn: ['确认', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testAutoInstallGit()');
        _doTestInstallGit(false);
    });
}

/**
 * 测试 4: 强制安装 Git（跳过检测，直接执行安装脚本）
 */
function testForceInstallGit() {
    layer.confirm('确认强制安装 Git？将跳过已安装检测，直接执行安装脚本。', {
        btn: ['确认', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testForceInstallGit()');
        _doTestInstallGit(true);
    });
}

/**
 * 执行安装测试的通用逻辑
 * @param {boolean} force 是否强制安装
 */
function _doTestInstallGit(force) {
    // 禁用按钮
    $('#test-auto-install-btn, #test-force-install-btn').prop('disabled', true);
    $('#test-git-progress').html('<span class="stl-loading"></span>');
    $('#debug-log').html('');

    // 打开日志弹窗
    _openInstallLogLayer();

    var installFn = force ? Git.forceInstallGit : Git.autoInstallGit;

    installFn(
        // 完成回调
        function (rdata) {
            // 恢复按钮
            $('#test-auto-install-btn, #test-force-install-btn').prop('disabled', false);

            if (rdata.status) {
                _debugLog('SUCCESS', rdata.msg);
                $('#test-git-progress').html('<span style="color:#20a53a;">完成 (' + (rdata.version || '') + ')</span>');
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
                $('#test-git-progress').html('<span style="color:#d9534f;">失败</span>');
                layer.msg(rdata.msg || '安装失败', { icon: 2 });
            }
        },
        // 日志回调（实时输出到日志弹窗和调试日志）
        function (logText) {
            _appendToLogLayer(logText);
            _debugLog('OUTPUT', logText.replace(/\n$/, ''));
        },
        // 进度回调
        function (msg) {
            $('#test-git-progress').text(msg);
            _debugLog('INFO', msg);
        }
    );
}

// ======== 日志弹窗 ========

/**
 * 打开 Git 安装日志弹窗
 */
function _openInstallLogLayer() {
    // 关闭之前的弹窗
    if (_installLogLayerIndex) {
        layer.close(_installLogLayerIndex);
    }

    _installLogLayerIndex = layer.open({
        type: 1,
        title: '<i class="bi bi-terminal" style="margin-right:6px;"></i>Git 安装日志',
        area: ['700px', '500px'],
        shadeClose: false,
        closeBtn: 1,
        content:
            '<div style="padding:10px;">' +
                '<div id="git-install-log" style="' +
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
    var el = $('#git-install-log');
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

    // 复制到剪贴板
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

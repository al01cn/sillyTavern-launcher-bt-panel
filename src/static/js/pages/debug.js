/**
 * Debug 测试页面 - NodeJs 模块测试
 * 临时调试用，上线前删除
 */

function renderDebugPage() {
    var html =
        '<div class="stl-page active" id="page-debug">' +

            // 标题
            '<div class="stl-card">' +
                '<div class="stl-card-title">' +
                    '<i class="bi bi-bug"></i> NodeJs 模块测试' +
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

                // 1. 获取系统 NodeJs 版本
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-terminal"></i> getSysNodejsVersion()</span>' +
                    '<span class="stl-info-value" id="test-node-version">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testGetSysNodejsVersion()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 执行' +
                '</button>' +

                // 2. 检测 NodeJs 插件是否已安装
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-box-seam"></i> isNodejsPluginSetup()</span>' +
                    '<span class="stl-info-value" id="test-node-setup">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testIsNodejsPluginSetup()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 执行' +
                '</button>' +

                // 3. 检测 NodeJs 插件状态
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-heart-pulse"></i> isNodejsPluginStatus()</span>' +
                    '<span class="stl-info-value" id="test-node-status">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testIsNodejsPluginStatus()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 执行' +
                '</button>' +

                // 4. 安装 NodeJs 插件
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-download"></i> installNodejsPlugin()</span>' +
                    '<span class="stl-info-value" id="test-install-plugin">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" id="test-install-plugin-btn" onclick="testInstallNodejsPlugin()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 安装插件' +
                '</button>' +

                // 5. 查询指定版本是否已安装
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-search"></i> isNodejsVersionInstalled()</span>' +
                    '<span class="stl-info-value" id="test-version-installed">--</span>' +
                '</div>' +
                '<div class="stl-flex stl-flex-gap-10" style="margin:0 0 15px 0;">' +
                    '<input type="text" class="stl-form-control" id="test-check-version" placeholder="输入版本号 如 v20.10.0" style="width:200px;" value="v20.10.0">' +
                    '<button class="btn btn-bt btn-bt-sm" onclick="testIsNodejsVersionInstalled()">' +
                        '<i class="bi bi-play-fill"></i> 查询' +
                    '</button>' +
                '</div>' +

                // 6. 获取最新 LTS 版本
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-tag"></i> getLatestLtsVersion()</span>' +
                    '<span class="stl-info-value" id="test-latest-lts">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testGetLatestLtsVersion()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 执行' +
                '</button>' +

                // 7. 获取最佳已安装版本
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-trophy"></i> getBestInstalledVersion()</span>' +
                    '<span class="stl-info-value" id="test-best-installed">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testGetBestInstalledVersion()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 执行' +
                '</button>' +

                // 8. 获取当前 NPM 源 URL
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-link-45deg"></i> getNpmRegistry()</span>' +
                    '<span class="stl-info-value" id="test-npm-registry">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testGetNpmRegistry()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 获取 NPM 源' +
                '</button>' +

                // 9. 获取当前 NPM 源名称
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-tags"></i> getNpmRegistryLabel()</span>' +
                    '<span class="stl-info-value" id="test-npm-registry-label">--</span>' +
                '</div>' +
                '<button class="btn btn-bt btn-bt-sm" onclick="testGetNpmRegistryLabel()" style="margin:0 0 15px 0;">' +
                    '<i class="bi bi-play-fill"></i> 获取源名称' +
                '</button>' +

                // 10. 设置 NPM 源
                '<div class="stl-info-item">' +
                    '<span class="stl-info-label"><i class="bi bi-pencil-square"></i> setNpmRegistry()</span>' +
                    '<span class="stl-info-value" id="test-npm-registry-set">--</span>' +
                '</div>' +
                '<div class="stl-flex stl-flex-gap-10" style="margin:0 0 15px 0;">' +
                    '<select class="stl-form-control" id="test-set-registry" style="width:280px;">' +
                        '<option value="">-- 选择 NPM 源 --</option>' +
                    '</select>' +
                    '<button class="btn btn-bt btn-bt-sm" onclick="testSetNpmRegistry()">' +
                        '<i class="bi bi-check-lg"></i> 切换' +
                    '</button>' +
                '</div>' +

                // 11. 一键自动配置
                '<div class="stl-section-header" style="margin-top:10px;">' +
                    '<i class="bi bi-rocket-takeoff"></i> autoSetupNodejsPluginAndPM2AndSetDefault()' +
                '</div>' +
                '<button class="btn btn-bt" id="test-auto-btn" onclick="testAutoSetup()">' +
                    '<i class="bi bi-play-fill"></i> 一键自动配置' +
                '</button>' +
                '<div class="stl-info-item" style="margin-top:10px;">' +
                    '<span class="stl-info-label"><i class="bi bi-signpost-split"></i> 当前进度</span>' +
                    '<span class="stl-info-value" id="test-auto-progress">--</span>' +
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
    _debugLog('SYSTEM', 'NodeJs 模块测试页面已加载，可以开始测试');
    _debugLog('INFO', 'NodeJs 模块路径: ' + (NodeJs.config ? NodeJs.config.main_path : '未找到'));

    // 初始化 NPM 源 select
    if (NodeJs.npmRegistryPresets) {
        var options = '';
        for (var i = 0; i < NodeJs.npmRegistryPresets.length; i++) {
            var item = NodeJs.npmRegistryPresets[i];
            options += '<option value="' + item.value + '">' + item.label + ' (' + item.value + ')</option>';
        }
        $('#test-set-registry').append(options);
    }
}

// ======== 测试方法 ========

/**
 * 测试 1: 获取系统 NodeJs 版本
 */
function testGetSysNodejsVersion() {
    _debugLog('INFO', '>>> testGetSysNodejsVersion()');
    $('#test-node-version').html('<span class="stl-loading"></span>');

    NodeJs.getSysNodejsVersion(function (version) {
        if (version) {
            _debugLog('SUCCESS', '系统 NodeJs 版本: ' + version);
            $('#test-node-version').html('<span style="color:#20a53a;">' + version + '</span>');
        } else {
            _debugLog('ERROR', '未检测到 NodeJs 版本');
            $('#test-node-version').html('<span style="color:#d9534f;">未检测到</span>');
        }
    });
}

/**
 * 测试 2: 检测 NodeJs 插件是否已安装
 */
function testIsNodejsPluginSetup() {
    _debugLog('INFO', '>>> testIsNodejsPluginSetup()');
    $('#test-node-setup').html('<span class="stl-loading"></span>');

    NodeJs.isNodejsPluginSetup(function (isSetup) {
        if (isSetup) {
            _debugLog('SUCCESS', 'NodeJs 插件已安装 (setup=true)');
            $('#test-node-setup').html('<span style="color:#20a53a;">已安装</span>');
        } else {
            _debugLog('WARN', 'NodeJs 插件未安装 (setup=false)');
            $('#test-node-setup').html('<span style="color:#d9534f;">未安装</span>');
        }
    });
}

/**
 * 测试 3: 检测 NodeJs 插件状态
 */
function testIsNodejsPluginStatus() {
    _debugLog('INFO', '>>> testIsNodejsPluginStatus()');
    $('#test-node-status').html('<span class="stl-loading"></span>');

    NodeJs.isNodejsPluginStatus(function (isOk) {
        if (isOk) {
            _debugLog('SUCCESS', 'NodeJs 插件状态正常 (setup=true, status=true)');
            $('#test-node-status').html('<span style="color:#20a53a;">正常</span>');
        } else {
            _debugLog('WARN', 'NodeJs 插件状态异常或未安装');
            $('#test-node-status').html('<span style="color:#d9534f;">异常/未安装</span>');
        }
    });
}

/**
 * 测试 4: 安装 NodeJs 插件
 */
function testInstallNodejsPlugin() {
    layer.confirm('确认安装 NodeJs 版本管理器插件？', {
        btn: ['确认安装', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testInstallNodejsPlugin()');
        $('#test-install-plugin').html('<span class="stl-loading"></span>');
        $('#test-install-plugin-btn').prop('disabled', true);

        NodeJs.installNodejsPlugin(
            function (rdata) {
                $('#test-install-plugin-btn').prop('disabled', false);
                if (rdata.status) {
                    _debugLog('SUCCESS', rdata.msg);
                    $('#test-install-plugin').html('<span style="color:#20a53a;">安装成功</span>');
                    layer.msg(rdata.msg, { icon: 1 });
                } else {
                    _debugLog('ERROR', rdata.msg);
                    $('#test-install-plugin').html('<span style="color:#d9534f;">失败</span>');
                    layer.msg(rdata.msg, { icon: 2 });
                }
            },
            function (msg) {
                _debugLog('INFO', msg);
                $('#test-install-plugin').text(msg);
            }
        );
    });
}

/**
 * 测试 5: 查询指定版本是否已安装
 */
function testIsNodejsVersionInstalled() {
    var version = $('#test-check-version').val().trim();
    if (!version) {
        _debugLog('ERROR', '请输入版本号');
        layer.msg('请输入版本号', { icon: 2 });
        return;
    }

    _debugLog('INFO', '>>> testIsNodejsVersionInstalled(version=' + version + ')');
    $('#test-version-installed').html('<span class="stl-loading"></span>');

    NodeJs.isNodejsVersionInstalled(version, function (isInstalled) {
        if (isInstalled) {
            _debugLog('SUCCESS', version + ' 已安装');
            $('#test-version-installed').html('<span style="color:#20a53a;">已安装</span>');
        } else {
            _debugLog('WARN', version + ' 未安装');
            $('#test-version-installed').html('<span style="color:#d9534f;">未安装</span>');
        }
    });
}

/**
 * 测试 6: 获取最新 LTS 版本
 */
function testGetLatestLtsVersion() {
    _debugLog('INFO', '>>> testGetLatestLtsVersion()');
    $('#test-latest-lts').html('<span class="stl-loading"></span>');

    NodeJs.getLatestLtsVersion(function (version) {
        if (version) {
            _debugLog('SUCCESS', '最新 LTS 版本: ' + version);
            $('#test-latest-lts').html('<span style="color:#20a53a;">' + version + '</span>');
        } else {
            _debugLog('ERROR', '无法获取最新 LTS 版本');
            $('#test-latest-lts').html('<span style="color:#d9534f;">获取失败</span>');
        }
    });
}

/**
 * 测试 7: 获取最佳已安装版本
 */
function testGetBestInstalledVersion() {
    _debugLog('INFO', '>>> testGetBestInstalledVersion()');
    $('#test-best-installed').html('<span class="stl-loading"></span>');

    NodeJs.getBestInstalledVersion(function (version) {
        if (version) {
            _debugLog('SUCCESS', '最佳已安装版本 (>=v20): ' + version);
            $('#test-best-installed').html('<span style="color:#20a53a;">' + version + '</span>');
        } else {
            _debugLog('WARN', '未找到已安装的 >=v20 版本');
            $('#test-best-installed').html('<span style="color:#d9534f;">无可用版本</span>');
        }
    });
}

/**
 * 测试 8: 获取当前 NPM 源 URL
 */
function testGetNpmRegistry() {
    _debugLog('INFO', '>>> testGetNpmRegistry()');
    $('#test-npm-registry').html('<span class="stl-loading"></span>');

    NodeJs.getNpmRegistry(function (rdata) {
        if (rdata.status && rdata.registry) {
            _debugLog('SUCCESS', '当前 NPM 源: ' + rdata.registry);
            $('#test-npm-registry').html('<span style="color:#20a53a;">' + rdata.registry + '</span>');
        } else {
            _debugLog('ERROR', (rdata.msg || '获取 NPM 源失败'));
            $('#test-npm-registry').html('<span style="color:#d9534f;">获取失败</span>');
        }
    });
}

/**
 * 测试 9: 获取当前 NPM 源名称
 */
function testGetNpmRegistryLabel() {
    _debugLog('INFO', '>>> testGetNpmRegistryLabel()');
    $('#test-npm-registry-label').html('<span class="stl-loading"></span>');

    NodeJs.getNpmRegistryLabel(function (rdata) {
        if (rdata.status) {
            _debugLog('SUCCESS', 'NPM 源: ' + rdata.label + ' (' + rdata.registry + ')');
            $('#test-npm-registry-label').html('<span style="color:#20a53a;">' + rdata.label + '</span>');
        } else {
            _debugLog('ERROR', '获取 NPM 源名称失败');
            $('#test-npm-registry-label').html('<span style="color:#d9534f;">获取失败</span>');
        }
    });
}

/**
 * 测试 10: 设置 NPM 源
 */
function testSetNpmRegistry() {
    var registry = $('#test-set-registry').val();
    if (!registry) {
        _debugLog('WARN', '请先选择一个 NPM 源');
        layer.msg('请先选择一个 NPM 源', { icon: 0 });
        return;
    }

    // 获取选中项的 label
    var label = registry;
    var options = $('#test-set-registry option');
    options.each(function () {
        if ($(this).val() === registry) {
            label = $(this).text().split(' (')[0]; // 取括号前的 label 部分
            return false;
        }
    });

    layer.confirm('确认将 NPM 源切换为：' + label + '？', {
        btn: ['确认切换', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testSetNpmRegistry(' + registry + ')');
        $('#test-npm-registry-set').html('<span class="stl-loading"></span>');

        NodeJs.setNpmRegistry(registry, function (rdata) {
            if (rdata.status) {
                _debugLog('SUCCESS', rdata.msg);
                $('#test-npm-registry-set').html('<span style="color:#20a53a;">' + label + '</span>');
                layer.msg(rdata.msg, { icon: 1 });
            } else {
                _debugLog('ERROR', rdata.msg);
                $('#test-npm-registry-set').html('<span style="color:#d9534f;">失败</span>');
                layer.msg(rdata.msg, { icon: 2 });
            }
        });
    });
}

/**
 * 测试 11: 一键自动配置 NodeJs + PM2
 */
function testAutoSetup() {
    layer.confirm('确认自动配置 NodeJs 环境与 PM2？将自动选择最优版本，仅安装缺失部分。', {
        btn: ['确认', '取消']
    }, function (index) {
        layer.close(index);
        _debugLog('INFO', '>>> testAutoSetup()');
        $('#test-auto-btn').prop('disabled', true).html('<span class="stl-loading"></span> 配置中...');

        NodeJs.autoSetupNodejsPluginAndPM2AndSetDefault(
            // 最终回调
            function (rdata) {
                $('#test-auto-btn').prop('disabled', false).html('<i class="bi bi-play-fill"></i> 一键自动配置');
                if (rdata.status) {
                    _debugLog('SUCCESS', rdata.msg);
                    $('#test-auto-progress').html('<span style="color:#20a53a;">完成 (' + (rdata.version || '') + ')</span>');
                    layer.msg(rdata.msg, { icon: 1 });
                } else {
                    _debugLog('ERROR', rdata.msg);
                    $('#test-auto-progress').html('<span style="color:#d9534f;">失败</span>');
                    layer.msg(rdata.msg || '配置失败', { icon: 2 });
                }
            },
            // 进度回调
            function (progress) {
                $('#test-auto-progress').text('[' + progress.stage + '] ' + progress.msg);

                if (progress.stage === 'done') {
                    _debugLog('SUCCESS', progress.msg);
                } else {
                    _debugLog('INFO', progress.msg);
                }
            }
        );
    });
}

// ======== 日志工具 ========

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

    var line =
        '<div class="log-line">' +
            '<span class="log-time">' + time + '</span>' +
            '<span class="log-type ' + typeClass + '">' + type + '</span>' +
            '<span class="log-content">' + content + '</span>' +
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

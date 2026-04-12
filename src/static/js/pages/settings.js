/**
 * Settings 页面 - 设置
 */

function renderSettingsPage() {
    var html = 
        '<div class="stl-page active" id="page-settings">' +
            // 数据设置
            '<div class="stl-card">' +
                '<div class="stl-group-title"><i class="bi bi-database"></i> 数据设置</div>' +

                '<div class="stl-form-group">' +
                    '<label class="stl-form-checkbox">' +
                        '<input type="checkbox" id="setting-keep-data" checked onchange="stl_onKeepDataChange()">' +
                        '<span>卸载插件时保留数据目录（/www/server/stl）</span>' +
                    '</label>' +
                    '<div class="stl-form-help">取消后，卸载会顺带删除 /www/server/stl，慎用。</div>' +
                '</div>' +
            '</div>' +

            // GitHub 加速（模块驱动）
            '<div class="stl-card">' +
                '<div class="stl-group-title"><i class="bi bi-lightning-charge"></i> GitHub 加速</div>' +


                '<div class="stl-form-group">' +
                    '<label class="stl-form-checkbox">' +
                        '<input type="checkbox" id="setting-ghproxy-enable" onchange="stl_saveGhProxy()">' +
                        '<span>启用 GitHub 加速</span>' +
                    '</label>' +
                    '<div class="stl-form-help">开启后克隆/更新 SillyTavern 时将使用加速地址</div>' +
                '</div>' +

                '<div class="stl-form-group">' +
                    '<div class="stl-flex stl-flex-between" style="margin-bottom:10px;">' +
                        '<label class="stl-form-label" style="margin-bottom:0;">加速节点</label>' +
                        '<div class="stl-flex" style="gap:8px;">' +
                            '<button class="btn btn-bt-outline btn-bt-sm" onclick="stl_testAllProxies()" title="TCPing 测试延迟">' +
                                '<i class="bi bi-speedometer2"></i> 测速' +
                            '</button>' +
                            '<button class="btn btn-bt-outline btn-bt-sm" onclick="stl_refreshProxies()" title="刷新列表">' +
                                '<i class="bi bi-arrow-clockwise"></i>' +
                            '</button>' +
                            '<button class="btn btn-bt btn-bt-sm" onclick="stl_autoBestProxy()" title="自动选择最佳节点">' +
                                '<i class="bi bi-magic"></i> 一键最佳' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="stl-proxy-table-wrap">' +
                        '<table class="stl-proxy-table">' +
                            '<thead>' +
                                '<tr>' +
                                    '<th style="width:50%;">加速地址</th>' +
                                    '<th style="width:25%;text-align:center;">延迟</th>' +
                                    '<th style="width:25%;text-align:center;">操作</th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody id="setting-ghproxy-tbody">' +
                                '<tr><td colspan="3" style="text-align:center;color:#999;padding:30px;">加载中...</td></tr>' +
                            '</tbody>' +
                            '<tfoot>' +
                                '<tr class="stl-proxy-custom-row">' +
                                    '<td colspan="1">' +
                                        '<input type="text" class="stl-proxy-custom-input" id="setting-ghproxy-url" ' +
                                            'placeholder="输入自定义地址，如 https://ghfast.top/" onblur="stl_onCustomUrlBlur()">' +
                                    '</td>' +
                                    '<td colspan="2" style="text-align:center;">' +
                                        '<button class="stl-proxy-action-btn" onclick="stl_applyCustomUrl()">' +
                                            '<i class="bi bi-check-lg"></i> 应用' +
                                        '</button>' +
                                    '</td>' +
                                '</tr>' +
                            '</tfoot>' +
                        '</table>' +
                    '</div>' +
                    '<div class="stl-form-help">点击行或选择按钮切换节点，当前选中行高亮显示</div>' +
                '</div>' +
            '</div>' +

            // 网络代理
            '<div class="stl-card">' +
                '<div class="stl-group-title"><i class="bi bi-globe"></i> 网络代理</div>' +

                '<div class="stl-form-group">' +
                    '<label class="stl-form-label">代理模式</label>' +
                    '<select class="stl-form-select" id="setting-proxy-mode" onchange="stl_onProxyModeChange()">' +
                        '<option value="none">不使用代理</option>' +
                        '<option value="system">跟随系统</option>' +
                        '<option value="custom">自定义代理</option>' +
                    '</select>' +
                '</div>' +

                '<div class="stl-form-group" id="proxy-system-info" style="display: none;">' +
                    '<div class="stl-form-help" id="proxy-system-status" style="margin-bottom:6px;">-</div>' +
                '</div>' +

                '<div class="stl-form-group" id="proxy-custom-fields" style="display: none;">' +
                    '<div class="stl-flex" style="gap:10px;">' +
                        '<input type="text" class="stl-form-control" id="setting-proxy-host" placeholder="127.0.0.1">' +
                        '<input type="number" class="stl-form-control" id="setting-proxy-port" placeholder="7890">' +
                    '</div>' +
                    '<div class="stl-flex" style="justify-content:flex-end;margin-top:8px;">' +
                        '<button class="btn btn-bt btn-bt-sm" onclick="stl_saveProxyConfig()">' +
                            '<i class="bi bi-check-lg"></i> 保存代理' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            // 环境检测
            '<div class="stl-card">' +
                '<div class="stl-group-title"><i class="bi bi-check-circle"></i> 环境检测</div>' +

                '<div class="stl-form-group">' +
                    '<div class="stl-info-item">' +
                        '<span class="stl-info-label"><i class="bi bi-terminal"></i> Node.js</span>' +
                        '<span class="stl-info-value" id="check-node">-</span>' +
                    '</div>' +
                    '<div class="stl-flex" style="gap:8px;margin-top:8px;">' +
                        '<button class="btn btn-bt-outline btn-bt-sm" onclick="checkNode(true)">检测</button>' +
                        '<button class="btn btn-bt btn-bt-sm" id="btn-install-nodejs" onclick="installNodeJs()" style="display:none;">一键安装</button>' +
                    '</div>' +
                '</div>' +

                '<div class="stl-form-group">' +
                    '<div class="stl-info-item">' +
                        '<span class="stl-info-label"><i class="bi bi-git"></i> Git</span>' +
                        '<span class="stl-info-value" id="check-git">-</span>' +
                    '</div>' +
                    '<div class="stl-flex" style="gap:8px;margin-top:8px;">' +
                        '<button class="btn btn-bt-outline btn-bt-sm" onclick="checkGit(true)">检测</button>' +
                        '<button class="btn btn-bt btn-bt-sm" id="btn-install-git" onclick="installGit()" style="display:none;">一键安装</button>' +
                    '</div>' +
                '</div>' +

                '<div class="stl-form-group">' +
                    '<div class="stl-info-item">' +
                        '<span class="stl-info-label"><i class="bi bi-github"></i> GitHub 连通性</span>' +
                    '</div>' +
                    '<div class="stl-flex" style="gap:8px;margin-top:8px;">' +
                        '<button class="btn btn-bt-outline btn-bt-sm" onclick="stl_testGithubDirect()" title="直连 GitHub（不使用加速）">' +
                            '<i class="bi bi-globe"></i> 直连测试' +
                        '</button>' +
                        '<button class="btn btn-bt btn-bt-sm" onclick="stl_testGithubProxy()" title="通过加速地址测试 GitHub">' +
                            '<i class="bi bi-lightning-charge"></i> 加速测试' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +


        '</div>';

    $('.plugin_body').html(html);

    // 加载设置
    loadSettings();

    // 环境检测：先从缓存渲染，再自动后台检测
    stl_renderNodeStatus(CacheUtil.localGet('ENV_CHECK_NODE', null));
    stl_renderGitStatus(CacheUtil.localGet('ENV_CHECK_GIT', null));
    checkNode(false);
    checkGit(false);

    // 加载 GitHub 加速列表
    stl_loadGhProxyList();
}

// ════════════════════════════════════════════════════════
//  GitHub 加速相关函数
// ════════════════════════════════════════════════════════

/**
 * 打开 TCPing 日志弹窗
 * 返回 layer 弹窗索引
 */
function stl_openTcpingDialog(title) {
    var dialogHtml =
        '<div id="stl-tcping-dialog" style="padding:10px;">' +
            '<pre id="stl-tcping-log" style="' +
                'background:#1e1e1e;color:#d4d4d4;font-family:Consolas,Monaco,monospace;font-size:13px;' +
                'border-radius:6px;padding:12px;margin:0;height:420px;overflow-y:auto;' +
                'white-space:pre-wrap;word-break:break-all;line-height:1.6;">' +
            '</pre>' +
        '</div>';

    return layer.open({
        type: 1,
        title: title || 'TCPing 测速',
        area: ['680px', '520px'],
        content: dialogHtml,
        shadeClose: false,
        closeBtn: 1,
        btn: ['停止测试'],
        yes: function(index) {
            // 点击停止测试按钮
            GithubProxy.stopTest();
            stl_appendTcpingLog('\n--- 用户手动停止测试 ---');
            setTimeout(function() {
                layer.close(index);
            }, 500);
        }
    });
}

/**
 * 向 TCPing 弹窗追加一行日志
 */
function stl_appendTcpingLog(text) {
    var $log = $('#stl-tcping-log');
    if (!$log.length) return;

    // 简单着色
    var colored = text;
    if (text.indexOf('超时') !== -1 || text.indexOf('不可达') !== -1) {
        colored = '<span style="color:#f44747;">' + text + '</span>';
    } else if (text.indexOf('ms') !== -1) {
        // 提取延迟数值
        var msMatch = text.match(/(\d+)ms/);
        if (msMatch) {
            var ms = parseInt(msMatch[1], 10);
            var color = ms < 100 ? '#4ec9b0' : (ms < 300 ? '#dcdcaa' : '#ce9178');
            colored = '<span style="color:' + color + ';">' + text + '</span>';
        }
    } else if (text.indexOf('测试完成') !== -1 || text.indexOf('---') !== -1) {
        colored = '<span style="color:#569cd6;">' + text + '</span>';
    }

    $log.append(colored + '\n');
    // 自动滚到底部
    $log.scrollTop($log[0].scrollHeight);
}

/**
 * 加载 GitHub 加速配置和节点列表
 */
function stl_loadGhProxyList() {
    GithubProxy.getConfig(function (config) {
        $('#setting-ghproxy-enable').prop('checked', config.enabled);
        _stl_currentProxyUrl = GithubProxy.normalizeUrl(config.url);

        GithubProxy.getProxyList(function (list) {
            stl_renderProxyTable(list, _stl_currentProxyUrl);
        });
    });
}

/**
 * 当前选中的加速地址（内部状态）
 */
var _stl_currentProxyUrl = '';

/**
 * 获取延迟的 CSS class
 */
function stl_getLatencyClass(ms) {
    if (ms == null || ms === undefined) return 'stl-proxy-latency-none';
    if (ms >= GithubProxy.LATENCY_FAIL) return 'stl-proxy-latency-fail';
    if (ms < 100) return 'stl-proxy-latency-good';
    if (ms < 300) return 'stl-proxy-latency-medium';
    return 'stl-proxy-latency-slow';
}

/**
 * 获取延迟显示文本
 */
function stl_getLatencyText(ms) {
    if (ms == null || ms === undefined) return '未测试';
    if (ms >= GithubProxy.LATENCY_FAIL) return '不可达';
    return ms + 'ms';
}

/**
 * 渲染加速节点表格
 * @param {Array} list - 节点列表 [{ url, latency?, tag? }]
 * @param {String} currentUrl - 当前选中的 URL
 */
function stl_renderProxyTable(list, currentUrl) {
    var $tbody = $('#setting-ghproxy-tbody');
    $tbody.empty();

    if (!list || list.length === 0) {
        $tbody.append('<tr><td colspan="3" style="text-align:center;color:#999;padding:30px;">没有可用节点</td></tr>');
        return;
    }

    _stl_currentProxyUrl = GithubProxy.normalizeUrl(currentUrl || '');

    list.forEach(function (item) {
        var itemUrl = GithubProxy.normalizeUrl(item.url);
        var isSelected = itemUrl === _stl_currentProxyUrl;
        var latencyText = stl_getLatencyText(item.latency);
        var latencyClass = stl_getLatencyClass(item.latency);

        var rowHtml =
            '<tr class="' + (isSelected ? 'stl-proxy-selected' : '') + '" data-url="' + itemUrl + '" onclick="stl_selectProxyRow(this)">' +
                '<td class="stl-proxy-url">' +
                    (item.tag ? '<span style="color:#999;font-size:11px;margin-right:6px;">[' + item.tag + ']</span>' : '') +
                    itemUrl +
                '</td>' +
                '<td style="text-align:center;">' +
                    '<span class="stl-proxy-latency ' + latencyClass + '" data-url="' + itemUrl + '">' + latencyText + '</span>' +
                '</td>' +
                '<td style="text-align:center;">' +
                    '<button class="stl-proxy-action-btn ' + (isSelected ? 'stl-proxy-btn-active' : '') + '" ' +
                        'onclick="event.stopPropagation(); stl_selectProxy(\'' + itemUrl.replace(/'/g, "\\'") + '\')">' +
                    (isSelected ? '<i class="bi bi-check-lg"></i> 已选择' : '<i class="bi bi-check2"></i> 选择') +
                '</button>' +
                '</td>' +
            '</tr>';

        $tbody.append(rowHtml);
    });
}

/**
 * 点击表格行选择节点
 */
function stl_selectProxyRow(tr) {
    var url = $(tr).data('url');
    if (url) stl_selectProxy(url);
}

/**
 * 选择指定 URL 的加速节点
 */
function stl_selectProxy(url) {
    url = GithubProxy.normalizeUrl(url);
    _stl_currentProxyUrl = url;
    $('#setting-ghproxy-url').val('');

    // 更新表格行高亮和按钮状态
    var $tbody = $('#setting-ghproxy-tbody');
    $tbody.find('tr').removeClass('stl-proxy-selected');
    $tbody.find('.stl-proxy-action-btn').removeClass('stl-proxy-btn-active').html('<i class="bi bi-check2"></i> 选择');

    var $row = $tbody.find('tr[data-url="' + url + '"]');
    if ($row.length) {
        $row.addClass('stl-proxy-selected');
        $row.find('.stl-proxy-action-btn').addClass('stl-proxy-btn-active').html('<i class="bi bi-check-lg"></i> 已选择');
    }

    stl_saveGhProxy(url);
}

/**
 * 自定义地址输入框失焦（不自动应用，只做提示）
 */
function stl_onCustomUrlBlur() {
    // 不再自动切换到自定义，等用户点"应用"
}

/**
 * 应用自定义地址
 */
function stl_applyCustomUrl() {
    var url = $('#setting-ghproxy-url').val().trim();
    if (!url) {
        layer.msg('请输入加速地址', { icon: 0 });
        return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        layer.msg('地址必须以 http:// 或 https:// 开头', { icon: 0 });
        return;
    }

    url = GithubProxy.normalizeUrl(url);

    // 如果 URL 不在表格中，添加一行
    var $exists = $('#setting-ghproxy-tbody tr[data-url="' + url + '"]');
    if (!$exists.length) {
        var $tbody = $('#setting-ghproxy-tbody');
        $tbody.find('tr').removeClass('stl-proxy-selected');
        $tbody.find('.stl-proxy-action-btn').removeClass('stl-proxy-btn-active').html('<i class="bi bi-check2"></i> 选择');

        var rowHtml =
            '<tr class="stl-proxy-selected" data-url="' + url + '" onclick="stl_selectProxyRow(this)">' +
                '<td class="stl-proxy-url">' + url + '</td>' +
                '<td style="text-align:center;">' +
                    '<span class="stl-proxy-latency stl-proxy-latency-none" data-url="' + url + '">未测试</span>' +
                '</td>' +
                '<td style="text-align:center;">' +
                    '<button class="stl-proxy-action-btn stl-proxy-btn-active" ' +
                        'onclick="event.stopPropagation(); stl_selectProxy(\'' + url.replace(/'/g, "\\'") + '\')">' +
                    '<i class="bi bi-check-lg"></i> 已选择' +
                '</button>' +
                '</td>' +
            '</tr>';
        $tbody.prepend(rowHtml);
    } else {
        stl_selectProxy(url);
        return; // stl_selectProxy 已调 save
    }

    _stl_currentProxyUrl = url;
    stl_saveGhProxy(url);
}

/**
 * 保存 GitHub 代理配置
 */
function stl_saveGhProxy(overrideUrl) {
    var enabled = $('#setting-ghproxy-enable').prop('checked');
    var url = overrideUrl || _stl_currentProxyUrl;

    if (!url) {
        url = $('#setting-ghproxy-url').val().trim();
    }

    if (!url) {
        url = GithubProxy.DEFAULT_URL;
    }

    GithubProxy.saveConfig(enabled, url, function (rdata) {
        if (rdata.status) {
            layer.msg('加速配置已保存', { icon: 1 });
        } else {
            layer.msg(rdata.msg || '保存失败', { icon: 2 });
        }
    });
}

/**
 * 刷新加速列表
 */
function stl_refreshProxies() {
    GithubProxy.clearCache(); // 清列表缓存，触发重新从 API 获取
    var $tbody = $('#setting-ghproxy-tbody');
    $tbody.empty().append('<tr><td colspan="3" style="text-align:center;color:#999;padding:30px;">加载中...</td></tr>');

    GithubProxy.getProxyList(function (list) {
        stl_renderProxyTable(list, _stl_currentProxyUrl);
        layer.msg('列表已刷新（' + list.length + ' 个节点）', { icon: 1 });
    });
}

/**
 * 刷新节点列表并选中指定 URL（用于一键选择最佳节点后）
 */
function stl_refreshProxiesWithUrl(targetUrl) {
    GithubProxy.clearCache(); // 清列表缓存，触发重新从 API 获取
    var $tbody = $('#setting-ghproxy-tbody');
    $tbody.empty().append('<tr><td colspan="3" style="text-align:center;color:#999;padding:30px;">加载中...</td></tr>');

    GithubProxy.getProxyList(function (list) {
        stl_renderProxyTable(list, targetUrl);
    });
}

/**
 * 更新表格中指定 URL 的延迟显示（URL 做 normalize 保证匹配）
 */
function stl_updateProxyLatency(url, latency) {
    url = GithubProxy.normalizeUrl(url);
    var $badge = $('#setting-ghproxy-tbody .stl-proxy-latency[data-url="' + url + '"]');
    if ($badge.length) {
        var cls = stl_getLatencyClass(latency);
        var txt = stl_getLatencyText(latency);
        $badge.attr('class', 'stl-proxy-latency ' + cls).text(txt);
    }
}

/**
 * 测试全部节点延迟（弹窗模式）
 */
function stl_testAllProxies() {
    // 不再清除缓存，直接使用当前列表进行测速
    var dialogIndex = stl_openTcpingDialog('TCPing 测速');

    GithubProxy.getProxyList(function (list) {
        if (list.length === 0) {
            stl_appendTcpingLog('没有可测试的节点');
            return;
        }

        stl_appendTcpingLog('共 ' + list.length + ' 个节点，开始 TCPing...\n');

        GithubProxy.testAllLatency(
            function (finalList) {
                // 全部完成，3 秒后自动关闭弹窗
                setTimeout(function () {
                    layer.close(dialogIndex);
                }, 3000);

                // 重新渲染表格（按延迟排序），保持当前选中
                stl_renderProxyTable(finalList, _stl_currentProxyUrl);
            },
            function (result, index, total) {
                // 单个完成回调：实时更新表格中对应节点的延迟
                stl_updateProxyLatency(result.url, result.latency);
            },
            function (logText) {
                // 每行日志追加到弹窗
                stl_appendTcpingLog(logText);
            }
        );
    });
}

/**
 * 一键选择最佳节点（弹窗模式）
 */
function stl_autoBestProxy() {
    layer.confirm('将 TCPing 测试所有节点并自动选择延迟最低的，确认？', {
        btn: ['确认', '取消']
    }, function (index) {
        layer.close(index);

        // 不再清除缓存，直接使用当前列表进行测速
        var dialogIndex = stl_openTcpingDialog('一键选择最佳节点');

        GithubProxy.autoSelectBest(
            function (result) {
                setTimeout(function () {
                    layer.close(dialogIndex);
                }, 2000);

                if (result.status) {
                    layer.msg(result.msg, { icon: 1 });
                    $('#setting-ghproxy-enable').prop('checked', true);
                    // 直接用测速后的完整列表渲染，不再重新请求 API
                    if (result.list) {
                        _stl_currentProxyUrl = GithubProxy.normalizeUrl(result.url);
                        stl_renderProxyTable(result.list, _stl_currentProxyUrl);
                    }
                } else {
                    layer.msg(result.msg, { icon: 2 });
                    // 即使失败也用已有数据渲染
                    if (result.list) {
                        stl_renderProxyTable(result.list, _stl_currentProxyUrl);
                    }
                }
            },
            function (logText) {
                stl_appendTcpingLog(logText);
            },
            function (result, index, total) {
                // 实时更新表格延迟
                stl_updateProxyLatency(result.url, result.latency);
            }
        );
    });
}

/**
 * 打开 GitHub 连通性测试弹窗
 * @param {string} title - 弹窗标题
 * @returns {number} layer 弹窗索引
 */
function stl_openGithubTestDialog(title) {
    var html =
        '<div id="stl-github-test-dialog" style="padding:15px;">' +
            '<div class="stl-github-test-list" id="stl-github-test-list">' +
                '<div class="stl-github-test-item stl-github-test-pending" data-key="raw">' +
                    '<div class="stl-github-test-info">' +
                        '<span class="stl-github-test-name">文件访问</span>' +
                        '<span class="stl-github-test-url">raw.githubusercontent.com</span>' +
                    '</div>' +
                    '<div class="stl-github-test-status" id="stl-test-status-raw">' +
                        '<span class="stl-github-test-wait">等待中</span>' +
                    '</div>' +
                '</div>' +
                '<div class="stl-github-test-item stl-github-test-pending" data-key="homepage">' +
                    '<div class="stl-github-test-info">' +
                        '<span class="stl-github-test-name">首页访问</span>' +
                        '<span class="stl-github-test-url">github.com</span>' +
                    '</div>' +
                    '<div class="stl-github-test-status" id="stl-test-status-homepage">' +
                        '<span class="stl-github-test-wait">等待中</span>' +
                    '</div>' +
                '</div>' +
                '<div class="stl-github-test-item stl-github-test-pending" data-key="repo">' +
                    '<div class="stl-github-test-info">' +
                        '<span class="stl-github-test-name">仓库访问</span>' +
                        '<span class="stl-github-test-url">git ls-remote</span>' +
                    '</div>' +
                    '<div class="stl-github-test-status" id="stl-test-status-repo">' +
                        '<span class="stl-github-test-wait">等待中</span>' +
                    '</div>' +
                '</div>' +
                '<div class="stl-github-test-item stl-github-test-pending" data-key="api">' +
                    '<div class="stl-github-test-info">' +
                        '<span class="stl-github-test-name">API 访问</span>' +
                        '<span class="stl-github-test-url">api.github.com</span>' +
                    '</div>' +
                    '<div class="stl-github-test-status" id="stl-test-status-api">' +
                        '<span class="stl-github-test-wait">等待中</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="stl-github-test-summary" id="stl-github-test-summary" style="display:none;"></div>' +
        '</div>';

    return layer.open({
        type: 1,
        title: title || 'GitHub 连通性测试',
        area: ['520px', 'auto'],
        content: html,
        shadeClose: false,
        closeBtn: 1
    });
}

/**
 * 更新弹窗中某个测试项的状态
 * @param {string} key - 测试项 key (raw/homepage/repo/api)
 * @param {string} state - 状态: 'testing' | 'success' | 'fail'
 * @param {object} data - { latency?, error? }
 */
function stl_updateGithubTestItem(key, state, data) {
    // 使用弹窗内的 context 查找，避免和其他页面元素冲突
    var $dialog = $('#stl-github-test-dialog');
    var $item = $dialog.find('[data-key="' + key + '"]');
    var $status = $dialog.find('#stl-test-status-' + key);

    if (!$item.length) return;

    // 移除旧状态 class
    $item.removeClass('stl-github-test-pending stl-github-test-testing stl-github-test-success stl-github-test-warn stl-github-test-fail');

    if (state === 'testing') {
        $item.addClass('stl-github-test-testing');
        $status.html('<span class="stl-github-test-loading"><i class="bi bi-arrow-repeat" style="animation:stl-spin 1s linear infinite;"></i> 测试中...</span>');
    } else if (state === 'warn') {
        // 加速地址可用但该资源无法加速（403/404 等），黄色警告态
        $item.addClass('stl-github-test-warn');
        var warnHtml = '<span class="stl-github-test-latency-warn">';
        warnHtml += '<i class="bi bi-exclamation-triangle-fill" style="font-size:11px;"></i> ';
        if (data.latency) {
            warnHtml += data.latency + 'ms';
        } else {
            warnHtml += '可用';
        }
        warnHtml += '</span>';
        // warning 详细文字
        var warningText = data.warning || data.error || '';
        if (warningText) {
            warnHtml += ' <span class="stl-github-test-warning">' + warningText + '</span>';
        }
        $status.html(warnHtml);
    } else if (state === 'success') {
        $item.addClass('stl-github-test-success');
        var latencyHtml = '';
        if (data.latency) {
            latencyHtml = '<span class="stl-github-test-latency-good">' + data.latency + 'ms</span>';
        }
        $status.html(latencyHtml || '<span class="stl-github-test-latency-good"><i class="bi bi-check-circle-fill" style="font-size:12px;"></i> 成功</span>');
    } else if (state === 'fail') {
        $item.addClass('stl-github-test-fail');
        var errorHtml = '<span class="stl-github-test-error">失败</span>';
        if (data.error) {
            errorHtml += ' <span class="stl-github-test-error-msg">' + data.error + '</span>';
        }
        $status.html(errorHtml);
    }
}

/**
 * 显示测试汇总
 */
function stl_showGithubTestSummary(results) {
    var successCount = 0;  // 完全成功（无 warning）
    var warnCount = 0;     // 部分成功（有 warning）
    results.forEach(function (r) {
        if (r.success && r.warning) {
            warnCount++;
        } else if (r.success) {
            successCount++;
        }
    });
    var passCount = successCount + warnCount; // 总通过数（含部分成功）

    var $summary = $('#stl-github-test-summary');
    var totalCount = results.length;
    var allGood = (successCount === totalCount);
    var nonePass = (passCount === 0);

    var icon, msg;
    if (allGood) {
        icon = '<i class="bi bi-check-circle" style="color:#20a53a;"></i>';
        msg = '全部通过 (' + totalCount + '/' + totalCount + ')';
    } else if (nonePass) {
        icon = '<i class="bi bi-x-circle" style="color:#d9534f;"></i>';
        msg = '全部失败 (0/' + totalCount + ')，请检查网络环境';
    } else {
        // 有成功和/或有警告
        icon = '<i class="bi bi-exclamation-triangle" style="color:#faad14;"></i>';
        if (warnCount > 0 && successCount === 0) {
            // 全是警告：加速地址可达但所有目标资源都无法加速
            msg = '地址可达但资源受限 (' + passCount + '/' + totalCount + ')，建议更换节点';
        } else if (warnCount > 0) {
            msg = '部分通过 (' + passCount + '/' + totalCount + ')，其中 ' + warnCount + ' 项资源受限';
        } else {
            msg = '部分通过 (' + passCount + '/' + totalCount + ')，请检查失败项';
        }
    }

    $summary.html(icon + ' ' + msg).show();
}

/**
 * 重置弹窗中所有测试项为"等待中"状态
 */
function stl_resetGithubTestDialog() {
    var keys = ['raw', 'homepage', 'repo', 'api'];
    keys.forEach(function (key) {
        var $item = $('[data-key="' + key + '"]');
        var $status = $('#stl-test-status-' + key);
        $item.removeClass('stl-github-test-testing stl-github-test-success stl-github-test-warn stl-github-test-fail').addClass('stl-github-test-pending');
        $status.html('<span class="stl-github-test-wait">等待中</span>');
    });
    $('#stl-github-test-summary').hide();
}

/**
 * 通用 GitHub 连通性测试执行逻辑
 * @param {object} params - 传给后端的参数
 * @param {number} dialogIndex - layer 弹窗索引
 */
function stl_runGithubTest(params, dialogIndex) {
    var keys = ['raw', 'homepage', 'repo', 'api'];

    request_plugin('test_github_connectivity', params, function (rdata) {
        if (!rdata || !rdata.status) {
            keys.forEach(function (key) {
                stl_updateGithubTestItem(key, 'fail', { error: rdata ? rdata.msg : '\u8bf7\u6c42\u5931\u8d25' });
            });
            stl_showGithubTestSummary([]);
            return;
        }

        var results = rdata.results || [];

        // 构建结果 map，方便查找
        var resultMap = {};
        results.forEach(function (item) {
            resultMap[item.key] = item;
        });

        // 逐个更新（300ms 间隔，让用户看到逐项出结果）
        keys.forEach(function (key, idx) {
            setTimeout(function () {
                var item = resultMap[key];
                if (!item) {
                    // 后端未返回该项（线程超时），标记为失败
                    stl_updateGithubTestItem(key, 'fail', { error: '\u6d4b\u8bd5\u8d85\u65f6' });
                } else if (item.success && item.warning) {
                    // 加速地址可用但该资源无法加速（403/404 等），黄色警告态
                    stl_updateGithubTestItem(key, 'warn', {
                        latency: item.latency,
                        warning: item.warning,
                        error: item.error
                    });
                } else if (item.success) {
                    stl_updateGithubTestItem(key, 'success', {
                        latency: item.latency,
                        warning: item.warning,
                        error: item.error
                    });
                } else {
                    stl_updateGithubTestItem(key, 'fail', { error: item.error });
                }

                // 最后一个结果出来后，再延迟 300ms 显示汇总（确保状态渲染完）
                if (idx === keys.length - 1) {
                    setTimeout(function () {
                        stl_showGithubTestSummary(results);
                    }, 300);
                }
            }, idx * 300);
        });
    });
}

/**
 * GitHub 直连测试（不使用加速）
 */
function stl_testGithubDirect() {
    var dialogIndex = stl_openGithubTestDialog('GitHub \u76f4\u8fde\u6d4b\u8bd5');

    stl_resetGithubTestDialog();

    var keys = ['raw', 'homepage', 'repo', 'api'];
    keys.forEach(function (key) {
        stl_updateGithubTestItem(key, 'testing', null);
    });

    stl_runGithubTest({
        use_proxy: '0'
    }, dialogIndex);
}

/**
 * GitHub 加速测试（使用当前选中的加速地址）
 */
function stl_testGithubProxy() {
    var proxyUrl = _stl_currentProxyUrl || GithubProxy.DEFAULT_URL;
    var shortUrl = proxyUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    var dialogIndex = stl_openGithubTestDialog('GitHub \u52a0\u901f\u6d4b\u8bd5 (' + shortUrl + ')');

    stl_resetGithubTestDialog();

    var keys = ['raw', 'homepage', 'repo', 'api'];
    keys.forEach(function (key) {
        stl_updateGithubTestItem(key, 'testing', null);
    });

    stl_runGithubTest({
        use_proxy: '1',
        proxy_url: proxyUrl
    }, dialogIndex);
}

// ════════════════════════════════════════════════════════
//  通用设置
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
//  网络代理设置
// ════════════════════════════════════════════════════════

/**
 * 从后端加载代理配置并渲染 UI
 */
function loadProxySettings() {
    request_plugin('get_proxy_config', {}, function (rdata) {
        if (!rdata || !rdata.status) return;

        var mode = rdata.mode || 'none';
        $('#setting-proxy-mode').val(mode);

        // 自定义代理：回填 host/port
        $('#setting-proxy-host').val(rdata.host || '');
        $('#setting-proxy-port').val(rdata.port || '');

        // 根据模式显示对应区域
        stl_toggleProxyFields(mode);

        // 跟随系统：显示系统代理信息
        if (mode === 'system') {
            stl_renderSystemProxyInfo(rdata.system_proxy);
        }

        // 数据设置复选框
        var keepFlag = (typeof rdata.keep_data === 'boolean') ? rdata.keep_data : true;
        $('#setting-keep-data').prop('checked', keepFlag);

    });
}


/**
 * 代理模式切换时的 UI 响应
 */
function stl_onProxyModeChange() {
    var mode = $('#setting-proxy-mode').val();
    stl_toggleProxyFields(mode);

    stl_saveProxyMode(mode, function (rdata) {
        if (!rdata || !rdata.status) {
            layer.msg(rdata && rdata.msg || '保存失败', { icon: 2 });
            return;
        }

        if (rdata.mode === 'system') {
            stl_renderSystemProxyInfo(rdata.system_proxy);
        } else if (mode === 'system' && rdata.mode !== 'system') {
            // 用户选择系统，但后端无法获取 → 回退并提示
            $('#setting-proxy-mode').val(rdata.mode || 'none');
            stl_toggleProxyFields(rdata.mode || 'none');
            layer.msg(rdata.msg || '未检测到系统代理环境变量，已切换为不使用代理', { icon: 0 });
        }
    });
}

/**
 * 根据模式切换显示区域
 */
function stl_toggleProxyFields(mode) {
    $('#proxy-custom-fields').toggle(mode === 'custom');
    $('#proxy-system-info').toggle(mode === 'system');
}

/**
 * 渲染系统代理环境变量信息
 */
function stl_renderSystemProxyInfo(sysProxy) {
    var $el = $('#proxy-system-status');
    if (!sysProxy) {
        $el.html('<span style="color:#faad14;"><i class="bi bi-exclamation-triangle"></i> 未检测到系统代理环境变量（http_proxy/https_proxy/all_proxy），建议使用自定义代理。</span>');
        return;
    }
    var parts = [];
    if (sysProxy.http_proxy) parts.push('<code>http_proxy=' + sysProxy.http_proxy + '</code>');
    if (sysProxy.https_proxy) parts.push('<code>https_proxy=' + sysProxy.https_proxy + '</code>');
    if (sysProxy.all_proxy) parts.push('<code>all_proxy=' + sysProxy.all_proxy + '</code>');
    $el.html('<span style="color:#20a53a;"><i class="bi bi-check-circle"></i> 已检测到系统代理：</span><br>' + parts.join('<br>'));
}

/**
 * 仅保存代理模式（none/system/custom）
 */
function stl_saveProxyMode(mode, callback) {
    request_plugin('save_proxy_config', { mode: mode }, function (rdata) {
        if (rdata && rdata.mode === 'system') {
            stl_renderSystemProxyInfo(rdata.system_proxy);
        }
        if (callback) callback(rdata);
    });
}

/**
 * 保留数据复选框变更
 */
function stl_onKeepDataChange() {
    var keep = $('#setting-keep-data').is(':checked');
    request_plugin('save_proxy_config', { keep_data: keep }, function (rdata) {
        if (!rdata || !rdata.status) {
            layer.msg(rdata && rdata.msg || '保存失败', { icon: 2 });
            $('#setting-keep-data').prop('checked', !keep);
            return;
        }
        $('#setting-keep-data').prop('checked', rdata.keep_data !== false);
    });
}


/**
 * 保存自定义代理配置
 */
function stl_saveProxyConfig() {
    var host = ($('#setting-proxy-host').val() || '').trim();
    var port = ($('#setting-proxy-port').val() || '').trim();

    if (!host || !port) {
        layer.msg('请填写代理地址和端口', { icon: 0 });
        return;
    }

    request_plugin('save_proxy_config', {
        mode: 'custom',
        host: host,
        port: port
    }, function (rdata) {
        if (rdata && rdata.status) {
            $('#setting-proxy-host').val(rdata.host || '127.0.0.1');
            $('#setting-proxy-port').val(rdata.port || '7890');
            $('#setting-keep-data').prop('checked', rdata.keep_data !== false);
            layer.msg('代理配置已保存', { icon: 1 });
        } else {
            layer.msg(rdata && rdata.msg || '保存失败', { icon: 2 });
        }
    });
}


function loadSettings() {
    // 从后端加载代理配置 & 数据设置
    loadProxySettings();
}


function saveSettings() {
    // 代理设置现在通过 stl_saveProxyConfig 独立保存
    layer.msg('设置已保存', { icon: 1 });
}

/**
 * 渲染 Node.js 检测状态到 DOM
 * @param {object|null} data - { installed: bool, version: string } 或 null（未检测/未知）
 */
function stl_renderNodeStatus(data) {
    var $el = $('#check-node');
    var $btnInstall = $('#btn-install-nodejs');
    if (!$el.length) return;
    if (data && data.installed) {
        $el.html('<span style="color: #20a53a;">' + (data.version || '') + ' 已安装</span>');
        if ($btnInstall.length) {
            $btnInstall.hide();
        }
    } else if (data && data.installed === false) {
        $el.html('<span style="color: #d9534f;">未安装</span>');
        if ($btnInstall.length) {
            $btnInstall.show();
        }
    } else {
        $el.html('-');
        if ($btnInstall.length) {
            $btnInstall.hide();
        }
    }
}

function checkNode(showMsg) {
    $('#check-node').html('<span class="stl-loading"></span> 检测中...');

    request_plugin('get_nodejs_version', {}, function (rdata) {
        var result = {
            installed: !!(rdata && rdata.status),
            version: (rdata && rdata.version) || ''
        };
        // 写缓存
        CacheUtil.localSet('ENV_CHECK_NODE', result);
        // 更新 DOM
        stl_renderNodeStatus(result);
        if (showMsg !== false) {
            layer.msg(result.installed ? 'Node.js 已安装' : 'Node.js 未安装', { icon: result.installed ? 1 : 2 });
        }
    });
}

/**
 * 渲染 Git 检测状态到 DOM
 * @param {object|null} data - { installed: bool, version: string } 或 null
 */
function stl_renderGitStatus(data) {
    var $el = $('#check-git');
    var $btnInstall = $('#btn-install-git');
    if (!$el.length) return;
    if (data && data.installed) {
        $el.html('<span style="color: #20a53a;">' + (data.version || '') + ' 已安装</span>');
        if ($btnInstall.length) {
            $btnInstall.hide();
        }
    } else if (data && data.installed === false) {
        $el.html('<span style="color: #d9534f;">未安装</span>');
        if ($btnInstall.length) {
            $btnInstall.show();
        }
    } else {
        $el.html('-');
        if ($btnInstall.length) {
            $btnInstall.hide();
        }
    }
}

function checkGit(showMsg) {
    $('#check-git').html('<span class="stl-loading"></span> 检测中...');

    request_plugin('is_git_installed', {}, function (rdata) {
        var result = {
            installed: !!(rdata && rdata.installed),
            version: (rdata && rdata.version) || ''
        };
        // 写缓存
        CacheUtil.localSet('ENV_CHECK_GIT', result);
        // 更新 DOM
        stl_renderGitStatus(result);
        if (showMsg !== false) {
            layer.msg(result.installed ? 'Git 已安装' : 'Git 未安装', { icon: result.installed ? 1 : 2 });
        }
    });
}

/**
 * 一键安装 Node.js（使用 autoSetupNodejsPluginAndPM2AndSetDefault）
 */
function installNodeJs() {
    layer.confirm('将自动安装 Node.js 版本管理器插件、合适的 Node.js 版本和 PM2，确认？', {
        btn: ['确认', '取消']
    }, function(index) {
        layer.close(index);
        
        // 显示进度弹窗
        var logContent = '<div id="nodejs-install-log" style="height: 300px; overflow-y: auto; background: #1e1e1e; color: #ccc; padding: 15px; font-family: Consolas, monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all;">[系统] 正在准备安装环境...</div>';
        
        var dialogIndex = layer.open({
            type: 1,
            title: 'Node.js 安装进度',
            area: ['600px', '400px'],
            content: '<div style="padding: 15px;">' + logContent + '</div>',
            closeBtn: 1,
            shadeClose: false,
            btn: ['后台运行'],
            yes: function(idx) {
                layer.close(idx);
            }
        });
        
        // 定义日志追加函数
        var lastLength = 0;
        window.appendNodeJsLog = function(text) {
            var $logDiv = $('#nodejs-install-log');
            if ($logDiv.length) {
                $logDiv.text($logDiv.text() + text + '\n');
                $logDiv.scrollTop($logDiv[0].scrollHeight);
                lastLength = $logDiv.text().length;
            }
        };
        
        // 调用一键安装函数
        NodeJs.autoSetupNodejsPluginAndPM2AndSetDefault(
            function(rdata) {
                // 安装完成回调
                if (rdata.status) {
                    window.appendNodeJsLog('[SUCCESS] ' + rdata.msg);
                    setTimeout(function() {
                        layer.close(dialogIndex);
                        layer.msg('Node.js 安装成功！', { icon: 1 });
                        // 重新检测 Node.js 状态
                        checkNode(false);
                    }, 1500);
                } else {
                    window.appendNodeJsLog('[ERROR] ' + rdata.msg);
                    setTimeout(function() {
                        layer.close(dialogIndex);
                        layer.msg('Node.js 安装失败: ' + rdata.msg, { icon: 2 });
                    }, 1500);
                }
            },
            function(progress) {
                // 进度回调
                if (progress && progress.msg) {
                    window.appendNodeJsLog('[INFO] ' + progress.msg);
                }
            }
        );
    });
}

/**
 * 一键安装 Git
 */
function installGit() {
    layer.confirm('将自动安装 Git，确认？', {
        btn: ['确认', '取消']
    }, function(index) {
        layer.close(index);
        
        // 显示进度弹窗
        var logContent = '<div id="git-install-log" style="height: 300px; overflow-y: auto; background: #1e1e1e; color: #ccc; padding: 15px; font-family: Consolas, monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all;">[系统] 正在准备安装环境...</div>';
        
        var dialogIndex = layer.open({
            type: 1,
            title: 'Git 安装进度',
            area: ['600px', '400px'],
            content: '<div style="padding: 15px;">' + logContent + '</div>',
            closeBtn: 1,
            shadeClose: false,
            btn: ['后台运行'],
            yes: function(idx) {
                layer.close(idx);
            }
        });
        
        // 定义日志追加函数
        window.appendGitLog = function(text) {
            var $logDiv = $('#git-install-log');
            if ($logDiv.length) {
                $logDiv.text($logDiv.text() + text);
                $logDiv.scrollTop($logDiv[0].scrollHeight);
            }
        };
        
        // 调用 Git 模块的安装方法
        Git.installGit(
            function(rdata) {
                // 安装完成回调
                if (rdata.status) {
                    window.appendGitLog('[SUCCESS] ' + rdata.msg + '\n');
                    setTimeout(function() {
                        layer.close(dialogIndex);
                        layer.msg('Git 安装成功！', { icon: 1 });
                        // 重新检测 Git 状态
                        checkGit(false);
                    }, 1500);
                } else {
                    window.appendGitLog('[ERROR] ' + rdata.msg + '\n');
                    setTimeout(function() {
                        layer.close(dialogIndex);
                        layer.msg('Git 安装失败: ' + rdata.msg, { icon: 2 });
                    }, 1500);
                }
            },
            function(log) {
                // 日志回调
                if (log) {
                    window.appendGitLog(log);
                }
            },
            function(progress) {
                // 进度回调
                if (progress && progress.msg) {
                    window.appendGitLog('[INFO] ' + progress.msg + '\n');
                }
            }
        );
    });
}

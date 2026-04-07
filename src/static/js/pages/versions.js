/**
 * Versions 页面 - 版本管理
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
            
            // 本地版本
            '<div id="local-versions">' +
                '<div class="stl-card">' +
                    '<div class="stl-flex stl-flex-between">' +
                        '<div class="stl-card-title" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">' +
                            '<i class="bi bi-folder"></i> 本地版本' +
                        '</div>' +
                        '<button class="btn btn-bt btn-bt-sm" onclick="BTPlugin.scanVersions()">' +
                            '<i class="bi bi-arrow-clockwise"></i> 扫描本地' +
                        '</button>' +
                    '</div>' +
                    '<div id="local-version-list">' +
                        '<div class="stl-empty">' +
                            '<i class="bi bi-folder2-open"></i>' +
                            '<p>点击"扫描本地"按钮扫描已安装的版本</p>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            // 在线版本
            '<div id="online-versions" style="display: none;">' +
                '<div class="stl-card">' +
                    '<div class="stl-flex stl-flex-between">' +
                        '<div class="stl-card-title" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">' +
                            '<i class="bi bi-cloud-download"></i> 在线版本' +
                        '</div>' +
                        '<button class="btn btn-bt btn-bt-sm" onclick="BTPlugin.fetchOnlineVersions()">' +
                            '<i class="bi bi-arrow-clockwise"></i> 刷新列表' +
                        '</button>' +
                    '</div>' +
                    '<div id="online-version-list">' +
                        '<div class="stl-empty">' +
                            '<i class="bi bi-globe"></i>' +
                            '<p>点击"刷新列表"按钮获取可用版本</p>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    $('.plugin_body').html(html);
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
}

/**
 * 扫描本地版本
 */
function scanVersions() {
    request_plugin('scan_versions', {}, function (rdata) {
        if (rdata.status) {
            renderLocalVersions(rdata.data || []);
        } else {
            layer.msg(rdata.msg || '扫描失败', { icon: 2 });
        }
    });
    
    // 模拟数据（实际使用时删除）
    setTimeout(function() {
        var mockVersions = [
            { version: 'v1.12.5', path: 'D:\\sillytavern\\v1.12.5', current: true },
            { version: 'v1.12.3', path: 'D:\\sillytavern\\v1.12.3', current: false },
            { version: 'v1.11.8', path: 'D:\\sillytavern\\v1.11.8', current: false }
        ];
        renderLocalVersions(mockVersions);
    }, 500);
}

/**
 * 渲染本地版本列表
 */
function renderLocalVersions(versions) {
    if (!versions || versions.length === 0) {
        $('#local-version-list').html(
            '<div class="stl-empty">' +
                '<i class="bi bi-folder2-open"></i>' +
                '<p>未找到已安装的版本</p>' +
            '</div>'
        );
        return;
    }
    
    var html = '';
    versions.forEach(function(v) {
        var currentBadge = v.current ? '<span class="stl-version-badge stl-version-badge-current">当前</span>' : '';
        html += 
            '<div class="stl-version-item ' + (v.current ? 'current' : '') + '">' +
                '<div class="stl-version-info">' +
                    '<div class="stl-version-icon"><i class="bi bi-folder"></i></div>' +
                    '<div>' +
                        '<div class="stl-version-name">' + v.version + currentBadge + '</div>' +
                        '<div class="stl-version-path">' + v.path + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="stl-version-actions">' +
                    '<button class="btn btn-bt-outline btn-bt-sm" onclick="BTPlugin.switchVersion(\'' + v.path + '\')">切换</button>' +
                    '<button class="btn btn-bt-danger btn-bt-sm" onclick="BTPlugin.removeVersion(\'' + v.path + '\')">删除</button>' +
                '</div>' +
            '</div>';
    });
    
    $('#local-version-list').html(html);
}

/**
 * 获取在线版本列表
 */
function fetchOnlineVersions() {
    request_plugin('fetch_online_versions', {}, function (rdata) {
        if (rdata.status) {
            renderOnlineVersions(rdata.data || []);
        } else {
            layer.msg(rdata.msg || '获取失败', { icon: 2 });
        }
    });
    
    // 模拟数据（实际使用时删除）
    setTimeout(function() {
        var mockVersions = [
            { version: 'v1.12.5', date: '2024-01-15', size: '45MB' },
            { version: 'v1.12.4', date: '2024-01-10', size: '44MB' },
            { version: 'v1.12.3', date: '2024-01-05', size: '43MB' },
            { version: 'v1.11.8', date: '2023-12-20', size: '42MB' }
        ];
        renderOnlineVersions(mockVersions);
    }, 500);
}

/**
 * 渲染在线版本列表
 */
function renderOnlineVersions(versions) {
    if (!versions || versions.length === 0) {
        $('#online-version-list').html(
            '<div class="stl-empty">' +
                '<i class="bi bi-globe"></i>' +
                '<p>暂无可用版本</p>' +
            '</div>'
        );
        return;
    }
    
    var html = '';
    versions.forEach(function(v) {
        html += 
            '<div class="stl-version-item">' +
                '<div class="stl-version-info">' +
                    '<div class="stl-version-icon"><i class="bi bi-cloud-download"></i></div>' +
                    '<div>' +
                        '<div class="stl-version-name">' + v.version + '</div>' +
                        '<div class="stl-version-path">' + (v.date || '') + ' · ' + (v.size || '') + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="stl-version-actions">' +
                    '<button class="btn btn-bt btn-bt-sm" onclick="BTPlugin.downloadVersion(\'' + v.version + '\')">下载</button>' +
                '</div>' +
            '</div>';
    });
    
    $('#online-version-list').html(html);
}
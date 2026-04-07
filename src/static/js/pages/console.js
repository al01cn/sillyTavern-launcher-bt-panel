/**
 * Console 页面 - 控制台
 */

function renderConsolePage() {
    var html = 
        '<div class="stl-page active" id="page-console">' +
            // 控制台顶部栏
            '<div class="stl-console-header">' +
                '<div class="stl-console-title">' +
                    '<i class="bi bi-terminal"></i>' +
                    '<span>实时日志</span>' +
                '</div>' +
                '<div class="stl-console-actions">' +
                    '<button class="btn btn-bt btn-bt-sm" onclick="BTPlugin.clearLogs()">' +
                        '<i class="bi bi-trash"></i> 清空' +
                    '</button>' +
                    '<button class="btn btn-bt-danger btn-bt-sm" id="console-btn-stop" onclick="BTPlugin.stopService()" style="display:none;">' +
                        '<i class="bi bi-stop-fill"></i> 停止' +
                    '</button>' +
                    '<button class="btn btn-bt btn-bt-sm" id="console-btn-start" onclick="BTPlugin.startService()">' +
                        '<i class="bi bi-play-fill"></i> 启动' +
                    '</button>' +
                '</div>' +
            '</div>' +
            
            // 日志区域
            '<div class="stl-console" id="console-output">' +
                '<div class="log-line">' +
                    '<span class="log-time">' + getCurrentTime() + '</span>' +
                    '<span class="log-type log-type-system">SYSTEM</span>' +
                    '<span class="log-content">等待启动服务...</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    $('.plugin_body').html(html);
}

/**
 * 清空日志
 */
function clearLogs() {
    $('#console-output').html('');
    addLog('SYSTEM', '日志已清空');
}

/**
 * 添加日志行
 */
function addLog(type, content) {
    var time = getCurrentTime();
    var html = 
        '<div class="log-line">' +
            '<span class="log-time">' + time + '</span>' +
            '<span class="log-type log-type-' + type.toLowerCase() + '">' + type + '</span>' +
            '<span class="log-content">' + content + '</span>' +
        '</div>';
    
    $('#console-output').append(html);
    $('#console-output').scrollTop($('#console-output')[0].scrollHeight);
}

/**
 * 获取当前时间
 */
function getCurrentTime() {
    var now = new Date();
    var h = now.getHours().toString().padStart(2, '0');
    var m = now.getMinutes().toString().padStart(2, '0');
    var s = now.getSeconds().toString().padStart(2, '0');
    return h + ':' + m + ':' + s;
}
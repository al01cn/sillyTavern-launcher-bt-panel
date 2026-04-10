/**
 * 对话历史详情弹窗模块
 */

var ChatModal = (function() {
    'use strict';

    var state = {
        loading: false,
        messages: [],
        errorMsg: '',
        charName: '',
        fileName: ''
    };

    // 简单 markdown 渲染
    function renderMes(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/gs, '<em>$1</em>')
            .replace(/\n/g, '<br/>');
    }

    // 解析文件名标题
    function parseFileTitle(name) {
        var stem = name.replace(/\.jsonl$/i, '');
        var m = stem.match(/^(.+?)\s*-\s*(\d{4}-\d{1,2}-\d{1,2})\s*@(\d+)h\s*(\d+)m/);
        if (m) {
            return m[1] + ' · ' + m[2] + ' ' + String(m[3]).padStart(2, '0') + ':' + String(m[4]).padStart(2, '0');
        }
        return stem;
    }

    // 渲染内容
    function renderContent() {
        var html = '<div class="stl-chat-modal">';

        // 头部
        html += '<div class="stl-cm-header">';
        html += '<div class="stl-cm-header-info">';
        html += '<div class="stl-cm-char-name"><i class="bi bi-person"></i> ' + state.charName + '</div>';
        html += '<div class="stl-cm-file-name">' + parseFileTitle(state.fileName) + '</div>';
        html += '</div>';
        html += '<div class="stl-cm-message-count">' + state.messages.length + ' 条消息</div>';
        html += '</div>';

        // 消息列表
        html += '<div class="stl-cm-messages">';

        if (state.messages.length === 0) {
            html += '<div class="stl-cm-empty"><i class="bi bi-chat-dots"></i><p>暂无消息</p></div>';
        } else {
            state.messages.forEach(function(msg, idx) {
                if (msg.isSystem) {
                    // 系统消息
                    html += '<div class="stl-cm-message stl-cm-system">';
                    html += '<div class="stl-cm-system-text" v-html="renderMes(msg.mes)">' + renderMes(msg.mes) + '</div>';
                    html += '</div>';
                } else if (msg.isUser) {
                    // 用户消息
                    html += '<div class="stl-cm-message stl-cm-user">';
                    html += '<div class="stl-cm-avatar stl-cm-user-avatar">' + ((msg.name || 'U')[0] || 'U').toUpperCase() + '</div>';
                    html += '<div class="stl-cm-bubble-wrap">';
                    html += '<div class="stl-cm-sender-name">' + (msg.name || '你') + '</div>';
                    html += '<div class="stl-cm-bubble stl-cm-user-bubble">' + renderMes(msg.mes) + '</div>';
                    if (msg.sendDate) {
                        html += '<div class="stl-cm-timestamp">' + msg.sendDate + '</div>';
                    }
                    html += '</div>';
                    html += '</div>';
                } else {
                    // AI 消息
                    html += '<div class="stl-cm-message stl-cm-ai">';
                    html += '<div class="stl-cm-avatar stl-cm-ai-avatar">' + ((msg.name || state.charName || 'A')[0] || 'A').toUpperCase() + '</div>';
                    html += '<div class="stl-cm-bubble-wrap">';
                    html += '<div class="stl-cm-sender-name">' + (msg.name || state.charName) + '</div>';
                    html += '<div class="stl-cm-bubble stl-cm-ai-bubble">' + renderMes(msg.mes) + '</div>';
                    if (msg.sendDate) {
                        html += '<div class="stl-cm-timestamp">' + msg.sendDate + '</div>';
                    }
                    html += '</div>';
                    html += '</div>';
                }
            });
        }

        html += '</div>';

        // 底部文件名
        html += '<div class="stl-cm-footer">';
        html += '<i class="bi bi-file-earmark-text"></i> ' + state.fileName;
        html += '</div>';

        html += '</div>';

        return html;
    }

    // 打开弹窗
    function open(charFolder, fileName, charName) {
        state.loading = true;
        state.messages = [];
        state.errorMsg = '';
        state.charName = charName || '';
        state.fileName = fileName;

        layer.open({
            type: 1,
            title: '<i class="bi bi-chat-dots"></i> 对话详情',
            area: ['650px', '550px'],
            maxHeight: 600,
            content: '<div class="stl-chat-modal-loading"><div class="spinner"></div><p>加载中...</p></div>',
            success: function() {
                loadData(charFolder, fileName);
            }
        });
    }

    // 加载数据
    function loadData(charFolder, fileName) {
        request_plugin('read_chat', function(res) {
            if (res.status && res.data) {
                state.messages = res.data;
            } else {
                state.errorMsg = res.msg || '读取失败';
            }
            state.loading = false;
            updateContent();
        }, { char_folder: charFolder, file_name: fileName });
    }

    // 更新内容
    function updateContent() {
        var $container = $('.layui-layer-content');
        if ($container.length === 0) return;

        if (state.loading) {
            $container.html('<div class="stl-chat-modal-loading"><div class="spinner"></div><p>加载中...</p></div>');
            return;
        }

        if (state.errorMsg) {
            $container.html('<div class="stl-chat-modal-error"><i class="bi bi-exclamation-triangle"></i><p>' + state.errorMsg + '</p></div>');
            return;
        }

        $container.html(renderContent());

        // 滚动到底部
        var $messages = $container.find('.stl-cm-messages');
        if ($messages.length) {
            $messages.scrollTop($messages[0].scrollHeight);
        }
    }

    return {
        open: open
    };
})();

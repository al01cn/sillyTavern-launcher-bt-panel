/**
 * 世界书详情弹窗模块
 */

var WorldInfoModal = (function() {
    'use strict';

    var state = {
        loading: false,
        info: null,
        errorMsg: ''
    };

    // 翻译位置
    var positionMap = {
        'before_char': '角色之前',
        'after_char': '角色之后',
        'before_example': '示例之前',
        'after_example': '示例之后',
        'before_prompt': '提示词之前',
        'after_prompt': '提示词之后',
        'before_author': '作者之前',
        'at_depth': '深度位置',
        '0': '角色之前',
        '1': '角色之后',
        '2': '角色之后'
    };

    function translatePosition(pos) {
        if (pos === null || pos === undefined) return '—';
        var key = String(pos).toLowerCase();
        return positionMap[key] || pos;
    }

    // 获取嵌套值
    function getValue(obj, path) {
        var parts = path.split('.');
        var val = obj;
        for (var i = 0; i < parts.length; i++) {
            if (val == null) return undefined;
            val = val[parts[i]];
        }
        return val;
    }

    // 解析条目
    function parseEntries(data) {
        var rawEntries = data.entries || data;
        var entriesArray = [];

        if (Array.isArray(rawEntries)) {
            entriesArray = rawEntries;
        } else if (typeof rawEntries === 'object') {
            entriesArray = Object.values(rawEntries);
        }

        return entriesArray.map(function(entry) {
            var keys = [];
            if (Array.isArray(entry.key)) {
                keys = entry.key;
            } else if (Array.isArray(entry.keys)) {
                keys = entry.keys;
            } else if (typeof entry.key === 'string') {
                keys = entry.key.split(',').map(function(k) { return k.trim(); }).filter(Boolean);
            }

            var enabled = null;
            if (typeof entry.enabled === 'boolean') {
                enabled = entry.enabled;
            } else if (typeof entry.disable === 'boolean') {
                enabled = !entry.disable;
            } else if (entry.enabled !== undefined) {
                enabled = entry.enabled !== false;
            }

            return {
                uid: entry.uid || entry.id,
                keys: keys,
                comment: entry.comment || entry.name || '',
                content: entry.content || '',
                enabled: enabled,
                position: translatePosition(entry.position || 'before_char'),
                insertionOrder: entry.insertion_order || entry.insertionOrder || null
            };
        });
    }

    // 渲染内容
    function renderContent(fileName) {
        var title = fileName.replace('.json', '');
        var description = '';
        var entries = [];

        if (state.info) {
            // 后端返回的格式：{name, entries, entry_count}
            title = state.info.name || title;
            description = state.info.description || '';
            entries = state.info.entries || [];
        }

        var html = '<div class="stl-world-info-modal">';

        // 标题区域
        html += '<div class="stl-wim-header">';
        html += '<h3><i class="bi bi-book"></i> ' + title + '</h3>';
        html += '<p class="stl-wim-filename">' + fileName + '</p>';
        html += '</div>';

        // 内容区域
        html += '<div class="stl-wim-content">';

        // 描述
        if (description) {
            html += '<div class="stl-wim-section">';
            html += '<div class="stl-wim-section-title"><i class="bi bi-info-circle"></i> 描述</div>';
            html += '<div class="stl-wim-description">' + description + '</div>';
            html += '</div>';
        }

        // 条目列表
        html += '<div class="stl-wim-section">';
        html += '<div class="stl-wim-section-header">';
        html += '<div class="stl-wim-section-title"><i class="bi bi-list-ul"></i> 词条列表</div>';
        html += '<div class="stl-wim-entry-count">共 ' + entries.length + ' 条</div>';
        html += '</div>';

        if (entries.length > 0) {
            html += '<div class="stl-wim-entries">';
            entries.forEach(function(entry, idx) {
                var enabledLabel = entry.enabled === null ? '未知' : (entry.enabled ? '启用' : '禁用');
                var enabledClass = entry.enabled === null ? '' : (entry.enabled ? 'enabled' : 'disabled');

                html += '<details class="stl-wim-entry">';
                html += '<summary class="stl-wim-entry-header">';
                html += '<span class="stl-wim-entry-num">#' + (idx + 1) + '</span>';
                html += '<span class="stl-wim-entry-keys">' + (entry.keys.length > 0 ? entry.keys.join(', ') : '无关键词') + '</span>';
                html += '<span class="stl-wim-entry-comment">' + (entry.comment || '无备注') + '</span>';
                html += '<span class="stl-wim-entry-status ' + enabledClass + '">' + enabledLabel + '</span>';
                html += '</summary>';
                html += '<div class="stl-wim-entry-body">';
                html += '<div class="stl-wim-entry-row"><span class="label">位置:</span> ' + translatePosition(entry.position) + '</div>';
                html += '<div class="stl-wim-entry-row"><span class="label">插入顺序:</span> ' + (entry.insertionOrder !== null ? entry.insertionOrder : '—') + '</div>';
                html += '<div class="stl-wim-entry-row"><span class="label">关键词:</span> ' + (entry.keys.length > 0 ? entry.keys.join(', ') : '—') + '</div>';
                html += '<div class="stl-wim-entry-row"><span class="label">备注:</span> ' + (entry.comment || '—') + '</div>';
                html += '<div class="stl-wim-entry-content"><span class="label">内容:</span><div class="stl-wim-entry-text">' + (entry.content || '—') + '</div></div>';
                html += '</div>';
                html += '</details>';
            });
            html += '</div>';
        } else {
            html += '<div class="stl-wim-no-entries"><i class="bi bi-inbox"></i> 暂无词条</div>';
        }

        html += '</div>'; // end section
        html += '</div>'; // end content
        html += '</div>'; // end modal

        return html;
    }

    // 打开弹窗
    function open(fileName) {
        state.loading = true;
        state.info = null;
        state.errorMsg = '';

        var layerIndex = layer.open({
            type: 1,
            title: '<i class="bi bi-book"></i> 世界书详情',
            area: ['700px', '550px'],
            maxHeight: 600,
            content: '<div class="stl-world-info-modal"><div class="stl-world-info-modal-loading"><div class="spinner"></div><p>加载中...</p></div></div>',
            success: function(layero, index) {
                // 保存 layer index
                state.layerIndex = index;
                loadData(fileName);
            }
        });
    }

    // 加载数据
    function loadData(fileName) {
        state.loading = true;
        state.info = null;
        state.errorMsg = '';
        
        // 获取世界书信息（后端解析）
        request_plugin('get_world_info', { file_name: fileName }, function(res) {
            console.log('get_world_info 返回:', res);
            if (res && res.status && res.data) {
                state.info = res.data;
                console.log('世界书信息解析成功:', state.info.name);
            } else {
                state.errorMsg = res ? (res.msg || '解析失败') : '解析失败';
                console.error('世界书信息解析失败:', state.errorMsg);
            }
            state.loading = false;
            updateContent(fileName);
        });
    }

    // 更新内容
    function updateContent(fileName) {
        console.log('updateContent 被调用, loading:', state.loading, 'errorMsg:', state.errorMsg);
        
        var html;
        if (state.loading) {
            html = '<div class="stl-world-info-modal-loading"><div class="spinner"></div><p>解析中...</p></div>';
        } else if (state.errorMsg) {
            html = '<div class="stl-world-info-modal-error"><i class="bi bi-exclamation-triangle"></i><p>' + state.errorMsg + '</p></div>';
        } else {
            html = renderContent(fileName);
        }
        
        // 使用 Layer API 更新内容
        if (state.layerIndex) {
            console.log('使用 layer.style 更新内容');
            var $layero = $('#layui-layer' + state.layerIndex);
            var $content = $layero.find('.stl-world-info-modal');
            if ($content.length > 0) {
                console.log('找到 .stl-world-info-modal 元素，更新 HTML');
                $content.html(html);
            } else {
                console.error('未找到 .stl-world-info-modal 元素');
            }
        } else {
            console.error('state.layerIndex 未设置');
        }
    }

    return {
        open: open
    };
})();

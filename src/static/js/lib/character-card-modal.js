/**
 * 角色卡详情弹窗模块
 */

var CharCardModal = (function() {
    'use strict';

    var state = {
        loading: false,
        info: null,
        imageUrl: '',
        errorMsg: ''
    };

    // 格式化日期时间
    function formatDateTime(input) {
        if (typeof input === 'number' && Number.isFinite(input)) {
            return new Date(input).toLocaleString('zh-CN');
        }
        if (typeof input === 'string' && input.trim()) {
            var d = new Date(input);
            if (!Number.isNaN(d.getTime())) return d.toLocaleString('zh-CN');
            return input;
        }
        return '';
    }

    // 获取嵌套值
    function getValue(obj, paths, defaultValue) {
        for (var i = 0; i < paths.length; i++) {
            var parts = paths[i].split('.');
            var val = obj;
            for (var j = 0; j < parts.length; j++) {
                if (val == null) break;
                val = val[parts[j]];
            }
            if (val !== undefined && val !== null) return val;
        }
        return defaultValue;
    }

    // 获取第一个非空值
    function getFirstValue(obj, paths, defaultValue) {
        var val = getValue(obj, paths, defaultValue);
        if (val !== defaultValue && val !== null && val !== undefined) return val;
        return defaultValue;
    }

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
        if (!pos) return '—';
        var key = String(pos).toLowerCase();
        return positionMap[key] || pos;
    }

    // 渲染弹窗内容
    function renderContent(fileName) {
        var title = state.info ? getFirstValue(state.info, ['name', 'data.name'], '') || fileName : fileName;
        var spec = getFirstValue(state.info, ['spec', 'raw.spec', 'data.spec'], '');
        var specVersion = getFirstValue(state.info, ['spec_version', 'specVersion', 'raw.spec_version'], '');
        var createDate = formatDateTime(getFirstValue(state.info, ['data.create_date', 'data.createDate', 'createDate'], null));
        var description = getFirstValue(state.info, ['data.description', 'description', 'raw.data.description'], '');
        var creator = getValue(state.info, ['data.creator', 'creator'], '') || '';

        // 世界书信息
        var worldInfo = state.info.world_info || null;
        var worldEntriesCount = (worldInfo && worldInfo.entry_count) ? worldInfo.entry_count : 0;
        var worldInfoName = (worldInfo && worldInfo.name) ? worldInfo.name : '';
        var charBook = getFirstValue(state.info, ['data.character_book', 'data.characterBook'], null);
        var hasCharBook = !!charBook;
        var charBookName = getFirstValue(state.info, ['data.character_book.name', 'data.characterBook.name'], '');
        var charBookEntries = getFirstValue(state.info, ['data.character_book.entries', 'data.characterBook.entries'], []);
        var charBookEntriesCount = Array.isArray(charBookEntries) ? charBookEntries.length : 0;

        // 标签
        var tags = getFirstValue(state.info, ['data.tags'], []);
        if (typeof tags === 'string') {
            tags = tags.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        }
        if (!Array.isArray(tags)) tags = [];

        // 首选世界书
        var preferredBookSource = 'none';
        var preferredBookLabel = '无';
        var preferredBookName = '';
        var preferredBookEntriesCount = 0;

        if (hasCharBook) {
            preferredBookSource = 'character_book';
            preferredBookLabel = 'Character Book';
            preferredBookName = charBookName;
            preferredBookEntriesCount = charBookEntriesCount || 0;
        } else if (worldEntriesCount > 0 || worldInfoName) {
            preferredBookSource = 'worldInfo';
            preferredBookLabel = worldInfoName || 'WorldInfo';
            preferredBookName = worldInfoName;
            preferredBookEntriesCount = worldEntriesCount || 0;
        }
        
        console.log('世界书调试:', {
            hasCharBook: hasCharBook,
            worldEntriesCount: worldEntriesCount,
            worldInfoName: worldInfoName,
            preferredBookLabel: preferredBookLabel,
            preferredBookEntriesCount: preferredBookEntriesCount
        });

        // 解析世界书条目
        var entries = [];
        if (preferredBookSource === 'character_book' && Array.isArray(charBookEntries)) {
            charBookEntries.forEach(function(entry) {
                var keysRaw = getFirstValue(entry, ['keys', 'key', 'keywords'], []);
                var keys = Array.isArray(keysRaw) ? keysRaw : (typeof keysRaw === 'string' ? keysRaw.split(',').map(function(s) { return s.trim(); }) : []);

                entries.push({
                    comment: getFirstValue(entry, ['comment'], ''),
                    content: getFirstValue(entry, ['content'], ''),
                    enabled: getFirstValue(entry, ['enabled'], null),
                    position: translatePosition(getFirstValue(entry, ['position'], '')),
                    insertionOrder: getFirstValue(entry, ['insertion_order', 'insertionOrder'], null),
                    keys: keys
                });
            });
        } else if (preferredBookSource === 'worldInfo') {
            var wiEntries = worldInfo ? worldInfo.entries : [];
            if (Array.isArray(wiEntries)) {
                wiEntries.forEach(function(entry) {
                    var keysRaw = getFirstValue(entry, ['keys', 'key'], []);
                    var keys = Array.isArray(keysRaw) ? keysRaw : (typeof keysRaw === 'string' ? keysRaw.split(',').map(function(s) { return s.trim(); }) : []);

                    var enabled = getFirstValue(entry, ['enabled'], null);
                    if (typeof enabled === 'string') {
                        enabled = enabled.toLowerCase() === 'true';
                    }

                    entries.push({
                        comment: getFirstValue(entry, ['comment'], ''),
                        content: getFirstValue(entry, ['content'], ''),
                        enabled: enabled,
                        position: translatePosition(getFirstValue(entry, ['position'], '')),
                        insertionOrder: getFirstValue(entry, ['insertion_order', 'insertionOrder'], null),
                        keys: keys
                    });
                });
            }
        }

        // 构建 HTML
        var html = '<div class="stl-char-card-modal">';

        // 图片区域
        html += '<div class="stl-ccm-image-section">';
        if (state.imageUrl) {
            html += '<img src="' + state.imageUrl + '" class="stl-ccm-image" alt="' + title + '"/>';
        } else {
            html += '<div class="stl-ccm-image-placeholder"><i class="bi bi-person"></i></div>';
        }
        html += '</div>';

        // 信息区域
        html += '<div class="stl-ccm-info-section">';
        html += '<h3 class="stl-ccm-title">' + title + '</h3>';
        html += '<p class="stl-ccm-filename">' + fileName + '</p>';

        // 基本信息卡片
        html += '<div class="stl-ccm-cards">';
        html += '<div class="stl-ccm-card">';
        html += '<div class="stl-ccm-card-icon"><i class="bi bi-person"></i></div>';
        html += '<div class="stl-ccm-card-label">作者</div>';
        html += '<div class="stl-ccm-card-value">' + (creator || '未知') + '</div>';
        html += '</div>';

        html += '<div class="stl-ccm-card">';
        html += '<div class="stl-ccm-card-icon"><i class="bi bi-book"></i></div>';
        html += '<div class="stl-ccm-card-label">世界书条目</div>';
        html += '<div class="stl-ccm-card-value">' + preferredBookLabel + ' / ' + preferredBookEntriesCount + '</div>';
        html += '</div>';
        html += '</div>';

        // 创建日期和版本
        html += '<div class="stl-ccm-cards">';
        html += '<div class="stl-ccm-card">';
        html += '<div class="stl-ccm-card-label">创建日期</div>';
        html += '<div class="stl-ccm-card-value">' + (createDate || '未知') + '</div>';
        html += '</div>';

        html += '<div class="stl-ccm-card">';
        html += '<div class="stl-ccm-card-label">规范版本</div>';
        html += '<div class="stl-ccm-card-value">' + (spec ? spec + (specVersion ? ' / ' + specVersion : '') : '未知') + '</div>';
        html += '</div>';
        html += '</div>';

        // 描述
        if (description) {
            html += '<div class="stl-ccm-section">';
            html += '<div class="stl-ccm-section-title">描述</div>';
            html += '<div class="stl-ccm-description">' + description + '</div>';
            html += '</div>';
        }

        // 标签
        if (tags.length > 0) {
            html += '<div class="stl-ccm-section">';
            html += '<div class="stl-ccm-section-title"><i class="bi bi-tags"></i> 标签</div>';
            html += '<div class="stl-ccm-tags">';
            tags.slice(0, 30).forEach(function(tag) {
                html += '<span class="stl-ccm-tag">' + tag + '</span>';
            });
            html += '</div>';
            html += '</div>';
        }

        // 世界书信息
        if (preferredBookSource !== 'none') {
            html += '<div class="stl-ccm-section">';
            html += '<div class="stl-ccm-section-title"><i class="bi bi-book"></i> 世界书</div>';
            html += '<div class="stl-ccm-worldbook-info">';
            html += '<div>来源: ' + preferredBookLabel + '</div>';
            html += '<div>名称: ' + (preferredBookName || '未知') + '</div>';
            html += '<div>条目数: ' + preferredBookEntriesCount + '</div>';
            html += '</div>';

            // 条目列表
            if (entries.length > 0) {
                html += '<div class="stl-ccm-entries">';
                entries.forEach(function(entry, idx) {
                    var enabledLabel = entry.enabled === null ? '未知' : (entry.enabled ? '启用' : '禁用');
                    var enabledClass = entry.enabled === null ? '' : (entry.enabled ? 'enabled' : 'disabled');
                    html += '<details class="stl-ccm-entry">';
                    html += '<summary class="stl-ccm-entry-header">';
                    html += '<span class="stl-ccm-entry-num">#' + (idx + 1) + '</span>';
                    html += '<span class="stl-ccm-entry-keys">' + (entry.keys.length > 0 ? entry.keys.join(', ') : '无关键词') + '</span>';
                    html += '<span class="stl-ccm-entry-comment">' + (entry.comment || '无备注') + '</span>';
                    html += '<span class="stl-ccm-entry-status ' + enabledClass + '">' + enabledLabel + '</span>';
                    html += '</summary>';
                    html += '<div class="stl-ccm-entry-body">';
                    html += '<div class="stl-ccm-entry-row"><span class="label">位置:</span> ' + entry.position + '</div>';
                    html += '<div class="stl-ccm-entry-row"><span class="label">插入顺序:</span> ' + (entry.insertionOrder !== null ? entry.insertionOrder : '—') + '</div>';
                    html += '<div class="stl-ccm-entry-row"><span class="label">关键词:</span> ' + (entry.keys.length > 0 ? entry.keys.join(', ') : '—') + '</div>';
                    html += '<div class="stl-ccm-entry-row"><span class="label">备注:</span> ' + (entry.comment || '—') + '</div>';
                    html += '<div class="stl-ccm-entry-content"><span class="label">内容:</span><div class="stl-ccm-entry-text">' + (entry.content || '—') + '</div></div>';
                    html += '</div>';
                    html += '</details>';
                });
                html += '</div>';
            } else {
                html += '<div class="stl-ccm-no-entries">未检测到条目</div>';
            }
            html += '</div>';
        } else {
            html += '<div class="stl-ccm-section">';
            html += '<div class="stl-ccm-no-worldbook">未检测到世界书信息</div>';
            html += '</div>';
        }

        html += '</div>'; // end info-section
        html += '</div>'; // end modal

        return html;
    }

    // 打开弹窗
    function open(fileName) {
        state.loading = true;
        state.info = null;
        state.imageUrl = '';
        state.errorMsg = '';

        var layerIndex = layer.open({
            type: 1,
            title: '<i class="bi bi-person-badge"></i> 角色卡详情',
            area: ['800px', '600px'],
            maxHeight: 650,
            content: '<div class="stl-char-card-modal"><div class="stl-char-card-modal-loading"><div class="spinner"></div><p>加载中...</p></div></div>',
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
        state.imageUrl = '';
        state.errorMsg = '';
        
        // 并行获取图片和角色信息
        var loadedCount = 0;
        var totalTasks = 2;
        
        function checkComplete() {
            loadedCount++;
            console.log('checkComplete 被调用, loadedCount:', loadedCount, 'totalTasks:', totalTasks);
            if (loadedCount === totalTasks) {
                console.log('两个任务都完成了，更新内容');
                state.loading = false;
                updateContent(fileName);
            }
        }
        
        // 获取图片（用于显示）
        $.ajax({
            url: 'plugin?action=a&s=read_character_card_thumbnail&name=stl&file_name=' + encodeURIComponent(fileName),
            dataType: 'json',
            success: function(imgRes) {
                console.log('图片请求成功:', imgRes);
                if (imgRes && imgRes.status && imgRes.base64) {
                    state.imageUrl = 'data:' + imgRes.mime + ';base64,' + imgRes.base64;
                }
                checkComplete();
                console.log('checkComplete 调用后 loadedCount:', loadedCount);
            },
            error: function(xhr, status, error) {
                console.error('图片请求失败:', status, error);
                checkComplete();
                console.log('checkComplete 调用后 loadedCount:', loadedCount);
            }
        });
        
        // 获取角色信息（后端解析）
        request_plugin('get_character_info', { file_name: fileName }, function(res) {
            console.log('get_character_info 返回:', res);
            if (res && res.status && res.data) {
                state.info = res.data;
                console.log('角色信息解析成功:', state.info.name);
            } else {
                state.errorMsg = res ? (res.msg || '解析失败') : '解析失败';
                console.error('角色信息解析失败:', state.errorMsg);
            }
            checkComplete();
        });
    }

    // 更新内容
    function updateContent(fileName) {
        console.log('updateContent 被调用, loading:', state.loading, 'errorMsg:', state.errorMsg);
        
        var html;
        if (state.loading) {
            html = '<div class="stl-char-card-modal-loading"><div class="spinner"></div><p>解析中...</p></div>';
        } else if (state.errorMsg) {
            html = '<div class="stl-char-card-modal-error"><i class="bi bi-exclamation-triangle"></i><p>' + state.errorMsg + '</p></div>';
        } else {
            html = renderContent(fileName);
        }
        
        // 使用 Layer API 更新内容
        if (state.layerIndex) {
            console.log('使用 layer.style 更新内容');
            var $layero = $('#layui-layer' + state.layerIndex);
            var $content = $layero.find('.stl-char-card-modal');
            if ($content.length > 0) {
                console.log('找到 .stl-char-card-modal 元素，更新 HTML');
                $content.html(html);
            } else {
                console.error('未找到 .stl-char-card-modal 元素');
            }
        } else {
            console.error('state.layerIndex 未设置');
        }
    }

    return {
        open: open
    };
})();

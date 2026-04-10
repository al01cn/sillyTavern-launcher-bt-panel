/**
 * Resources 页面 - 资源管理
 */

var ResourcesPage = (function() {
    'use strict';
    
    // 当前状态
    var state = {
        activeTab: 'characters', // characters | worlds | chats
        batchMode: false,         // 批量操作模式
        selected: {},             // { [filename]: true }
        charCards: [],            // 角色卡列表
        worldList: [],            // 世界书列表
        chatGroups: [],           // 对话分组
        loading: false,
        expandedGroups: {}        // 展开的分组
    };
    
    // 工具函数
    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    function formatDate(ms) {
        var d = new Date(ms);
        return d.getFullYear() + '-' + 
               String(d.getMonth() + 1).padStart(2, '0') + '-' + 
               String(d.getDate()).padStart(2, '0') + ' ' +
               String(d.getHours()).padStart(2, '0') + ':' +
               String(d.getMinutes()).padStart(2, '0');
    }
    
    // 请求封装
    function request(method, callback) {
        var args = Array.prototype.slice.call(arguments, 2);
        var data = args.length > 0 ? args[0] : {};
        request_plugin(method, data, callback);
    }
    
    // ========== 渲染入口 ==========
    
    function render() {
        var html = 
            '<div class="stl-page active" id="page-resources">' +
                '<div class="stl-resources-page">' +
                    // 头部
                    '<div class="stl-resources-header">' +
                        '<h3><i class="bi bi-folder2-open"></i> 资源管理</h3>' +
                        '<button class="stl-btn stl-btn-primary" onclick="ResourcesPage.refresh()">' +
                            '<i class="bi bi-arrow-clockwise"></i> 刷新' +
                        '</button>' +
                    '</div>' +
                    
                    // 统计卡片
                    '<div class="stl-resource-stats" id="stl-resource-stats">' +
                        '<div class="stat-item">' +
                            '<div class="stat-icon characters"><i class="bi bi-person-badge"></i></div>' +
                            '<div class="stat-info">' +
                                '<span class="stat-value" id="stat-chars-count">-</span>' +
                                '<span class="stat-label">角色卡</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="stat-item">' +
                            '<div class="stat-icon worlds"><i class="bi bi-book"></i></div>' +
                            '<div class="stat-info">' +
                                '<span class="stat-value" id="stat-worlds-count">-</span>' +
                                '<span class="stat-label">世界书</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="stat-item">' +
                            '<div class="stat-icon chats"><i class="bi bi-chat-dots"></i></div>' +
                            '<div class="stat-info">' +
                                '<span class="stat-value" id="stat-chats-count">-</span>' +
                                '<span class="stat-label">对话记录</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    
                    // 工具栏
                    '<div class="stl-resource-toolbar">' +
                        '<div class="toolbar-left">' +
                            // Tab 切换
                            '<div class="stl-resource-tabs">' +
                                '<button class="stl-resource-tab active" data-tab="characters" onclick="ResourcesPage.switchTab(\'characters\')">' +
                                    '<i class="bi bi-person-badge tab-icon"></i> 角色卡' +
                                    '<span class="tab-count" id="tab-count-chars">0</span>' +
                                '</button>' +
                                '<button class="stl-resource-tab" data-tab="worlds" onclick="ResourcesPage.switchTab(\'worlds\')">' +
                                    '<i class="bi bi-book tab-icon"></i> 世界书' +
                                    '<span class="tab-count" id="tab-count-worlds">0</span>' +
                                '</button>' +
                                '<button class="stl-resource-tab" data-tab="chats" onclick="ResourcesPage.switchTab(\'chats\')">' +
                                    '<i class="bi bi-chat-dots tab-icon"></i> 对话历史' +
                                    '<span class="tab-count" id="tab-count-chats">0</span>' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        '<div class="toolbar-right">' +
                            '<button class="stl-btn stl-btn-default" id="btn-batch-mode" onclick="ResourcesPage.toggleBatchMode()">' +
                                '<i class="bi bi-check-square"></i> 批量操作' +
                            '</button>' +
                            '<button class="stl-btn stl-btn-default" onclick="ResourcesPage.showImportModal()">' +
                                '<i class="bi bi-upload"></i> 导入' +
                            '</button>' +
                            '<button class="stl-btn stl-btn-danger" id="btn-delete-selected" onclick="ResourcesPage.deleteSelected()" disabled>' +
                                '<i class="bi bi-trash"></i> 删除' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    
                    // 内容区
                    '<div id="stl-resource-content">' +
                        '<div class="stl-resource-loading">' +
                            '<div class="spinner"></div>' +
                            '<p>加载中...</p>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        $('.plugin_body').html(html);
        
        // 事件委托（避免 onclick 冲突）
        
        // ===== 角色卡事件 =====
        $('#stl-resource-content').on('click', '.stl-char-card .char-checkbox', function(e) {
            e.stopPropagation();
            var $card = $(this).closest('.stl-char-card');
            ResourcesPage.toggleSelect($card.data('file'));
        });
        
        $('#stl-resource-content').on('click', '.stl-char-card .char-preview', function(e) {
            e.stopPropagation();
            CharCardModal.open($(this).closest('.stl-char-card').data('file'));
        });
        
        $('#stl-resource-content').on('click', '.stl-char-card .char-delete', function(e) {
            e.stopPropagation();
            ResourcesPage.deleteOne($(this).closest('.stl-char-card').data('file'));
        });
        
        $('#stl-resource-content').on('click', '.stl-char-card .char-img-wrap', function(e) {
            if ($(e.target).closest('.char-checkbox, .char-preview, .char-delete').length) return;
            // 只有在批量模式下才进行选择
            if (state.batchMode) {
                ResourcesPage.toggleSelect($(this).closest('.stl-char-card').data('file'));
            } else {
                // 非批量模式下点击查看详情
                CharCardModal.open($(this).closest('.stl-char-card').data('file'));
            }
        });
        
        // ===== 世界书事件 =====
        $('#stl-resource-content').on('click', '.world-info', function(e) {
            var $item = $(this).closest('.stl-world-item');
            var key = $item.data('file');
            if (key) {
                // 只有在批量模式下才进行选择
                if (state.batchMode) {
                    ResourcesPage.toggleSelect(key);
                } else {
                    // 非批量模式下点击查看详情
                    WorldInfoModal.open(key);
                }
            }
        });
        
        $('#stl-resource-content').on('change', '.world-checkbox', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var $item = $(this).closest('.stl-world-item');
            var key = $item.data('file');
            if (key) {
                $(this).prop('checked', false); // 重置
                ResourcesPage.toggleSelect(key);
            }
            return false;
        });
        
        // 角色卡全选
        $('#stl-resource-content').on('change', '#char-select-all', function() {
            var checked = $(this).is(':checked');
            state.charCards.forEach(function(card) {
                state.selected[card.file_name] = checked;
            });
            renderTabContent();
            updateDeleteButton();
        });
        
        // 世界书全选
        $('#stl-resource-content').on('change', '#world-select-all', function() {
            var checked = $(this).is(':checked');
            state.worldList.forEach(function(world) {
                state.selected[world.file_name] = checked;
            });
            renderTabContent();
            updateDeleteButton();
        });
        
        // 对话历史全选
        $('#stl-resource-content').on('change', '#chat-select-all', function() {
            var checked = $(this).is(':checked');
            state.chatGroups.forEach(function(group) {
                group.files.forEach(function(file) {
                    var key = 'group_' + group.folder + '|' + file.file_name;
                    state.selected[key] = checked;
                });
            });
            renderTabContent();
            updateDeleteButton();
        });
        
        $('#stl-resource-content').on('click', '.btn-preview', function(e) {
            e.stopPropagation();
            WorldInfoModal.open($(this).data('file'));
        });
        
        $('#stl-resource-content').on('click', '.btn-delete', function(e) {
            e.stopPropagation();
            ResourcesPage.deleteOne($(this).data('file'));
        });
        
        // ===== 对话历史事件 =====
        $('#stl-resource-content').on('change', '.group-checkbox', function(e) {
            e.preventDefault();
            e.stopPropagation();
            ResourcesPage.toggleGroupSelect($(this).data('group'));
            return false;
        });
        
        $('#stl-resource-content').on('change', '.chat-checkbox', function(e) {
            e.preventDefault();
            e.stopPropagation();
            ResourcesPage.toggleSelect($(this).data('key'), true);
            return false;
        });
        
        $('#stl-resource-content').on('click', '.stl-chat-group-header', function(e) {
            if ($(e.target).closest('.group-checkbox, .group-toggle, .group-delete').length) return;
            ResourcesPage.toggleGroup($(this).data('group'));
        });
        
        $('#stl-resource-content').on('click', '.stl-chat-item .chat-info', function(e) {
            if ($(e.target).closest('.chat-checkbox').length) return;
            var $item = $(this).closest('.stl-chat-item');
            // 只有在批量模式下才进行选择
            if (state.batchMode) {
                ResourcesPage.toggleSelect($item.data('key'), true);
            } else {
                // 非批量模式下点击查看详情
                var key = $item.data('key');
                var parts = key.split('|');
                var folder = parts[0].replace('group_', '');
                var fileName = parts[1];
                var group = state.chatGroups.find(function(g) { return g.folder === folder; });
                var charName = group ? group.char_name : '';
                ChatModal.open(folder, fileName, charName);
            }
        });
        
        // 对话历史查看详情
        $('#stl-resource-content').on('click', '.stl-chat-item .btn-chat-preview', function(e) {
            e.stopPropagation();
            var $item = $(this).closest('.stl-chat-item');
            var key = $item.data('key');
            var parts = key.split('|');
            var folder = parts[0].replace('group_', '');
            var fileName = parts[1];
            var group = state.chatGroups.find(function(g) { return g.folder === folder; });
            var charName = group ? group.char_name : '';
            ChatModal.open(folder, fileName, charName);
        });
        
        $('#stl-resource-content').on('click', '.group-toggle', function(e) {
            e.stopPropagation();
            ResourcesPage.toggleGroup($(this).data('group'));
        });
        
        $('#stl-resource-content').on('click', '.group-delete', function(e) {
            e.stopPropagation();
            ResourcesPage.deleteGroup($(this).data('group'));
        });
        
        $('#stl-resource-content').on('click', '.chat-delete', function(e) {
            e.stopPropagation();
            ResourcesPage.deleteChat($(this).data('folder'), $(this).data('file'));
        });
    }
    
    // ========== 加载数据 ==========
    
    function loadAllData() {
        state.loading = true;
        
        // 并行加载所有数据
        $.when(
            $.ajax({ url: 'plugin?action=a&s=list_character_cards&name=stl', dataType: 'json' }),
            $.ajax({ url: 'plugin?action=a&s=list_world_infos&name=stl', dataType: 'json' }),
            $.ajax({ url: 'plugin?action=a&s=list_chats&name=stl', dataType: 'json' })
        ).done(function(charRes, worldRes, chatRes) {
            // $.when 返回的参数格式为 [data, textStatus, jqXHR]
            var charData = charRes && charRes[0] ? charRes[0] : null;
            var worldData = worldRes && worldRes[0] ? worldRes[0] : null;
            var chatData = chatRes && chatRes[0] ? chatRes[0] : null;
            
            if (!charData || !worldData || !chatData) {
                $('#stl-resource-content').html(
                    '<div class="stl-resource-empty">' +
                        '<i class="bi bi-exclamation-triangle"></i>' +
                        '<h4>加载失败</h4>' +
                        '<p>请检查酒馆是否已安装并运行</p>' +
                    '</div>'
                );
                return;
            }
            
            state.charCards = charData.data || [];
            state.worldList = worldData.data || [];
            state.chatGroups = chatData.data || [];
            
            // 更新统计
            $('#stat-chars-count').text(state.charCards.length);
            $('#stat-worlds-count').text(state.worldList.length);
            
            var chatCount = state.chatGroups.reduce(function(sum, g) { return sum + g.files.length; }, 0);
            $('#stat-chats-count').text(chatCount);
            
            // 更新 Tab 计数
            $('#tab-count-chars').text(state.charCards.length);
            $('#tab-count-worlds').text(state.worldList.length);
            $('#tab-count-chats').text(chatCount);
            
            // 渲染当前 Tab
            renderTabContent();
        }).fail(function() {
            $('#stl-resource-content').html(
                '<div class="stl-resource-empty">' +
                    '<i class="bi bi-exclamation-triangle"></i>' +
                    '<h4>加载失败</h4>' +
                    '<p>请检查酒馆是否已安装并运行</p>' +
                '</div>'
            );
        }).always(function() {
            state.loading = false;
        });
    }
    
    // ========== Tab 切换 ==========
    
    function switchTab(tab) {
        if (state.activeTab === tab) return;
        
        state.activeTab = tab;
        state.selected = {};
        state.batchMode = false;  // 切换 Tab 时退出批量模式
        
        // 更新 Tab 样式
        $('.stl-resource-tab').removeClass('active');
        $('.stl-resource-tab[data-tab="' + tab + '"]').addClass('active');
        
        // 更新按钮状态
        updateBatchModeButton();
        updateDeleteButton();
        
        // 渲染内容
        renderTabContent();
    }
    
    // ========== 批量模式 ==========
    
    function toggleBatchMode() {
        state.batchMode = !state.batchMode;
        state.selected = {};  // 切换模式时清空选择
        
        updateBatchModeButton();
        updateDeleteButton();
        renderTabContent();
        
        if (state.batchMode) {
            layer.msg('已进入批量操作模式，点击项目即可选择', { icon: 1, time: 2000 });
        }
    }
    
    function updateBatchModeButton() {
        var $btn = $('#btn-batch-mode');
        if (state.batchMode) {
            $btn.html('<i class="bi bi-x-square"></i> 取消批量');
            $btn.addClass('stl-btn-primary').removeClass('stl-btn-default');
        } else {
            $btn.html('<i class="bi bi-check-square"></i> 批量操作');
            $btn.addClass('stl-btn-default').removeClass('stl-btn-primary');
        }
    }
    
    function renderTabContent() {
        switch (state.activeTab) {
            case 'characters':
                renderCharGrid();
                break;
            case 'worlds':
                renderWorldList();
                break;
            case 'chats':
                renderChatGroups();
                break;
        }
    }
    
    // ========== 角色卡网格 ==========
    
    function renderCharGrid() {
        var $content = $('#stl-resource-content');
            
        if (state.charCards.length === 0) {
            $content.html(
                '<div class="stl-resource-empty">' +
                    '<i class="bi bi-person-badge"></i>' +
                    '<h4>暂无角色卡</h4>' +
                    '<p>点击“导入”按钮添加角色卡</p>' +
                '</div>'
            );
            return;
        }
            
        var html = '';
            
        // 批量模式下显示全选栏
        if (state.batchMode) {
            var selectedCount = Object.keys(state.selected).filter(function(k) { return state.selected[k]; }).length;
            var allSelected = selectedCount === state.charCards.length && state.charCards.length > 0;
                
            html += 
                '<div class="stl-select-all-bar">' +
                    '<div class="select-info">' +
                        '<input type="checkbox" id="char-select-all" ' + (allSelected ? 'checked' : '') + '/>' +
                        '<span>已选择 <strong class="selected-count">' + selectedCount + '</strong> / ' + state.charCards.length + ' 项</span>' +
                    '</div>' +
                '</div>';
        }
            
        html += '<div class="stl-char-grid">';
        
        state.charCards.forEach(function(card) {
            var selected = state.selected[card.file_name] ? 'selected' : '';
            var displayName = card.file_name.replace(/\.(png|webp|jpg|jpeg)$/i, '');
            
            html += 
                '<div class="stl-char-card ' + selected + '" data-file="' + card.file_name + '">' +
                    '<div class="char-checkbox">' +
                        '<i class="bi bi-check"></i>' +
                    '</div>' +
                    '<button class="char-preview">' +
                        '<i class="bi bi-info-circle"></i>' +
                    '</button>' +
                    '<button class="char-delete">' +
                        '<i class="bi bi-trash"></i>' +
                    '</button>' +
                    '<div class="char-img-wrap">' +
                        '<div class="char-img-placeholder" id="placeholder-' + card.file_name.replace(/[^a-zA-Z0-9]/g, '_') + '">' +
                            '<i class="bi bi-person"></i>' +
                        '</div>' +
                        '<img class="char-img" style="display:none;" id="img-' + card.file_name.replace(/[^a-zA-Z0-9]/g, '_') + '" alt="' + displayName + '"/>' +
                    '</div>' +
                    '<div class="char-info">' +
                        '<div class="char-name">' + displayName + '</div>' +
                        '<div class="char-meta">' +
                            '<span>' + formatSize(card.size) + '</span>' +
                            '<span>' + formatDate(card.modified_ms) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        });
        
        html += '</div>';
        $content.html(html);
        
        // 加载缩略图（批量并发）
        loadCharThumbnails();
    }
    
    function loadCharThumbnails() {
        var batchSize = 4;
        var batches = [];
        
        for (var i = 0; i < state.charCards.length; i += batchSize) {
            batches.push(state.charCards.slice(i, i + batchSize));
        }
        
        function processBatch(batchIndex) {
            if (batchIndex >= batches.length) return;
            
            var batch = batches[batchIndex];
            var promises = batch.map(function(card) {
                return new Promise(function(resolve) {
                    var imgId = 'img-' + card.file_name.replace(/[^a-zA-Z0-9]/g, '_');
                    var placeholderId = 'placeholder-' + card.file_name.replace(/[^a-zA-Z0-9]/g, '_');
                    
                    request_plugin('read_character_card_thumbnail', { file_name: card.file_name }, function(res) {
                        if (res.status && res.base64) {
                            var $img = $('#' + imgId);
                            var $placeholder = $('#' + placeholderId);
                            if ($img.length) {
                                $img.attr('src', 'data:' + res.mime + ';base64,' + res.base64).show();
                                $placeholder.hide();
                            }
                        }
                        resolve();
                    });
                });
            });
            
            Promise.all(promises).then(function() {
                setTimeout(function() {
                    processBatch(batchIndex + 1);
                }, 100);
            });
        }
        
        processBatch(0);
    }
    
    // ========== 世界书列表 ==========
    
    function renderWorldList() {
        var $content = $('#stl-resource-content');
            
        if (state.worldList.length === 0) {
            $content.html(
                '<div class="stl-resource-empty">' +
                    '<i class="bi bi-book"></i>' +
                    '<h4>暂无世界书</h4>' +
                    '<p>点击“导入”按钮添加世界书</p>' +
                '</div>'
            );
            return;
        }
            
        var html = '';
            
        // 批量模式下显示全选栏
        if (state.batchMode) {
            var selectedCount = Object.keys(state.selected).filter(function(k) { return state.selected[k]; }).length;
            var allSelected = selectedCount === state.worldList.length && state.worldList.length > 0;
                
            html += 
                '<div class="stl-select-all-bar">' +
                    '<div class="select-info">' +
                        '<input type="checkbox" id="world-select-all" ' + (allSelected ? 'checked' : '') + '/>' +
                        '<span>已选择 <strong class="selected-count">' + selectedCount + '</strong> / ' + state.worldList.length + ' 项</span>' +
                    '</div>' +
                '</div>';
        }
            
        html += '<div class="stl-world-list">';
        
        state.worldList.forEach(function(world) {
            var selected = state.selected[world.file_name] ? 'selected' : '';
            var displayName = world.file_name.replace('.json', '');
            
            html += 
                '<div class="stl-world-item ' + selected + '" data-file="' + world.file_name + '">' +
                    '<input type="checkbox" class="world-checkbox" data-key="' + world.file_name + '" ' + (state.selected[world.file_name] ? 'checked' : '') + '/>' +
                    '<div class="world-icon"><i class="bi bi-globe2"></i></div>' +
                    '<div class="world-info">' +
                        '<div class="world-name">' + displayName + '</div>' +
                        '<div class="world-meta">' + formatSize(world.size) + ' | ' + formatDate(world.modified_ms) + '</div>' +
                    '</div>' +
                    '<div class="world-actions">' +
                        '<button class="stl-btn stl-btn-default stl-btn-sm btn-preview" data-file="' + world.file_name + '">' +
                            '<i class="bi bi-eye"></i>' +
                        '</button>' +
                        '<button class="stl-btn stl-btn-danger stl-btn-sm btn-delete" data-file="' + world.file_name + '">' +
                            '<i class="bi bi-trash"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>';
        });
        
        html += '</div>';
        $content.html(html);
    }
    

    
    // ========== 对话历史分组 ==========
    
    function renderChatGroups() {
        var $content = $('#stl-resource-content');
        
        if (state.chatGroups.length === 0) {
            $content.html(
                '<div class="stl-resource-empty">' +
                    '<i class="bi bi-chat-dots"></i>' +
                    '<h4>暂无对话记录</h4>' +
                    '<p>与角色对话后会自动生成对话记录</p>' +
                '</div>'
            );
            return;
        }
        
        var html = '';
        
        // 批量模式下显示全选栏
        if (state.batchMode) {
            var totalChats = state.chatGroups.reduce(function(sum, g) { return sum + g.files.length; }, 0);
            var selectedCount = Object.keys(state.selected).filter(function(k) { return state.selected[k]; }).length;
            var allSelected = selectedCount === totalChats && totalChats > 0;
            
            html += 
                '<div class="stl-select-all-bar">' +
                    '<div class="select-info">' +
                        '<input type="checkbox" id="chat-select-all" ' + (allSelected ? 'checked' : '') + '/>' +
                        '<span>已选择 <strong class="selected-count">' + selectedCount + '</strong> / ' + totalChats + ' 项</span>' +
                    '</div>' +
                '</div>';
        }
        
        html += '<div class="stl-chat-groups">';
        
        state.chatGroups.forEach(function(group) {
            var expanded = state.expandedGroups[group.folder] ? 'expanded' : '';
            var groupKey = 'group_' + group.folder;
            var selectedCount = group.files.filter(function(f) { return state.selected[groupKey + '|' + f.file_name]; }).length;
            
            html += 
                '<div class="stl-chat-group ' + expanded + '">' +
                    '<div class="stl-chat-group-header" data-group="' + group.folder + '">' +
                        '<input type="checkbox" class="group-checkbox" data-group="' + group.folder + '" ' + (selectedCount === group.files.length && group.files.length > 0 ? 'checked' : '') + '/>' +
                        '<div class="group-avatar"><i class="bi bi-person"></i></div>' +
                        '<div class="group-info">' +
                            '<div class="group-name">' + group.char_name + '</div>' +
                            '<div class="group-count">' + group.files.length + ' 条对话记录</div>' +
                        '</div>' +
                        '<button class="group-toggle" data-group="' + group.folder + '">' +
                            '<i class="bi bi-chevron-down"></i>' +
                        '</button>' +
                        '<button class="group-delete" data-group="' + group.folder + '">' +
                            '<i class="bi bi-trash"></i>' +
                        '</button>' +
                    '</div>' +
                    '<div class="stl-chat-list">';
            
            group.files.forEach(function(file) {
                var fileKey = groupKey + '|' + file.file_name;
                var selected = state.selected[fileKey] ? 'selected' : '';
                
                html += 
                    '<div class="stl-chat-item ' + selected + '" data-key="' + fileKey + '">' +
                        '<input type="checkbox" class="chat-checkbox" data-key="' + fileKey + '" ' + (state.selected[fileKey] ? 'checked' : '') + '/>' +
                        '<div class="chat-icon"><i class="bi bi-chat-dots"></i></div>' +
                        '<div class="chat-info">' +
                            '<div class="chat-name">' + file.file_name + '</div>' +
                            '<div class="chat-meta">' + formatSize(file.size) + ' | ' + formatDate(file.modified_ms) + '</div>' +
                        '</div>' +
                        '<div class="chat-actions">' +
                            '<button class="stl-btn stl-btn-default stl-btn-sm btn-chat-preview" title="查看详情">' +
                                '<i class="bi bi-eye"></i>' +
                            '</button>' +
                            '<button class="chat-delete" data-folder="' + group.folder + '" data-file="' + file.file_name + '">' +
                                '<i class="bi bi-trash"></i>' +
                            '</button>' +
                        '</div>' +
                    '</div>';
            });
            
            html += '</div></div>';
        });
        
        html += '</div>';
        $content.html(html);
    }
    
    function toggleGroup(folder) {
        state.expandedGroups[folder] = !state.expandedGroups[folder];
        renderTabContent();
    }
    
    function toggleGroupSelect(folder) {
        var group = state.chatGroups.find(function(g) { return g.folder === folder; });
        if (!group) return;
        
        var allSelected = group.files.every(function(f) { return state.selected['group_' + folder + '|' + f.file_name]; });
        
        group.files.forEach(function(f) {
            var key = 'group_' + folder + '|' + f.file_name;
            state.selected[key] = !allSelected;
        });
        
        renderTabContent();
        updateDeleteButton();
    }
    
    // ========== 选择逻辑 ==========
    
    function toggleSelect(key, isChat) {
        state.selected[key] = !state.selected[key];
        
        if (state.activeTab === 'characters') {
            var $card = $('.stl-char-card[data-file="' + key + '"]');
            $card.toggleClass('selected', state.selected[key]);
        } else if (state.activeTab === 'worlds') {
            var $item = $('.stl-world-item[data-file="' + key + '"]');
            $item.toggleClass('selected', state.selected[key]);
            $item.find('.world-checkbox').prop('checked', state.selected[key]);
        } else if (state.activeTab === 'chats' && isChat) {
            var $item = $('.stl-chat-item[data-key="' + key + '"]');
            $item.toggleClass('selected', state.selected[key]);
            $item.find('.chat-checkbox').prop('checked', state.selected[key]);
        }
        
        updateDeleteButton();
    }
    
    function updateDeleteButton() {
        var count = Object.keys(state.selected).filter(function(k) { return state.selected[k]; }).length;
        var $btn = $('#btn-delete-selected');
        $btn.prop('disabled', count === 0);
        $btn.find('i').next().text(count > 0 ? '删除 (' + count + ')' : '删除');
    }
    
    // ========== 删除操作 ==========
    
    function deleteOne(filename) {
        layer.confirm(
            '<div style="text-align:center;padding:15px 0;">' +
                '<i class="bi bi-exclamation-triangle" style="font-size:48px;color:#f0ad4e;margin-bottom:15px;"></i>' +
                '<p style="font-size:14px;">确定要删除 <strong>' + filename + '</strong> 吗？</p>' +
                '<p style="font-size:12px;color:#999;">此操作不可恢复</p>' +
            '</div>',
            { title: '确认删除', btn: ['确定删除', '取消'], icon: 0, skin: 'stl-confirm-modal' },
            function(index) {
                layer.close(index);
                doDelete([filename]);
            }
        );
    }
    
    function deleteGroup(folder) {
        var group = state.chatGroups.find(function(g) { return g.folder === folder; });
        if (!group) return;
        
        layer.confirm(
            '<div style="text-align:center;padding:15px 0;">' +
                '<i class="bi bi-exclamation-triangle" style="font-size:48px;color:#f0ad4e;margin-bottom:15px;"></i>' +
                '<p style="font-size:14px;">确定要删除角色 <strong>' + group.char_name + '</strong> 的全部对话记录吗？</p>' +
                '<p style="font-size:12px;color:#999;">共 ' + group.files.length + ' 条记录，此操作不可恢复</p>' +
            '</div>',
            { title: '确认删除', btn: ['确定删除', '取消'], icon: 0, skin: 'stl-confirm-modal' },
            function(index) {
                layer.close(index);
                doDeleteGroup(folder);
            }
        );
    }
    
    function deleteChat(folder, filename) {
        layer.confirm(
            '<div style="text-align:center;padding:15px 0;">' +
                '<i class="bi bi-exclamation-triangle" style="font-size:48px;color:#f0ad4e;margin-bottom:15px;"></i>' +
                '<p style="font-size:14px;">确定要删除对话记录 <strong>' + filename + '</strong> 吗？</p>' +
                '<p style="font-size:12px;color:#999;">此操作不可恢复</p>' +
            '</div>',
            { title: '确认删除', btn: ['确定删除', '取消'], icon: 0, skin: 'stl-confirm-modal' },
            function(index) {
                layer.close(index);
                doDeleteChats([{ folder: folder, file_name: filename }]);
            }
        );
    }
    
    function deleteSelected() {
        var count = Object.keys(state.selected).filter(function(k) { return state.selected[k]; }).length;
        if (count === 0) return;
        
        layer.confirm(
            '<div style="text-align:center;padding:15px 0;">' +
                '<i class="bi bi-exclamation-triangle" style="font-size:48px;color:#f0ad4e;margin-bottom:15px;"></i>' +
                '<p style="font-size:14px;">确定要删除选中的 <strong>' + count + '</strong> 项资源吗？</p>' +
                '<p style="font-size:12px;color:#999;">此操作不可恢复</p>' +
            '</div>',
            { title: '确认删除', btn: ['确定删除', '取消'], icon: 0, skin: 'stl-confirm-modal' },
            function(index) {
                layer.close(index);
                
                if (state.activeTab === 'chats') {
                    var items = Object.keys(state.selected).filter(function(k) { return state.selected[k]; });
                    var chats = items.map(function(k) {
                        var parts = k.split('|');
                        return { folder: parts[0].replace('group_', ''), file_name: parts[1] };
                    });
                    doDeleteChats(chats);
                } else {
                    var files = Object.keys(state.selected).filter(function(k) { return state.selected[k]; });
                    if (state.activeTab === 'characters') {
                        doDelete(files);
                    } else {
                        doDeleteWorlds(files);
                    }
                }
            }
        );
    }
    
    function doDelete(files) {
        var loading = layer.msg('正在删除...', { icon: 16, shade: 0.3, time: 0 });
        
        request('delete_character_cards', function(res) {
            layer.close(loading);
            if (res.status) {
                layer.msg(res.msg, { icon: 1 });
                state.selected = {};
                refresh();
            } else {
                layer.msg(res.msg || '删除失败', { icon: 2 });
            }
        }, { files: files });
    }
    
    function doDeleteWorlds(files) {
        var loading = layer.msg('正在删除...', { icon: 16, shade: 0.3, time: 0 });
        
        request('delete_world_infos', function(res) {
            layer.close(loading);
            if (res.status) {
                layer.msg(res.msg, { icon: 1 });
                state.selected = {};
                refresh();
            } else {
                layer.msg(res.msg || '删除失败', { icon: 2 });
            }
        }, { files: files });
    }
    
    function doDeleteChats(chats) {
        var loading = layer.msg('正在删除...', { icon: 16, shade: 0.3, time: 0 });
        
        request('delete_chats', function(res) {
            layer.close(loading);
            if (res.status) {
                layer.msg(res.msg, { icon: 1 });
                state.selected = {};
                refresh();
            } else {
                layer.msg(res.msg || '删除失败', { icon: 2 });
            }
        }, { folders: chats });
    }
    
    function doDeleteGroup(folder) {
        var loading = layer.msg('正在删除...', { icon: 16, shade: 0.3, time: 0 });
        
        var group = state.chatGroups.find(function(g) { return g.folder === folder; });
        if (!group) {
            layer.close(loading);
            return;
        }
        
        var chats = group.files.map(function(f) {
            return { folder: folder, file_name: f.file_name };
        });
        
        request('delete_chats', function(res) {
            layer.close(loading);
            if (res.status) {
                layer.msg(res.msg, { icon: 1 });
                refresh();
            } else {
                layer.msg(res.msg || '删除失败', { icon: 2 });
            }
        }, { folders: chats });
    }
    
    // ========== 导入功能 ==========
    
    function showImportModal() {
        if (state.activeTab === 'characters') {
            UploadCharModal.open(function() {
                refresh();
            });
        } else if (state.activeTab === 'worlds') {
            UploadWorldModal.open(function() {
                refresh();
            });
        }
    }
    
    // ========== 刷新 ==========
    
    function refresh() {
        loadAllData();
    }
    
    // ========== 公开接口 ==========
    
    return {
        render: render,
        switchTab: switchTab,
        toggleBatchMode: toggleBatchMode,
        toggleSelect: toggleSelect,
        toggleGroup: toggleGroup,
        toggleGroupSelect: toggleGroupSelect,
        deleteOne: deleteOne,
        deleteGroup: deleteGroup,
        deleteChat: deleteChat,
        deleteSelected: deleteSelected,
        showImportModal: showImportModal,
        refresh: refresh,
        init: function() {
            render();
            loadAllData();
        }
    };
})();

// 页面渲染入口
function renderResourcesPage() {
    ResourcesPage.init();
}

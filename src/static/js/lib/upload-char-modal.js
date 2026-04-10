/**
 * 上传角色卡弹窗模块
 */

var UploadCharModal = (function() {
    'use strict';

    var state = {
        selectedFiles: [],
        isImporting: false,
        layerIndex: null
    };

    // 获取文件大小描述
    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // 渲染弹窗内容
    function renderContent() {
        var html = '<div class="stl-upload-char-modal">';

        if (state.selectedFiles.length === 0) {
            // 空状态 - 拖拽区域
            html += '<div class="stl-ucm-dropzone" id="stl-ucm-dropzone">';
            html += '<div class="stl-ucm-dropzone-icon"><i class="bi bi-cloud-arrow-up"></i></div>';
            html += '<p class="stl-ucm-dropzone-text">点击选择文件或拖拽文件到此处</p>';
            html += '<p class="stl-ucm-dropzone-hint">仅支持 PNG 格式</p>';
            html += '<input type="file" id="stl-ucm-file-input" accept=".png" multiple/>';
            html += '</div>';
        } else {
            // 文件列表状态
            html += '<div class="stl-ucm-file-list-header">';
            html += '<div class="stl-ucm-file-list-title">已选择 ' + state.selectedFiles.length + ' 个文件</div>';
            html += '<button class="stl-btn stl-btn-default stl-btn-sm" id="stl-ucm-reselect">重新选择</button>';
            html += '</div>';

            html += '<div class="stl-ucm-file-list">';
            state.selectedFiles.forEach(function(file, idx) {
                var statusIcon = '';
                var statusClass = '';
                var statusText = '';

                switch (file.status) {
                    case 'verifying':
                        statusIcon = '<i class="bi bi-arrow-repeat"></i>';
                        statusClass = 'verifying';
                        statusText = '验证中...';
                        break;
                    case 'valid':
                        statusIcon = '<i class="bi bi-check-circle"></i>';
                        statusClass = 'valid';
                        statusText = '有效';
                        break;
                    case 'invalid':
                        statusIcon = '<i class="bi bi-x-circle"></i>';
                        statusClass = 'invalid';
                        statusText = '无效';
                        break;
                    case 'importing':
                        statusIcon = '<i class="bi bi-arrow-repeat"></i>';
                        statusClass = 'importing';
                        statusText = '导入中...';
                        break;
                    case 'success':
                        statusIcon = '<i class="bi bi-check-circle-fill"></i>';
                        statusClass = 'success';
                        statusText = '成功';
                        break;
                    case 'error':
                        statusIcon = '<i class="bi bi-exclamation-circle"></i>';
                        statusClass = 'error';
                        statusText = '失败';
                        break;
                    default:
                        statusIcon = '<i class="bi bi-hourglass"></i>';
                        statusClass = '';
                        statusText = '待处理';
                }

                html += '<div class="stl-ucm-file-item ' + statusClass + '">';
                html += '<div class="stl-ucm-file-icon"><i class="bi bi-file-earmark-image"></i></div>';
                html += '<div class="stl-ucm-file-info">';
                html += '<div class="stl-ucm-file-name">' + (file.characterName || file.name) + '</div>';
                html += '<div class="stl-ucm-file-meta">';
                html += '<span>' + file.name + '</span>';
                html += '<span>' + formatSize(file.size) + '</span>';
                if (file.errorMsg) {
                    html += '<span class="stl-ucm-file-error">' + file.errorMsg + '</span>';
                }
                html += '</div>';
                html += '</div>';
                html += '<div class="stl-ucm-file-status">';
                html += statusIcon;
                html += '<span>' + statusText + '</span>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // 打开弹窗
    function open(onSuccess) {
        state.selectedFiles = [];
        state.isImporting = false;
        onSuccessCallback = onSuccess;

        var layerIndex = layer.open({
            type: 1,
            title: '<i class="bi bi-person-badge"></i> 导入角色卡',
            area: ['550px', '420px'],
            maxHeight: 450,
            content: renderContent(),
            btn: ['开始导入', '取消'],
            btn1: function(index) {
                if (!state.isImporting) {
                    doImport(index);
                }
            },
            success: function(layero, index) {
                state.layerIndex = index;
                bindEvents();
            }
        });
    }

    // 绑定事件
    function bindEvents() {
        var $dropzone = $('#stl-ucm-dropzone');
        var $input = $('#stl-ucm-file-input');

        if ($dropzone.length && $input.length) {
            // 先解绑旧事件，防止重复绑定
            $dropzone.off('click');
            $input.off('change');
            $dropzone.off('dragover dragleave drop');

            $dropzone.on('click', function() {
                if (!state.isImporting) {
                    // 使用原生 DOM API，避免 jQuery 的事件递归
                    $input[0].click();
                }
            });

            $input.on('change', function() {
                handleFiles(this.files);
            });

            $dropzone.on('dragover', function(e) {
                e.preventDefault();
                $(this).addClass('dragover');
            });

            $dropzone.on('dragleave', function() {
                $(this).removeClass('dragover');
            });

            $dropzone.on('drop', function(e) {
                e.preventDefault();
                $(this).removeClass('dragover');
                handleFiles(e.originalEvent.dataTransfer.files);
            });
        }

        // 重新选择
        $('#stl-ucm-reselect').off('click').on('click', function() {
            if (!state.isImporting) {
                state.selectedFiles = [];
                updateContent();
                // 不需要再次调用 bindEvents，因为 updateContent 会重新渲染 DOM
                setTimeout(function() {
                    bindEvents();
                }, 0);
            }
        });
    }

    // 处理文件选择
    function handleFiles(files) {
        var newFiles = Array.from(files).map(function(file) {
            return {
                file: file,
                name: file.name,
                size: file.size,
                status: 'verifying',
                characterName: '',
                errorMsg: ''
            };
        });

        state.selectedFiles = newFiles;
        updateContent();
        bindEvents();

        // 验证文件
        verifyFiles();
    }

    // 验证文件
    function verifyFiles() {
        var pending = state.selectedFiles.filter(function(f) { return f.status === 'verifying'; });

        if (pending.length === 0) return;

        var completedCount = 0;
        
        pending.forEach(function(fileData) {
            var file = fileData.file;

            GSTInfo.getCharacterInfo(file).then(function(info) {
                if (info && info.name) {
                    fileData.characterName = info.name;
                    fileData.status = 'valid';
                } else {
                    fileData.errorMsg = '无效的角色卡数据';
                    fileData.status = 'invalid';
                }
                completedCount++;
                if (completedCount === pending.length) {
                    // 所有文件验证完成后，重新渲染
                    updateContent();
                }
            }).catch(function(err) {
                fileData.errorMsg = err.message || '验证失败';
                fileData.status = 'invalid';
                completedCount++;
                if (completedCount === pending.length) {
                    updateContent();
                }
            });
        });
    }

    // 更新单个文件项
    function updateFileItem(fileData) {
        var $item = $('.stl-ucm-file-item').filter(function() {
            return $(this).find('.stl-ucm-file-name').text() === (fileData.characterName || fileData.name);
        });

        if ($item.length) {
            var $status = $item.find('.stl-ucm-file-status');
            $status.removeClass('verifying valid invalid importing success error');

            var statusIcon = '';
            var statusText = '';

            switch (fileData.status) {
                case 'verifying':
                    statusIcon = '<i class="bi bi-arrow-repeat"></i>';
                    statusText = '验证中...';
                    $status.addClass('verifying');
                    break;
                case 'valid':
                    statusIcon = '<i class="bi bi-check-circle"></i>';
                    statusText = '有效';
                    $status.addClass('valid');
                    break;
                case 'invalid':
                    statusIcon = '<i class="bi bi-x-circle"></i>';
                    statusText = '无效';
                    $status.addClass('invalid');
                    break;
                case 'importing':
                    statusIcon = '<i class="bi bi-arrow-repeat"></i>';
                    statusText = '导入中...';
                    $status.addClass('importing');
                    break;
                case 'success':
                    statusIcon = '<i class="bi bi-check-circle-fill"></i>';
                    statusText = '成功';
                    $status.addClass('success');
                    break;
                case 'error':
                    statusIcon = '<i class="bi bi-exclamation-circle"></i>';
                    statusText = '失败';
                    $status.addClass('error');
                    break;
            }

            $status.html(statusIcon + '<span>' + statusText + '</span>');

            if (fileData.errorMsg) {
                $item.find('.stl-ucm-file-error').remove();
                $item.find('.stl-ucm-file-meta').append('<span class="stl-ucm-file-error">' + fileData.errorMsg + '</span>');
            }
        }
    }

    // 更新内容
    function updateContent() {
        var $layero = state.layerIndex ? $('#layui-layer' + state.layerIndex) : null;
        var $container = $layero ? $layero.find('.stl-upload-char-modal') : $('.stl-upload-char-modal');
        
        if ($container.length === 0) {
            // 如果找不到容器，尝试查找 layui-layer-content
            $container = $('.layui-layer-content');
        }
        
        if ($container.length) {
            $container.html(renderContent());
            // 重新绑定事件
            setTimeout(function() {
                bindEvents();
            }, 0);
        }
    }

    // 执行导入
    function doImport(layerIndex) {
        var validFiles = state.selectedFiles.filter(function(f) { return f.status === 'valid'; });

        if (validFiles.length === 0) {
            layer.msg('请选择有效的角色卡文件', { icon: 0 });
            return;
        }

        var importingFiles = state.selectedFiles.filter(function(f) { return f.status === 'valid' || f.status === 'importing' || f.status === 'error'; });
        importingFiles.forEach(function(f) {
            if (f.status === 'valid') f.status = 'importing';
        });
        state.isImporting = true;
        updateContent();
        bindEvents();

        var completed = 0;
        var successCount = 0;
        var errors = [];

        function processNext(index) {
            if (index >= validFiles.length) {
                state.isImporting = false;
                layer.close(layerIndex);

                if (successCount > 0) {
                    layer.msg('成功导入 ' + successCount + ' 个角色卡', { icon: 1 });
                    if (typeof onSuccessCallback === 'function') {
                        onSuccessCallback();
                    }
                } else {
                    layer.msg('导入失败', { icon: 2 });
                }
                return;
            }

            var fileData = validFiles[index];
            var file = fileData.file;

            var reader = new FileReader();
            reader.onload = function(e) {
                var base64 = e.target.result.split(',')[1];

                request_plugin('import_character_card', { file_name: fileData.name, content: base64 }, function(res) {
                    completed++;
                    if (res.status) {
                        fileData.status = 'success';
                        successCount++;
                    } else {
                        fileData.status = 'error';
                        fileData.errorMsg = res.msg || '导入失败';
                        errors.push({ name: fileData.name, msg: res.msg });
                    }
                    updateFileItem(fileData);
                    processNext(index + 1);
                });
            };

            reader.onerror = function() {
                fileData.status = 'error';
                fileData.errorMsg = '文件读取失败';
                updateFileItem(fileData);
                processNext(index + 1);
            };

            reader.readAsDataURL(file);
        }

        processNext(0);
    }

    var onSuccessCallback = null;

    return {
        open: function(onSuccess) {
            onSuccessCallback = onSuccess || null;
            open(onSuccessCallback);
        }
    };
})();

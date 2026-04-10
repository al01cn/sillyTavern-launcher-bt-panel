// JSZip 库内容... https://github.com/Stuk/jszip

/**
 * SillyTavern 扩展包校验工具 (基于 JSZip)
 */
var STExtensionValidator = (function() {
    "use strict";

    /**
     * 校验 ZIP 文件
     * @param {File} file - 用户选择的 File 对象
     * @returns {Promise<Object>} - 返回校验结果和 manifest 信息
     */
    function validate(file) {
        return new Promise(function(resolve, reject) {
            if (!file || !file.name.endsWith('.zip')) {
                return reject({ status: false, msg: '请选择 .zip 格式的扩展包' });
            }

            JSZip.loadAsync(file).then(function(zip) {
                // 1. 寻找 manifest.json
                var manifestPath = null;
                zip.forEach(function(relativePath, zipEntry) {
                    if (relativePath.endsWith('manifest.json') && !manifestPath) {
                        manifestPath = relativePath;
                    }
                });

                if (!manifestPath) {
                    return reject({ status: false, msg: '无效的扩展包：未找到 manifest.json' });
                }

                // 2. 读取并解析 manifest
                return zip.file(manifestPath).async("string").then(function(content) {
                    try {
                        var manifest = JSON.parse(content);
                        
                        // 3. 基础字段检查
                        if (!manifest.display_name) {
                            return reject({ status: false, msg: 'manifest.json 缺少 display_name 字段' });
                        }

                        resolve({
                            status: true,
                            manifest: manifest,
                            fileName: file.name,
                            extName: manifest.display_name, // 用于后端创建文件夹
                            isOfficial: _isOfficial(manifest)
                        });
                    } catch (e) {
                        reject({ status: false, msg: 'manifest.json 格式错误: ' + e.message });
                    }
                });
            }).catch(function(err) {
                reject({ status: false, msg: '无法读取 ZIP 文件: ' + err.message });
            });
        });
    }

    /**
     * 判断是否为官方扩展
     */
    function _isOfficial(manifest) {
        if (manifest.auto_update === true) return false;
        var hp = (manifest.homePage || '').toLowerCase();
        if (hp.includes('github.com') || hp.includes('gitee.com') || hp.includes('gitlab.com') || hp.endsWith('.git')) {
            return false;
        }
        return true;
    }

    return {
        validate: validate
    };
})();

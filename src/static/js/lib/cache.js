/**
 * SillyTavern Launcher - 缓存工具
 * 统一加 STL_ 前缀，避免宝塔面板等宿主环境下 key 冲突
 */
var CacheUtil = (function() {
    "use strict";

    /** 统一 key 前缀 */
    var KEY_PREFIX = 'STL_';

    /**
     * 拼接前缀（幂等，已有前缀的 key 不会重复加）
     * @param {string} key
     * @returns {string}
     */
    function prefixKey(key) {
        return key.indexOf(KEY_PREFIX) === 0 ? key : KEY_PREFIX + key;
    }

    // ======== localStorage 操作 ========

    /**
     * 读取 localStorage
     * @param {string} key
     * @param {*} defaultValue 默认值
     * @returns {*}
     */
    function localGet(key, defaultValue) {
        var stored = localStorage.getItem(prefixKey(key));
        if (stored === null) return defaultValue !== undefined ? defaultValue : null;
        try {
            return JSON.parse(stored);
        } catch (e) {
            return stored;
        }
    }

    /**
     * 写入 localStorage
     * @param {string} key
     * @param {*} value
     */
    function localSet(key, value) {
        localStorage.setItem(prefixKey(key), JSON.stringify(value));
    }

    /**
     * 删除 localStorage 中的 key
     * @param {string} key
     */
    function localRemove(key) {
        localStorage.removeItem(prefixKey(key));
    }

    // ======== sessionStorage 操作 ========

    /**
     * 读取 sessionStorage
     * @param {string} key
     * @param {*} defaultValue 默认值
     * @returns {*}
     */
    function sessionGet(key, defaultValue) {
        var stored = sessionStorage.getItem(prefixKey(key));
        if (stored === null) return defaultValue !== undefined ? defaultValue : null;
        try {
            return JSON.parse(stored);
        } catch (e) {
            return stored;
        }
    }

    /**
     * 写入 sessionStorage
     * @param {string} key
     * @param {*} value
     */
    function sessionSet(key, value) {
        sessionStorage.setItem(prefixKey(key), JSON.stringify(value));
    }

    /**
     * 删除 sessionStorage 中的 key
     * @param {string} key
     */
    function sessionRemove(key) {
        sessionStorage.removeItem(prefixKey(key));
    }

    // ======== 公开接口 ========
    return {
        // localStorage 操作
        localGet: localGet,
        localSet: localSet,
        localRemove: localRemove,

        // sessionStorage 操作
        sessionGet: sessionGet,
        sessionSet: sessionSet,
        sessionRemove: sessionRemove
    };
})();

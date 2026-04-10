/**
 * QRCodeUtil - 二维码生成工具
 *
 * 基于 jquery.qrcode 库（已在 index.html 中引入），
 * 封装常用的 QR 码渲染 / 清除方法。
 *
 * 用法：
 *   QRCodeUtil.render($('#qr-box'), 'https://example.com');
 *   QRCodeUtil.clear($('#qr-box'));
 */

var QRCodeUtil = (function () {
    "use strict";

    // 默认参数
    var DEFAULTS = {
        width: 160,
        height: 160,
        colorDark: '#1e293b',
        colorLight: '#ffffff',
        correctLevel: 1  // 0=L, 1=M, 2=Q, 3=H
    };

    // 容错级别映射（jquery.qrcode 使用数字）
    var CORRECT_MAP = {
        'L': 0, 'l': 0,
        'M': 1, 'm': 1,
        'Q': 2, 'q': 2,
        'H': 3, 'h': 3
    };

    /**
     * 在指定容器内渲染 QR 码（table 模式，兼容性好）
     *
     * @param {jQuery} $container  目标容器（会被清空后填充）
     * @param {string}  text       要编码的文本/URL
     * @param {Object}  [options]  可选配置
     *   - width {number}         宽度，默认 160
     *   - height {number}        高度，默认 160
     *   - colorDark {string}     前景色，默认 #1e293b
     *   - colorLight {string}    背景色，默认 #ffffff
     *   - correctLevel {number|string}  容错级别 0-3 或 L/M/Q/H，默认 M
     */
    function render($container, text, options) {
        if (!$container || !$container.length || !text) return;

        // 先清空
        clear($container);

        var opts = $.extend({}, DEFAULTS, options || {});

        // 兼容字符串形式的容错级别
        if (typeof opts.correctLevel === 'string') {
            opts.correctLevel = CORRECT_MAP[opts.correctLevel] !== undefined
                ? CORRECT_MAP[opts.correctLevel]
                : DEFAULTS.correctLevel;
        }

        $container.qrcode({
            text: text,
            width: opts.width,
            height: opts.height,
            colorDark: opts.colorDark,
            colorLight: opts.colorLight,
            correctLevel: opts.correctLevel
        });
    }

    /**
     * 在指定容器内渲染 QR 码（canvas 模式，更清晰）
     *
     * @param {jQuery} $container  目标容器
     * @param {string}  text       要编码的文本/URL
     * @param {number}  [size]     尺寸（宽=高），默认 160
     */
    function renderCanvas($container, text, size) {
        if (!$container || !$container.length || !text) return;

        clear($container);

        var s = size || DEFAULTS.width;

        $container.qrcode({
            text: text,
            width: s,
            height: s,
            render: 'canvas',
            colorDark: DEFAULTS.colorDark,
            colorLight: DEFAULTS.colorLight,
            correctLevel: DEFAULTS.correctLevel
        });
    }

    /**
     * 清除容器内的 QR 码内容
     *
     * @param {jQuery} $container  目标容器
     */
    function clear($container) {
        if (!$container || !$container.length) return;
        // jquery.qrcode 会生成 canvas、table 或 img，全部清掉
        $container.empty();
    }

    /**
     * 将容器内的 QR 码转为 Data URL（仅 canvas 模式有效）
     *
     * @param {jQuery} $container  包含 QR 码 canvas 的容器
     * @returns {string}  data:image/png;base64,... 或空字符串
     */
    function toDataURL($container) {
        if (!$container || !$container.length) return '';
        var $canvas = $container.find('canvas');
        if ($canvas.length === 0) return '';
        try {
            return $canvas[0].toDataURL('image/png');
        } catch (e) {
            return '';
        }
    }

    // 公开 API
    return {
        render: render,
        renderCanvas: renderCanvas,
        clear: clear,
        toDataURL: toDataURL
    };
})();

// 挂载到全局
window.QRCodeUtil = QRCodeUtil;

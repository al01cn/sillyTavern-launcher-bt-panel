// 防止重复加载时重复声明（宝塔面板 + loader.js 都可能加载此文件）
if (typeof App_Config === 'undefined') {
    const App_Config = {
        GITHUB_PROXY_API_URL: 'https://api.akams.cn/github', // 公益 Github CDN地址 获取API
        GITHUB_PROXY_CDN_URL: 'https://ghfast.top/', // 备用 公益 Github CDN地址
    };

    var Config_Json = {
        GITHUB_PROXY: {
            enabled: false, // 是否启用Github CDN加速
            url: 'https://ghfast.top/'// 公益 Github CDN地址
        },
        PROXY: { // 全局代理设置
            mode: 'none',   // 代理模式: 'none' | 'system' | 'custom'
            host: '',       // 自定义代理地址
            port: ''        // 自定义代理端口
        }
    };
}
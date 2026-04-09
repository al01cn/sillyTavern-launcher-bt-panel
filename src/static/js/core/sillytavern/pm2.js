const pm2_start_config =`
module.exports = {
  apps: [{
    name: "stl_sillytavern",
    script: "./server.js",
    // args 存放传给酒馆（server.js）的参数
    args: "--configPath ${configPath}", // 配置文件路径，一定要是根目录的config.yaml文件绝对路径，不能是default里的config.yaml，不然更新时候会被覆盖。
    env: {
      NODE_ENV: "production",
      http_proxy: "${http_proxy}",
      https_proxy: "${https_proxy}",
      no_proxy: "${no_proxy}",
      all_proxy: "${all_proxy}"
    },
    watch: false,
    autorestart: true
  }]
}`
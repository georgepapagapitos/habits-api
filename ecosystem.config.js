module.exports = {
  apps: [
    {
      name: "habits-api",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      max_memory_restart: "1G",
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
        NODE_NO_WARNINGS: 1,
      },
    },
  ],
};

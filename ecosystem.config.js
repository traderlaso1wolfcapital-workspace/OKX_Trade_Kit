const path = require('path');

module.exports = {
  apps: [{
    name: "tls1-bot-backend",
    script: "main.py",
    cwd: path.resolve(__dirname, "web_app/backend"),
    interpreter: "python3",
    watch: false,
    autorestart: true,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: "production",
      PYTHONUNBUFFERED: "1"
    }
  }]
};

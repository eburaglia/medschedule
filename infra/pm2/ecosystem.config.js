module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000 --reload',
      cwd: '/app/backend',
      interpreter: 'python3',
      watch: false,  // Desabilitar watch por enquanto
      env: {
        PYTHONPATH: '/app/backend',
      },
      error_file: '/root/.pm2/logs/backend-error.log',
      out_file: '/root/.pm2/logs/backend-out.log',
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'start',
      cwd: '/app/frontend',
      watch: false,  // Desabilitar watch por enquanto
      env: {
        NODE_ENV: 'development',
      },
      error_file: '/root/.pm2/logs/frontend-error.log',
      out_file: '/root/.pm2/logs/frontend-out.log',
    }
  ]
};

module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000 --reload',
      cwd: '/app/backend',
      interpreter: 'python3',
      watch: ['app'],
      env: {
        PYTHONPATH: '/app/backend',
      }
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'start',
      cwd: '/app/frontend',
      watch: ['src'],
      env: {
        NODE_ENV: 'development',
      }
    }
  ]
};

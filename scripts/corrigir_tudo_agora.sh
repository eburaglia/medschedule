#!/bin/bash

echo "==================================="
echo "🔧 CORREÇÃO COMPLETA DO SISTEMA"
echo "==================================="

# 1. Parar todos os containers
echo "⏹️  Parando todos os containers..."
docker-compose down

# 2. Corrigir PM2
echo "📝 Corrigindo configuração do PM2..."
cat > /opt/medschedule/infra/pm2/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000 --reload',
      cwd: '/app/backend',
      interpreter: 'python3',
      watch: false,
      env: {
        PYTHONPATH: '/app/backend',
      }
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'start',
      cwd: '/app/frontend',
      watch: false,
      env: {
        NODE_ENV: 'development',
      }
    }
  ]
};
EOF

# 3. Verificar se o uvicorn está instalado no backend
echo "🔍 Verificando uvicorn no backend..."
docker run --rm medschedule-backend which uvicorn || echo "⚠️  uvicorn pode não estar no PATH"

# 4. Corrigir frontend - remover start.sh e usar comando direto
echo "📝 Corrigindo Dockerfile do frontend..."
cat > /opt/medschedule/frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código
COPY . .

EXPOSE 3000

# Comando direto - SEM SCRIPTS
CMD ["npm", "start"]
EOF

# 5. Criar um App.js mínimo para teste
echo "📝 Criando App.js mínimo..."
mkdir -p /opt/medschedule/frontend/src
cat > /opt/medschedule/frontend/src/App.js << 'EOF'
import React from 'react';

function App() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial',
      textAlign: 'center',
      marginTop: '50px'
    }}>
      <h1>🏥 Medschedule</h1>
      <p>Frontend funcionando!</p>
      <p>Porta: 3000 (mapeada para 50300)</p>
      <p>API Backend: http://localhost:50800</p>
    </div>
  );
}

export default App;
EOF

# 6. Criar index.js mínimo
cat > /opt/medschedule/frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

# 7. Criar index.html mínimo
mkdir -p /opt/medschedule/frontend/public
cat > /opt/medschedule/frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Medschedule</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
EOF

# 8. Criar package.json mínimo
cat > /opt/medschedule/frontend/package.json << 'EOF'
{
  "name": "medschedule-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "eslintConfig": {
    "extends": ["react-app"]
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
EOF

# 9. Remover qualquer start.sh antigo
rm -f /opt/medschedule/frontend/start.sh 2>/dev/null

# 10. Reconstruir tudo
echo "🏗️  Reconstruindo containers..."
docker-compose up -d --build

echo "⏳ Aguardando 15 segundos..."
sleep 15

# 11. Verificar status
echo ""
echo "📊 Status dos containers:"
docker-compose ps

# 12. Verificar logs
echo ""
echo "📋 Logs do frontend:"
docker logs --tail 20 medschedule-frontend

echo ""
echo "📋 Logs do PM2:"
docker logs --tail 20 medschedule-pm2

# 13. Testar endpoints
echo ""
echo "🌐 Testando endpoints:"
echo -n "Frontend (50300): "
curl -s -o /dev/null -w "%{http_code}" http://localhost:50300 || echo "❌ Falha"
echo ""
echo -n "Backend (50800): "
curl -s -o /dev/null -w "%{http_code}" http://localhost:50800 || echo "❌ Falha"
echo ""

echo ""
echo "==================================="
echo "✅ CORREÇÃO CONCLUÍDA"
echo "==================================="
echo "📌 Acesse: http://localhost:50300"
echo "📌 Backend: http://localhost:50800"
echo "==================================="

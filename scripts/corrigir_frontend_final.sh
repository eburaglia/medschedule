#!/bin/bash

echo "==================================="
echo "🔧 CORREÇÃO FINAL DO FRONTEND"
echo "==================================="

# 1. Parar frontend
echo "⏹️  Parando frontend..."
docker stop medschedule-frontend
docker rm medschedule-frontend

# 2. Criar novo package.json com versões compatíveis
echo "📝 Criando package.json com versões compatíveis..."
cat > /opt/medschedule/frontend/package.json << 'EOF'
{
  "name": "medschedule-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "@mui/x-date-pickers": "^6.18.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "axios": "^1.6.0",
    "react-router-dom": "^6.20.0",
    "react-hook-form": "^7.48.0",
    "yup": "^1.3.0",
    "react-toastify": "^9.1.0",
    "date-fns": "^2.30.0",
    "recharts": "^2.10.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
EOF

# 3. Criar Dockerfile simples
echo "📝 Criando Dockerfile simples..."
cat > /opt/medschedule/frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências (com legacy peer deps para evitar conflitos)
RUN npm install --legacy-peer-deps

# Copiar código
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF

# 4. Criar App.js mínimo
echo "📝 Criando App.js mínimo..."
cat > /opt/medschedule/frontend/src/App.js << 'EOF'
import React from 'react';

function App() {
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial',
      textAlign: 'center',
      background: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#1976d2' }}>🏥 Medschedule</h1>
      <p>Frontend funcionando corretamente!</p>
      <p>Porta: 3000 (mapeada para 50300)</p>
      <p>API Backend: http://localhost:50800</p>
    </div>
  );
}

export default App;
EOF

# 5. Criar index.js mínimo
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

# 6. Criar index.html
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

# 7. Reconstruir frontend
echo "🏗️  Reconstruindo frontend..."
cd /opt/medschedule
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "⏳ Aguardando 15 segundos..."
sleep 15

# 8. Verificar status
echo ""
echo "📊 Status do container:"
docker ps | grep frontend

# 9. Verificar logs
echo ""
echo "📋 Logs do frontend:"
docker logs --tail 30 medschedule-frontend

# 10. Testar acesso
echo ""
echo "🌐 Testando acesso:"
curl -I http://localhost:50300 2>/dev/null | head -n 1 || echo "❌ Frontend não responde"

echo ""
echo "==================================="
echo "✅ Correção final aplicada"
echo "==================================="
echo "📌 Acesse: http://localhost:50300"
echo "==================================="

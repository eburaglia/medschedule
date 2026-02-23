#!/bin/bash

echo "==================================="
echo "🔧 CORREÇÃO COMPLETA DO FRONTEND"
echo "==================================="

# 1. Parar frontend
echo "⏹️  Parando frontend..."
docker stop medschedule-frontend
docker rm medschedule-frontend

# 2. Criar package.json com versões fixas
echo "📝 Criando package.json com versões fixas..."
cat > /opt/medschedule/frontend/package.json << 'EOF'
{
  "name": "medschedule-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-scripts": "5.0.1",
    "@mui/material": "5.14.0",
    "@mui/icons-material": "5.14.0",
    "@mui/x-date-pickers": "6.18.0",
    "@emotion/react": "11.11.0",
    "@emotion/styled": "11.11.0",
    "axios": "1.6.0",
    "react-router-dom": "6.20.0",
    "react-hook-form": "7.48.0",
    "yup": "1.3.0",
    "react-toastify": "9.1.0",
    "date-fns": "2.30.0",
    "recharts": "2.10.0",
    "ajv": "8.12.0",
    "ajv-keywords": "5.1.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
EOF

# 3. Criar Dockerfile otimizado
echo "📝 Criando Dockerfile otimizado..."
cat > /opt/medschedule/frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências com cache limpo
RUN npm cache clean --force && \
    npm install --legacy-peer-deps

# Copiar código
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF

# 4. Reconstruir
echo "🏗️  Reconstruindo frontend..."
cd /opt/medschedule
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "⏳ Aguardando 20 segundos..."
sleep 20

# 5. Verificar logs
echo ""
echo "📋 Logs do frontend:"
docker logs --tail 50 medschedule-frontend

# 6. Se ainda houver erro, executar correção manual
echo ""
echo "🔍 Verificando se precisa de correção manual..."
if docker logs medschedule-frontend 2>&1 | grep -q "Cannot find module"; then
    echo "⚠️  Ainda há erros. Aplicando correção manual..."
    
    docker exec medschedule-frontend sh -c "
        cd /app &&
        npm install ajv@8.12.0 ajv-keywords@5.1.0 --save --legacy-peer-deps &&
        npm install --legacy-peer-deps
    "
    
    docker restart medschedule-frontend
    sleep 10
    
    echo ""
    echo "📋 Logs após correção manual:"
    docker logs --tail 30 medschedule-frontend
fi

# 7. Testar acesso
echo ""
echo "🌐 Testando acesso:"
curl -I http://localhost:50300 2>/dev/null | head -n 1

echo ""
echo "==================================="
echo "✅ Processo concluído"
echo "==================================="
echo "📌 Acesse: http://localhost:50300"
echo "==================================="

#!/bin/bash

echo "==================================="
echo "🔧 Corrigindo problema do AJV"
echo "==================================="

# 1. Entrar no container
echo "📦 Entrando no container para corrigir..."

# Instalar a versão correta do ajv
docker exec -it medschedule-frontend sh -c "
    cd /app &&
    echo 'Removendo node_modules...' &&
    rm -rf node_modules package-lock.json &&
    echo 'Instalando ajv na versão correta...' &&
    npm install ajv@8.12.0 ajv-keywords@5.1.0 --save --legacy-peer-deps &&
    echo 'Instalando todas as dependências...' &&
    npm install --legacy-peer-deps
"

# 2. Reiniciar o container
echo "🔄 Reiniciando frontend..."
docker restart medschedule-frontend

echo "⏳ Aguardando 10 segundos..."
sleep 10

# 3. Verificar logs
echo ""
echo "📋 Logs após correção:"
docker logs --tail 30 medschedule-frontend

# 4. Testar acesso
echo ""
echo "🌐 Testando acesso:"
curl -I http://localhost:50300 2>/dev/null | head -n 1

echo ""
echo "==================================="
echo "✅ Correção do AJV aplicada"
echo "==================================="

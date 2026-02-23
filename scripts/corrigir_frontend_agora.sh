#!/bin/bash

echo "==================================="
echo "🔧 Corrigindo Frontend Agora"
echo "==================================="

# Parar e remover container
echo "⏹️  Parando frontend..."
docker stop medschedule-frontend 2>/dev/null
docker rm medschedule-frontend 2>/dev/null

# Reconstruir com o Dockerfile corrigido
echo "🏗️  Reconstruindo imagem..."
docker-compose build --no-cache frontend

# Iniciar
echo "🚀 Iniciando container..."
docker-compose up -d frontend

echo "⏳ Aguardando 5 segundos..."
sleep 5

# Verificar se o container está rodando
echo ""
echo "📊 Status do container:"
docker ps | grep frontend

# Verificar logs
echo ""
echo "📋 Logs do container:"
docker logs --tail 30 medschedule-frontend

# Verificar se o start.sh existe dentro do container
echo ""
echo "🔍 Verificando arquivo start.sh:"
docker exec medschedule-frontend ls -la /app/start.sh 2>/dev/null || echo "❌ start.sh não encontrado!"

echo ""
echo "==================================="
echo "✅ Processo concluído"
echo "==================================="

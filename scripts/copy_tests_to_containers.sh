#!/bin/bash

echo "==================================="
echo "📋 Copiando testes para os containers"
echo "==================================="

# Backend
echo ""
echo "📦 Copiando testes do backend..."
if [ -d "/opt/medschedule/backend/tests" ]; then
    docker cp /opt/medschedule/backend/tests/. medschedule-backend:/app/tests/
    echo "✅ Testes do backend copiados"
else
    echo "❌ Diretório /opt/medschedule/backend/tests não encontrado"
fi

# Frontend
echo ""
echo "🎨 Copiando testes do frontend..."
if [ -d "/opt/medschedule/frontend/src/__tests__" ]; then
    docker cp /opt/medschedule/frontend/src/__tests__/. medschedule-frontend:/app/src/__tests__/
    echo "✅ Testes do frontend copiados"
else
    echo "❌ Diretório /opt/medschedule/frontend/src/__tests__ não encontrado"
fi

if [ -d "/opt/medschedule/frontend/src/mocks" ]; then
    docker cp /opt/medschedule/frontend/src/mocks/. medschedule-frontend:/app/src/mocks/
    echo "✅ Mocks do frontend copiados"
fi

if [ -f "/opt/medschedule/frontend/src/setupTests.js" ]; then
    docker cp /opt/medschedule/frontend/src/setupTests.js medschedule-frontend:/app/src/
    echo "✅ setupTests.js copiado"
fi

echo ""
echo "✅ Todos os arquivos copiados!"

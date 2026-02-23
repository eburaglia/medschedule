#!/bin/bash

echo "==================================="
echo "🔧 Configurando Ambiente de Testes"
echo "==================================="

# Criar diretório de testes no backend
docker exec medschedule-backend bash -c "
    mkdir -p /app/tests &&
    mkdir -p /app/test_reports &&
    touch /app/tests/__init__.py
"

# Criar diretório de testes no frontend
docker exec medschedule-frontend bash -c "
    mkdir -p /app/src/__tests__ &&
    mkdir -p /app/src/mocks
"

echo "✅ Estrutura de testes criada nos containers"

# Verificar se os arquivos de teste existem no host
echo ""
echo "📋 Verificando arquivos de teste..."

if [ ! -f "/opt/medschedule/backend/tests/conftest.py" ]; then
    echo "⚠️  Arquivos de teste do backend não encontrados no host"
    echo "   Certifique-se de que os arquivos foram criados em:"
    echo "   /opt/medschedule/backend/tests/"
fi

if [ ! -f "/opt/medschedule/frontend/src/setupTests.js" ]; then
    echo "⚠️  Arquivos de teste do frontend não encontrados no host"
    echo "   Certifique-se de que os arquivos foram criados em:"
    echo "   /opt/medschedule/frontend/src/"
fi

echo ""
echo "📝 Para copiar os arquivos de teste para os containers:"
echo "   docker cp /opt/medschedule/backend/tests/. medschedule-backend:/app/tests/"
echo "   docker cp /opt/medschedule/frontend/src/__tests__/. medschedule-frontend:/app/src/__tests__/"
echo "   docker cp /opt/medschedule/frontend/src/mocks/. medschedule-frontend:/app/src/mocks/"
echo "   docker cp /opt/medschedule/frontend/src/setupTests.js medschedule-frontend:/app/src/"

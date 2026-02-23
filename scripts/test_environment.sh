#!/bin/bash

echo "==================================="
echo "🔍 Verificando Ambiente de Testes"
echo "==================================="

# Verificar containers
echo ""
echo "📦 Status dos containers:"
docker ps | grep medschedule

# Verificar Python no backend
echo ""
echo "🐍 Python no backend:"
docker exec medschedule-backend python --version
docker exec medschedule-backend pip list | grep -E "pytest|httpx|factory"

# Verificar Node no frontend
echo ""
echo "🟢 Node no frontend:"
docker exec medschedule-frontend node --version
docker exec medschedule-frontend npm list --depth=0 | grep -E "testing-library"

# Verificar diretórios de teste
echo ""
echo "📁 Diretórios de teste:"
docker exec medschedule-backend ls -la /app/tests/ 2>/dev/null || echo "   Backend: diretório de testes não encontrado"
docker exec medschedule-frontend ls -la /app/src/__tests__ 2>/dev/null || echo "   Frontend: diretório de testes não encontrado"

echo ""
echo "==================================="
echo "✅ Verificação concluída"
echo "==================================="

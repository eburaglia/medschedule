#!/bin/bash

echo "==================================="
echo "🧪 Executando Testes do Medschedule"
echo "   (Dentro dos Containers Docker)"
echo "==================================="

# Verificar se os containers estão rodando
if ! docker ps | grep -q medschedule-backend; then
    echo "❌ Container do backend não está rodando."
    echo "   Execute primeiro: ./scripts/setup.sh"
    exit 1
fi

# Testes do Backend
echo ""
echo "📦 Testando Backend (dentro do container)..."

# Instalar dependências de teste no container
docker exec medschedule-backend bash -c "
    pip install --no-cache-dir pytest pytest-cov pytest-asyncio httpx factory-boy faker pytest-mock
"

# Executar testes no container
docker exec medschedule-backend bash -c "
    cd /app && 
    mkdir -p test_reports &&
    PYTHONPATH=/app pytest tests/ -v --cov=app --cov-report=term --cov-report=html:test_reports/coverage_html --cov-report=xml:test_reports/coverage.xml
"

BACKEND_EXIT_CODE=$?

# Testes do Frontend
echo ""
echo "🎨 Testando Frontend (dentro do container)..."

# Instalar dependências de teste no container do frontend
docker exec medschedule-frontend bash -c "
    cd /app &&
    npm install --silent --no-audit --no-fund &&
    npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
"

# Executar testes no container
docker exec medschedule-frontend bash -c "
    cd /app && 
    CI=true npm test -- --coverage --watchAll=false
"

FRONTEND_EXIT_CODE=$?

# Resultados
echo ""
echo "==================================="
echo "📊 Resultados dos Testes"
echo "==================================="

if [ $BACKEND_EXIT_CODE -eq 0 ]; then
    echo "✅ Backend: Todos os testes passaram!"
else
    echo "❌ Backend: Alguns testes falharam (código: $BACKEND_EXIT_CODE)"
fi

if [ $FRONTEND_EXIT_CODE -eq 0 ]; then
    echo "✅ Frontend: Todos os testes passaram!"
else
    echo "❌ Frontend: Alguns testes falharam (código: $FRONTEND_EXIT_CODE)"
fi

echo ""
echo "📈 Relatórios de cobertura:"
echo "   Backend: docker exec medschedule-backend cat /app/test_reports/coverage_html/index.html"
echo "   Frontend: docker exec medschedule-frontend cat /app/coverage/lcov-report/index.html"

# Copiar relatórios para o host (opcional)
echo ""
echo "📋 Deseja copiar os relatórios para o host? (s/N)"
read -r copy_reports

if [[ "$copy_reports" =~ ^[Ss]$ ]]; then
    mkdir -p /opt/medschedule/test_reports/backend
    mkdir -p /opt/medschedule/test_reports/frontend
    
    docker cp medschedule-backend:/app/test_reports/coverage_html/. /opt/medschedule/test_reports/backend/
    docker cp medschedule-frontend:/app/coverage/. /opt/medschedule/test_reports/frontend/
    
    echo "✅ Relatórios copiados para:"
    echo "   Backend: /opt/medschedule/test_reports/backend/index.html"
    echo "   Frontend: /opt/medschedule/test_reports/frontend/lcov-report/index.html"
fi

exit $((BACKEND_EXIT_CODE + FRONTEND_EXIT_CODE))

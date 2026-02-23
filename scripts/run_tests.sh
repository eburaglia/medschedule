#!/bin/bash

echo "==================================="
echo "🧪 Executando Testes do Medschedule"
echo "==================================="

# Testes do Backend
echo ""
echo "📦 Testando Backend..."
cd /opt/medschedule/backend

# Instalar dependências de teste
pip install -r requirements-test.txt

# Executar testes com cobertura
pytest tests/ -v --cov=app --cov-report=term --cov-report=html:coverage_report

BACKEND_EXIT_CODE=$?

# Testes do Frontend
echo ""
echo "🎨 Testando Frontend..."
cd /opt/medschedule/frontend

# Instalar dependências
npm install --silent

# Executar testes
npm test -- --coverage --watchAll=false

FRONTEND_EXIT_CODE=$?

# Resultados
echo ""
echo "==================================="
echo "📊 Resultados dos Testes"
echo "==================================="

if [ $BACKEND_EXIT_CODE -eq 0 ]; then
  echo "✅ Backend: Todos os testes passaram!"
else
  echo "❌ Backend: Alguns testes falharam"
fi

if [ $FRONTEND_EXIT_CODE -eq 0 ]; then
  echo "✅ Frontend: Todos os testes passaram!"
else
  echo "❌ Frontend: Alguns testes falharam"
fi

echo ""
echo "📈 Relatórios de cobertura:"
echo "   Backend: /opt/medschedule/backend/coverage_report/index.html"
echo "   Frontend: /opt/medschedule/frontend/coverage/lcov-report/index.html"

exit $((BACKEND_EXIT_CODE + FRONTEND_EXIT_CODE))

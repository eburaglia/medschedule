#!/bin/bash

echo "==================================="
echo "🔄 Reconstruindo containers com dependências de teste"
echo "==================================="

# Parar containers
echo "⏹️  Parando containers..."
docker-compose down

# Reconstruir com as novas dependências
echo "🏗️  Reconstruindo containers..."
docker-compose up -d --build

echo "⏳ Aguardando inicialização..."
sleep 10

echo ""
echo "✅ Containers reconstruídos com sucesso!"
echo ""
echo "📋 Para copiar os testes para os containers:"
echo "   ./scripts/copy_tests_to_containers.sh"
echo ""
echo "🧪 Para executar os testes:"
echo "   ./scripts/run_tests_docker.sh"

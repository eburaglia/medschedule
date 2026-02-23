#!/bin/bash

echo "==================================="
echo "🚀 Medschedule - Setup Automático"
echo "==================================="

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale o Docker primeiro."
    exit 1
fi

# Verificar portas
echo "🔍 Verificando portas..."
for port in 50300 50800 54320 50301; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Porta $port já está em uso"
        exit 1
    fi
done
echo "✅ Todas as portas estão disponíveis"

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p backend/app
mkdir -p frontend/src
mkdir -p infra/pm2

# Build e execução
echo "🐳 Iniciando containers..."
docker-compose up --build -d

echo "⏳ Aguardando inicialização..."
sleep 10

# Mostrar status
echo "📊 Status dos containers:"
docker-compose ps

echo ""
echo "==================================="
echo "✅ Medschedule pronto!"
echo "==================================="
echo "📌 Acessos:"
echo "   Frontend: http://localhost:50300"
echo "   Backend API: http://localhost:50800"
echo "   Documentação: http://localhost:50800/docs"
echo "   PostgreSQL: localhost:54320"
echo "   PM2 Monitor: http://localhost:50301"
echo ""
echo "📝 Comandos úteis:"
echo "   docker-compose logs -f     # Ver logs"
echo "   docker-compose down         # Parar sistema"
echo "   docker-compose restart      # Reiniciar"
echo "==================================="

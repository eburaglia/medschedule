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
sleep 15

# Inicializar roles no banco de dados
echo "🎯 Inicializando roles do sistema..."
docker exec medschedule-backend python -c "
from app.database import SessionLocal
from app.models import Role

db = SessionLocal()
default_roles = [
    {'name': 'super_admin', 'description': 'Acesso total ao sistema', 'is_system_role': True},
    {'name': 'tenant_admin', 'description': 'Administrador do tenant', 'is_system_role': True},
    {'name': 'manager', 'description': 'Gerente', 'is_system_role': True},
    {'name': 'user', 'description': 'Usuário comum', 'is_system_role': True},
]

for role_data in default_roles:
    role = db.query(Role).filter(Role.name == role_data['name']).first()
    if not role:
        role = Role(**role_data)
        db.add(role)
        print(f'✅ Role criada: {role_data[\"name\"]}')
db.commit()
db.close()
"

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
echo "📝 Endpoints disponíveis:"
echo "   POST  /api/v1/auth/token      # Login"
echo "   POST  /api/v1/auth/register    # Registro"
echo "   GET   /api/v1/users/me         # Meus dados"
echo "   GET   /api/v1/tenants          # Listar tenants"
echo "   POST  /api/v1/tenants          # Criar tenant"
echo "   GET   /api/v1/appointments     # Listar agendamentos"
echo ""
echo "📝 Comandos úteis:"
echo "   docker-compose logs -f     # Ver logs"
echo "   docker-compose down         # Parar sistema"
echo "   docker-compose restart      # Reiniciar"
echo "==================================="

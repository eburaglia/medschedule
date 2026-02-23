from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth, tenants, users, roles, appointments, categories, products

# Criar tabelas no banco de dados
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Medschedule - Sistema de Agendamento Multi-tenant",
    description="API para sistema de agendamento com arquitetura multi-tenant",
    version="0.2.0"
)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:50300",
        "http://127.0.0.1:50300",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(roles.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
# Incluir novas rotas
app.include_router(categories.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "Medschedule API",
        "version": "0.4.0",
        "status": "online",
        "endpoints": {
            "auth": "/api/v1/auth",
            "tenants": "/api/v1/tenants",
            "users": "/api/v1/users",
            "roles": "/api/v1/roles",
            "appointments": "/api/v1/appointments",
            "categories": "/api/v1/categories",
            "products": "/api/v1/products"  # Novo endpoint

        },
        "ports": {
            "backend": 50800,
            "frontend": 50300,
            "postgres": 54320,
            "pm2": 50301
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}




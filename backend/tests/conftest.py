import pytest
import asyncio
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import uuid

from app.main import app
from app.database import Base, get_db
from app.models import User, Tenant, Role, Category, Product, Schedule
from app.auth import get_password_hash
from app.config import settings

# Banco de dados de teste
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    """Cria engine do banco de dados para testes"""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine) -> Generator:
    """Cria sessão do banco de dados para cada teste"""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Cria cliente de teste com banco de dados isolado"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_tenant(db_session):
    """Cria tenant para testes"""
    tenant = Tenant(
        name="Clínica Teste",
        subdomain="teste",
        is_active=True
    )
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)
    return tenant

@pytest.fixture(scope="function")
def test_role_admin(db_session):
    """Cria role admin para testes"""
    role = Role(
        name="tenant_admin",
        description="Administrador do Tenant",
        is_system_role=True
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role

@pytest.fixture(scope="function")
def test_role_user(db_session):
    """Cria role user para testes"""
    role = Role(
        name="user",
        description="Usuário comum",
        is_system_role=True
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role

@pytest.fixture(scope="function")
def test_admin_user(db_session, test_tenant, test_role_admin):
    """Cria usuário admin para testes"""
    hashed_password = get_password_hash("test123")
    user = User(
        id=uuid.uuid4(),
        name="Admin Teste",
        email="admin@teste.com",
        cpf="12345678901",
        birth_date=datetime.now() - timedelta(days=365*30),
        hashed_password=hashed_password,
        user_type="prestador",
        status="active",
        tenant_id=test_tenant.id,
        is_super_admin=False
    )
    user.roles.append(test_role_admin)
    user.tenants.append(test_tenant)
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_regular_user(db_session, test_tenant, test_role_user):
    """Cria usuário comum para testes"""
    hashed_password = get_password_hash("test123")
    user = User(
        id=uuid.uuid4(),
        name="Usuário Teste",
        email="user@teste.com",
        cpf="98765432101",
        birth_date=datetime.now() - timedelta(days=365*25),
        hashed_password=hashed_password,
        user_type="usuario_final",
        status="active",
        tenant_id=test_tenant.id,
        is_super_admin=False
    )
    user.roles.append(test_role_user)
    user.tenants.append(test_tenant)
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_super_admin(db_session):
    """Cria super admin para testes"""
    hashed_password = get_password_hash("admin123")
    user = User(
        id=uuid.uuid4(),
        name="Super Admin",
        email="super@admin.com",
        cpf="11122233344",
        birth_date=datetime.now() - timedelta(days=365*35),
        hashed_password=hashed_password,
        user_type="prestador",
        status="active",
        tenant_id=None,
        is_super_admin=True
    )
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_category(db_session, test_tenant, test_admin_user):
    """Cria categoria para testes"""
    category = Category(
        id=uuid.uuid4(),
        name="Consultas",
        description="Consultas médicas",
        status="active",
        created_by_id=test_admin_user.id,
        updated_by_id=test_admin_user.id
    )
    category.tenants.append(test_tenant)
    
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category

@pytest.fixture(scope="function")
def test_product(db_session, test_tenant, test_admin_user, test_category):
    """Cria produto para testes"""
    product = Product(
        id=uuid.uuid4(),
        name="Consulta Pediátrica",
        description="Consulta com pediatra",
        price=35000,  # R$ 350,00
        professional_commission=40,
        product_visible_to_end_user=True,
        price_visible_to_end_user=False,
        status="active",
        category_id=test_category.id,
        professional_id=test_admin_user.id,
        tenant_id=test_tenant.id,
        created_by_id=test_admin_user.id,
        updated_by_id=test_admin_user.id
    )
    
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product

@pytest.fixture(scope="function")
def auth_headers(client, test_regular_user):
    """Retorna headers de autenticação"""
    response = client.post("/api/v1/auth/token", data={
        "username": test_regular_user.email,
        "password": "test123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def admin_auth_headers(client, test_admin_user):
    """Retorna headers de autenticação para admin"""
    response = client.post("/api/v1/auth/token", data={
        "username": test_admin_user.email,
        "password": "test123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def super_admin_headers(client, test_super_admin):
    """Retorna headers de autenticação para super admin"""
    response = client.post("/api/v1/auth/token", data={
        "username": test_super_admin.email,
        "password": "admin123"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

import pytest
from fastapi import status

def test_register_user(client, db_session, test_tenant):
    """Testa registro de novo usuário"""
    response = client.post("/api/v1/auth/register", json={
        "name": "Novo Usuário",
        "email": "novo@teste.com",
        "cpf": "12312312345",
        "birth_date": "1990-01-01",
        "password": "senha123",
        "user_type": "usuario_final",
        "tenant_id": test_tenant.id
    })
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "novo@teste.com"
    assert data["status"] == "pending"

def test_register_duplicate_email(client, test_regular_user):
    """Testa registro com email duplicado"""
    response = client.post("/api/v1/auth/register", json={
        "name": "Outro Usuário",
        "email": test_regular_user.email,
        "cpf": "99988877766",
        "birth_date": "1990-01-01",
        "password": "senha123",
        "user_type": "usuario_final"
    })
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response.json()["detail"]

def test_login_success(client, test_regular_user):
    """Testa login com sucesso"""
    response = client.post("/api/v1/auth/token", data={
        "username": test_regular_user.email,
        "password": "test123"
    })
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password(client, test_regular_user):
    """Testa login com senha errada"""
    response = client.post("/api/v1/auth/token", data={
        "username": test_regular_user.email,
        "password": "senha_errada"
    })
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_login_nonexistent_user(client):
    """Testa login com usuário inexistente"""
    response = client.post("/api/v1/auth/token", data={
        "username": "naoexiste@teste.com",
        "password": "test123"
    })
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_get_current_user(client, auth_headers, test_regular_user):
    """Testa obtenção de usuário atual"""
    response = client.get("/api/v1/users/me", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == test_regular_user.email
    assert data["name"] == test_regular_user.name

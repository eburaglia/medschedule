import pytest
from fastapi import status
import uuid

def test_create_user_by_admin(client, admin_auth_headers, test_tenant):
    """Testa criação de usuário por admin"""
    response = client.post("/api/v1/users", 
        json={
            "name": "Usuário Criado",
            "email": "criado@teste.com",
            "cpf": "11122233345",
            "birth_date": "1985-05-15",
            "password": "senha123",
            "user_type": "usuario_final",
            "tenant_id": test_tenant.id,
            "status": "active"
        },
        headers=admin_auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "criado@teste.com"
    assert data["status"] == "active"

def test_create_user_without_permission(client, auth_headers, test_tenant):
    """Testa criação de usuário sem permissão (usuário comum)"""
    response = client.post("/api/v1/users", 
        json={
            "name": "Sem Permissão",
            "email": "sem@permissao.com",
            "cpf": "66677788899",
            "birth_date": "1985-05-15",
            "password": "senha123",
            "user_type": "usuario_final",
            "tenant_id": test_tenant.id
        },
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_list_users_by_admin(client, admin_auth_headers):
    """Testa listagem de usuários por admin"""
    response = client.get("/api/v1/users", headers=admin_auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) > 0

def test_get_user_by_id(client, admin_auth_headers, test_regular_user):
    """Testa obtenção de usuário por ID"""
    response = client.get(f"/api/v1/users/{test_regular_user.id}", 
                         headers=admin_auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == str(test_regular_user.id)

def test_update_user(client, admin_auth_headers, test_regular_user):
    """Testa atualização de usuário"""
    response = client.put(f"/api/v1/users/{test_regular_user.id}",
        json={
            "name": "Nome Atualizado",
            "nickname": "Apelido"
        },
        headers=admin_auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Nome Atualizado"
    assert data["nickname"] == "Apelido"

def test_delete_user_soft_delete(client, admin_auth_headers, test_regular_user):
    """Testa soft delete de usuário"""
    response = client.delete(f"/api/v1/users/{test_regular_user.id}", 
                           headers=admin_auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    
    # Tentar buscar usuário deletado
    get_response = client.get(f"/api/v1/users/{test_regular_user.id}", 
                            headers=admin_auth_headers)
    assert get_response.status_code == status.HTTP_404_NOT_FOUND

def test_activate_user(client, admin_auth_headers, test_regular_user):
    """Testa ativação de usuário"""
    response = client.post(f"/api/v1/users/{test_regular_user.id}/activate",
                          headers=admin_auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    
    # Verificar status
    get_response = client.get(f"/api/v1/users/{test_regular_user.id}", 
                            headers=admin_auth_headers)
    assert get_response.json()["status"] == "active"

def test_deactivate_user(client, admin_auth_headers, test_regular_user):
    """Testa desativação de usuário"""
    response = client.post(f"/api/v1/users/{test_regular_user.id}/deactivate",
                          headers=admin_auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    
    # Verificar status
    get_response = client.get(f"/api/v1/users/{test_regular_user.id}", 
                            headers=admin_auth_headers)
    assert get_response.json()["status"] == "inactive"

def test_filter_users_by_status(client, admin_auth_headers):
    """Testa filtro de usuários por status"""
    response = client.get("/api/v1/users?status=active", 
                         headers=admin_auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    for user in data:
        assert user["status"] == "active"

def test_filter_users_by_type(client, admin_auth_headers):
    """Testa filtro de usuários por tipo"""
    response = client.get("/api/v1/users?user_type=prestador", 
                         headers=admin_auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    for user in data:
        assert user["user_type"] == "prestador"

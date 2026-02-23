import pytest
from fastapi import status

def test_super_admin_access_all_tenants(client, super_admin_headers):
    """Testa se super admin tem acesso a todos os tenants"""
    response = client.get("/api/v1/tenants", headers=super_admin_headers)
    assert response.status_code == status.HTTP_200_OK

def test_tenant_admin_only_own_tenant(client, admin_auth_headers, test_tenant, another_tenant):
    """Testa se admin do tenant só vê seu próprio tenant"""
    # Tentar acessar outro tenant
    response = client.get(f"/api/v1/tenants/{another_tenant.id}", 
                         headers=admin_auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_regular_user_cannot_create_users(client, auth_headers, test_tenant):
    """Testa se usuário comum não pode criar usuários"""
    response = client.post("/api/v1/users",
        json={
            "name": "Novo Usuário",
            "email": "novo@teste.com",
            "cpf": "12345678901",
            "birth_date": "1990-01-01",
            "password": "senha123",
            "user_type": "usuario_final",
            "tenant_id": test_tenant.id
        },
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_tenant_admin_can_create_users(client, admin_auth_headers, test_tenant):
    """Testa se admin do tenant pode criar usuários"""
    response = client.post("/api/v1/users",
        json={
            "name": "Novo Usuário",
            "email": "novo@teste.com",
            "cpf": "12345678901",
            "birth_date": "1990-01-01",
            "password": "senha123",
            "user_type": "usuario_final",
            "tenant_id": test_tenant.id,
            "status": "active"
        },
        headers=admin_auth_headers
    )
    assert response.status_code == status.HTTP_200_OK

def test_user_can_only_see_own_tenant_data(client, auth_headers, test_tenant, another_tenant):
    """Testa se usuário só vê dados do seu tenant"""
    # Tentar listar usuários de outro tenant
    response = client.get(f"/api/v1/users?tenant_id={another_tenant.id}", 
                         headers=auth_headers)
    
    # Deve retornar lista vazia ou 403
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]
    
    if response.status_code == status.HTTP_200_OK:
        data = response.json()
        assert len(data) == 0

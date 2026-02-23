import pytest
from fastapi import status
import uuid

def test_create_category(client, super_admin_headers, test_tenant):
    """Testa criação de categoria"""
    response = client.post("/api/v1/categories",
        json={
            "name": "Nova Categoria",
            "description": "Descrição da categoria",
            "tenant_ids": [test_tenant.id]
        },
        headers=super_admin_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Nova Categoria"
    assert data["status"] == "active"

def test_create_duplicate_category(client, super_admin_headers, test_category):
    """Testa criação de categoria com nome duplicado"""
    response = client.post("/api/v1/categories",
        json={
            "name": test_category.name,
            "tenant_ids": []
        },
        headers=super_admin_headers
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_list_categories(client, auth_headers):
    """Testa listagem de categorias"""
    response = client.get("/api/v1/categories", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) > 0

def test_get_category_by_id(client, auth_headers, test_category):
    """Testa obtenção de categoria por ID"""
    response = client.get(f"/api/v1/categories/{test_category.id}", 
                         headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == str(test_category.id)

def test_update_category(client, super_admin_headers, test_category):
    """Testa atualização de categoria"""
    response = client.put(f"/api/v1/categories/{test_category.id}",
        json={
            "name": "Categoria Atualizada",
            "description": "Nova descrição"
        },
        headers=super_admin_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Categoria Atualizada"
    assert data["description"] == "Nova descrição"

def test_delete_category(client, super_admin_headers, test_category):
    """Testa soft delete de categoria"""
    response = client.delete(f"/api/v1/categories/{test_category.id}", 
                           headers=super_admin_headers)
    
    assert response.status_code == status.HTTP_200_OK

def test_filter_categories_by_status(client, auth_headers):
    """Testa filtro de categorias por status"""
    response = client.get("/api/v1/categories?status=active", 
                         headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    for cat in data:
        assert cat["status"] == "active"

def test_assign_category_to_tenant(client, super_admin_headers, test_category, test_tenant):
    """Testa associação de categoria a tenant"""
    response = client.post(
        f"/api/v1/categories/{test_category.id}/tenants/{test_tenant.id}",
        headers=super_admin_headers
    )
    
    assert response.status_code == status.HTTP_200_OK

def test_remove_category_from_tenant(client, super_admin_headers, test_category, test_tenant):
    """Testa remoção de categoria de tenant"""
    response = client.delete(
        f"/api/v1/categories/{test_category.id}/tenants/{test_tenant.id}",
        headers=super_admin_headers
    )
    
    assert response.status_code == status.HTTP_200_OK

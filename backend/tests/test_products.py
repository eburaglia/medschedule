import pytest
from fastapi import status
import uuid

def test_create_product(client, admin_auth_headers, test_tenant, test_category, test_admin_user):
    """Testa criação de produto"""
    response = client.post("/api/v1/products",
        json={
            "name": "Novo Produto",
            "description": "Descrição do produto",
            "category_id": str(test_category.id),
            "professional_id": str(test_admin_user.id),
            "tenant_id": test_tenant.id,
            "price": 50000,
            "professional_commission": 30,
            "product_visible_to_end_user": True,
            "price_visible_to_end_user": False
        },
        headers=admin_auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Novo Produto"
    assert data["professional_commission"] == 30

def test_create_duplicate_product(client, admin_auth_headers, test_product):
    """Testa criação de produto com nome duplicado no mesmo tenant"""
    response = client.post("/api/v1/products",
        json={
            "name": test_product.name,
            "category_id": str(test_product.category_id),
            "professional_id": str(test_product.professional_id),
            "tenant_id": test_product.tenant_id,
            "professional_commission": 30
        },
        headers=admin_auth_headers
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_list_products(client, auth_headers):
    """Testa listagem de produtos"""
    response = client.get("/api/v1/products", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) > 0

def test_get_product_by_id(client, auth_headers, test_product):
    """Testa obtenção de produto por ID"""
    response = client.get(f"/api/v1/products/{test_product.id}", 
                         headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == str(test_product.id)

def test_update_product(client, admin_auth_headers, test_product):
    """Testa atualização de produto"""
    response = client.put(f"/api/v1/products/{test_product.id}",
        json={
            "name": "Produto Atualizado",
            "price": 60000,
            "professional_commission": 35
        },
        headers=admin_auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Produto Atualizado"
    assert data["price"] == 60000
    assert data["professional_commission"] == 35

def test_delete_product(client, admin_auth_headers, test_product):
    """Testa soft delete de produto"""
    response = client.delete(f"/api/v1/products/{test_product.id}", 
                           headers=admin_auth_headers)
    
    assert response.status_code == status.HTTP_200_OK

def test_filter_products_by_category(client, auth_headers, test_category):
    """Testa filtro de produtos por categoria"""
    response = client.get(f"/api/v1/products?category_id={test_category.id}", 
                         headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    for product in data:
        assert product["category_id"] == str(test_category.id)

def test_filter_products_by_professional(client, auth_headers, test_admin_user):
    """Testa filtro de produtos por profissional"""
    response = client.get(f"/api/v1/products?professional_id={test_admin_user.id}", 
                         headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    for product in data:
        assert product["professional_id"] == str(test_admin_user.id)

def test_public_products_endpoint(client, test_tenant):
    """Testa endpoint público de produtos"""
    response = client.get(f"/api/v1/products/public/{test_tenant.id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    for product in data:
        assert "price" in product or "professional_name" in product

def test_products_by_professional(client, auth_headers, test_admin_user):
    """Testa listagem de produtos por profissional"""
    response = client.get(f"/api/v1/products/by-professional/{test_admin_user.id}", 
                         headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    for product in data:
        assert product["professional_id"] == str(test_admin_user.id)

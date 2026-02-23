import pytest
from fastapi import status
from datetime import datetime, timedelta
import uuid

def test_create_schedule(client, admin_auth_headers, test_tenant, test_admin_user, 
                         test_regular_user, test_category, test_product):
    """Testa criação de agendamento"""
    start_date = (datetime.now() + timedelta(days=1)).isoformat()
    end_date = (datetime.now() + timedelta(days=1, hours=1)).isoformat()
    
    response = client.post("/api/v1/schedules",
        json={
            "provider_id": str(test_admin_user.id),
            "user_id": str(test_regular_user.id),
            "category_id": str(test_category.id),
            "product_id": str(test_product.id),
            "tenant_id": test_tenant.id,
            "start_date": start_date,
            "end_date": end_date,
            "service_price": test_product.price
        },
        headers=admin_auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["provider_id"] == str(test_admin_user.id)
    assert data["user_id"] == str(test_regular_user.id)

def test_create_conflicting_schedule(client, admin_auth_headers, test_tenant, 
                                    test_admin_user, test_regular_user, 
                                    test_category, test_product):
    """Testa criação de agendamento com conflito de horário"""
    # Primeiro agendamento
    start_date = (datetime.now() + timedelta(days=2)).isoformat()
    end_date = (datetime.now() + timedelta(days=2, hours=1)).isoformat()
    
    response1 = client.post("/api/v1/schedules",
        json={
            "provider_id": str(test_admin_user.id),
            "user_id": str(test_regular_user.id),
            "category_id": str(test_category.id),
            "product_id": str(test_product.id),
            "tenant_id": test_tenant.id,
            "start_date": start_date,
            "end_date": end_date
        },
        headers=admin_auth_headers
    )
    assert response1.status_code == status.HTTP_200_OK
    
    # Segundo agendamento no mesmo horário
    response2 = client.post("/api/v1/schedules",
        json={
            "provider_id": str(test_admin_user.id),
            "user_id": str(test_regular_user.id),
            "category_id": str(test_category.id),
            "product_id": str(test_product.id),
            "tenant_id": test_tenant.id,
            "start_date": start_date,
            "end_date": end_date
        },
        headers=admin_auth_headers
    )
    
    assert response2.status_code == status.HTTP_409_CONFLICT

def test_list_schedules(client, auth_headers):
    """Testa listagem de agendamentos"""
    response = client.get("/api/v1/schedules", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)

def test_get_schedule_by_id(client, auth_headers, test_schedule):
    """Testa obtenção de agendamento por ID"""
    response = client.get(f"/api/v1/schedules/{test_schedule.id}", 
                         headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == str(test_schedule.id)

def test_update_schedule(client, admin_auth_headers, test_schedule):
    """Testa atualização de agendamento"""
    new_start = (datetime.now() + timedelta(days=3)).isoformat()
    new_end = (datetime.now() + timedelta(days=3, hours=1)).isoformat()
    
    response = client.put(f"/api/v1/schedules/{test_schedule.id}",
        json={
            "start_date": new_start,
            "end_date": new_end,
            "service_price": 40000
        },
        headers=admin_auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["service_price"] == 40000

def test_cancel_schedule(client, admin_auth_headers, test_schedule):
    """Testa cancelamento de agendamento"""
    response = client.post(f"/api/v1/schedules/{test_schedule.id}/cancel",
                          headers=admin_auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    
    # Verificar status
    get_response = client.get(f"/api/v1/schedules/{test_schedule.id}", 
                            headers=admin_auth_headers)
    assert get_response.json()["status"] == "cancelled"

def test_check_availability(client, test_admin_user):
    """Testa verificação de disponibilidade"""
    check_date = (datetime.now() + timedelta(days=4)).date().isoformat()
    
    response = client.post("/api/v1/schedules/check-availability",
        json={
            "provider_id": str(test_admin_user.id),
            "date": check_date,
            "start_time": "09:00",
            "end_time": "10:00"
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "available" in data

def test_get_calendar(client, auth_headers, test_tenant):
    """Testa visualização do calendário"""
    now = datetime.now()
    response = client.get(
        f"/api/v1/schedules/calendar/{test_tenant.id}?year={now.year}&month={now.month}",
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)

def test_get_upcoming_schedules(client, auth_headers, test_tenant):
    """Testa obtenção de próximos agendamentos"""
    response = client.get(f"/api/v1/schedules/upcoming/{test_tenant.id}?days=7",
                         headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)

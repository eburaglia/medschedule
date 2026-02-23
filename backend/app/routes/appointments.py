from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app import schemas, models, auth, deps
from app.database import get_db

router = APIRouter(prefix="/appointments", tags=["Agendamentos"])

@router.get("/", response_model=List[schemas.Appointment])
async def list_appointments(
    tenant_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    current_tenant: Optional[models.Tenant] = Depends(deps.get_tenant_from_header)
):
    """Lista agendamentos (filtrados por tenant)"""
    query = db.query(models.Appointment)
    
    # Filtrar por tenant
    if current_tenant:
        query = query.filter(models.Appointment.tenant_id == current_tenant.id)
    elif tenant_id:
        # Verificar acesso ao tenant
        deps.require_tenant_access(tenant_id, current_user, db)
        query = query.filter(models.Appointment.tenant_id == tenant_id)
    elif not current_user.is_super_admin:
        # Se não for super admin, mostrar apenas tenants do usuário
        tenant_ids = [t.id for t in current_user.tenants]
        query = query.filter(models.Appointment.tenant_id.in_(tenant_ids))
    
    appointments = query.offset(skip).limit(limit).all()
    return appointments

@router.post("/", response_model=schemas.Appointment)
async def create_appointment(
    appointment: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Cria um novo agendamento"""
    # Verificar acesso ao tenant
    deps.require_tenant_access(appointment.tenant_id, current_user, db)
    
    # Verificar se o usuário do agendamento existe
    user = db.query(models.User).filter(models.User.id == appointment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_appointment = models.Appointment(**appointment.model_dump())
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    
    return db_appointment

@router.get("/{appointment_id}", response_model=schemas.Appointment)
async def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Obtém detalhes de um agendamento"""
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Verificar acesso ao tenant
    deps.require_tenant_access(appointment.tenant_id, current_user, db)
    
    return appointment

@router.put("/{appointment_id}", response_model=schemas.Appointment)
async def update_appointment(
    appointment_id: int,
    appointment_update: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Atualiza um agendamento"""
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Verificar acesso ao tenant
    deps.require_tenant_access(appointment.tenant_id, current_user, db)
    
    for key, value in appointment_update.model_dump().items():
        setattr(appointment, key, value)
    
    db.commit()
    db.refresh(appointment)
    return appointment

@router.delete("/{appointment_id}")
async def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Cancela/deleta um agendamento"""
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Verificar acesso ao tenant
    deps.require_tenant_access(appointment.tenant_id, current_user, db)
    
    db.delete(appointment)
    db.commit()
    
    return {"message": "Appointment deleted successfully"}

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime, date

from app import schemas, models, deps, auth
from app.database import get_db
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/schedules", tags=["Agendamentos"])

@router.get("/", response_model=List[schemas.Schedule])
async def list_schedules(
    skip: int = 0,
    limit: int = 100,
    status: Optional[schemas.ScheduleStatus] = None,
    provider_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    category_id: Optional[uuid.UUID] = None,
    product_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    tenant_id: Optional[int] = Query(None, description="Filtrar por tenant"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Lista agendamentos com filtros"""
    query = db.query(models.Schedule).filter(models.Schedule.is_deleted == False)
    
    if status:
        query = query.filter(models.Schedule.status == status)
    if provider_id:
        query = query.filter(models.Schedule.provider_id == provider_id)
    if user_id:
        query = query.filter(models.Schedule.user_id == user_id)
    if category_id:
        query = query.filter(models.Schedule.category_id == category_id)
    if product_id:
        query = query.filter(models.Schedule.product_id == product_id)
    if start_date:
        query = query.filter(models.Schedule.start_date >= start_date)
    if end_date:
        query = query.filter(models.Schedule.end_date <= end_date)
    
    if tenant_id:
        # Verificar acesso ao tenant
        if not current_user.is_super_admin:
            deps.require_tenant_access(tenant_id, current_user, db)
        query = query.filter(models.Schedule.tenant_id == tenant_id)
    else:
        # Se não filtrar por tenant, mostrar apenas dos tenants do usuário
        if not current_user.is_super_admin:
            tenant_ids = [t.id for t in current_user.tenants]
            query = query.filter(models.Schedule.tenant_id.in_(tenant_ids))
    
    schedules = query.order_by(models.Schedule.start_date).offset(skip).limit(limit).all()
    return schedules

@router.post("/", response_model=schemas.Schedule)
async def create_schedule(
    schedule: schemas.ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Cria um novo agendamento"""
    # Verificar permissão
    if not current_user.is_super_admin:
        deps.require_tenant_access(schedule.tenant_id, current_user, db)
    
    service = ScheduleService(db, current_user)
    return service.create_schedule(schedule)

@router.post("/bulk", response_model=List[schemas.Schedule])
async def create_bulk_schedules(
    bulk_data: schemas.BulkScheduleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Cria múltiplos agendamentos baseado em dias da semana"""
    # Verificar permissão
    if not current_user.is_super_admin:
        deps.require_tenant_access(bulk_data.tenant_id, current_user, db)
    
    service = ScheduleService(db, current_user)
    return service.create_bulk_schedules(bulk_data)

@router.get("/calendar/{tenant_id}")
async def get_calendar(
    tenant_id: int,
    year: int = Query(..., description="Ano"),
    month: int = Query(..., description="Mês"),
    provider_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Retorna visão mensal do calendário"""
    # Verificar acesso ao tenant
    if not current_user.is_super_admin:
        deps.require_tenant_access(tenant_id, current_user, db)
    
    service = ScheduleService(db, current_user)
    return service.get_calendar_view(tenant_id, year, month, provider_id)

@router.post("/check-availability")
async def check_availability(
    check: schemas.AvailabilityCheck,
    db: Session = Depends(get_db)
):
    """Verifica disponibilidade de horário"""
    service = ScheduleService(db, None)
    
    start_datetime = datetime.combine(check.date, datetime.strptime(check.start_time, "%H:%M").time())
    end_datetime = datetime.combine(check.date, datetime.strptime(check.end_time, "%H:%M").time())
    
    available = service.check_availability(check.provider_id, start_datetime, end_datetime)
    
    return {
        "available": available,
        "provider_id": str(check.provider_id),
        "date": check.date.isoformat(),
        "start_time": check.start_time,
        "end_time": check.end_time
    }

@router.get("/by-provider/{provider_id}")
async def get_provider_schedules(
    provider_id: uuid.UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Lista agendamentos de um profissional"""
    service = ScheduleService(db, current_user)
    schedules = service.get_schedules_by_provider(provider_id, start_date, end_date)
    
    # Filtrar por acesso do usuário
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        schedules = [s for s in schedules if s.tenant_id in tenant_ids]
    
    return schedules

@router.get("/{schedule_id}", response_model=schemas.Schedule)
async def get_schedule(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Obtém detalhes de um agendamento"""
    service = ScheduleService(db, current_user)
    schedule = service.get_schedule_by_id(schedule_id)
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    # Verificar acesso
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        if schedule.tenant_id not in tenant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem acesso a este agendamento"
            )
    
    return schedule

@router.put("/{schedule_id}", response_model=schemas.Schedule)
async def update_schedule(
    schedule_id: uuid.UUID,
    schedule_update: schemas.ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Atualiza um agendamento"""
    service = ScheduleService(db, current_user)
    
    # Verificar permissão
    schedule = service.get_schedule_by_id(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        if schedule.tenant_id not in tenant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para editar este agendamento"
            )
    
    return service.update_schedule(schedule_id, schedule_update)

@router.post("/{schedule_id}/cancel")
async def cancel_schedule(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Cancela um agendamento"""
    service = ScheduleService(db, current_user)
    
    # Verificar permissão
    schedule = service.get_schedule_by_id(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        if schedule.tenant_id not in tenant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para cancelar este agendamento"
            )
    
    service.cancel_schedule(schedule_id)
    return {"message": "Agendamento cancelado com sucesso"}

@router.post("/import/csv")
async def import_schedules_csv(
    file: UploadFile = File(...),
    tenant_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Importa agendamentos de arquivo CSV"""
    # Verificar permissão
    if not current_user.is_super_admin:
        deps.require_tenant_access(tenant_id, current_user, db)
    
    # Ler arquivo
    content = await file.read()
    
    service = ScheduleService(db, current_user)
    result = service.import_schedules_from_csv(content, tenant_id)
    
    return result

@router.get("/upcoming/{tenant_id}")
async def get_upcoming_schedules(
    tenant_id: int,
    days: int = Query(7, description="Próximos N dias"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Retorna os próximos agendamentos"""
    # Verificar acesso ao tenant
    if not current_user.is_super_admin:
        deps.require_tenant_access(tenant_id, current_user, db)
    
    service = ScheduleService(db, current_user)
    
    start_date = datetime.now()
    end_date = start_date + timedelta(days=days)
    
    schedules = service.get_schedules_by_date_range(tenant_id, start_date, end_date)
    
    return schedules

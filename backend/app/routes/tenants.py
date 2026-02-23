from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import schemas, models, deps
from app.database import get_db

router = APIRouter(prefix="/tenants", tags=["Tenants"])

@router.get("/", response_model=List[schemas.Tenant])
async def list_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_super_admin)
):
    """Lista todos os tenants (apenas super admin)"""
    tenants = db.query(models.Tenant).offset(skip).limit(limit).all()
    return tenants

@router.post("/", response_model=schemas.Tenant)
async def create_tenant(
    tenant: schemas.TenantCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_super_admin)
):
    """Cria um novo tenant (apenas super admin)"""
    # Verificar se subdomain já existe
    db_tenant = db.query(models.Tenant).filter(models.Tenant.subdomain == tenant.subdomain).first()
    if db_tenant:
        raise HTTPException(status_code=400, detail="Subdomain already registered")
    
    db_tenant = models.Tenant(**tenant.model_dump())
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    
    return db_tenant

@router.get("/{tenant_id}", response_model=schemas.Tenant)
async def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Obtém detalhes de um tenant específico"""
    tenant = deps.require_tenant_access(tenant_id, current_user, db)
    return tenant

@router.put("/{tenant_id}", response_model=schemas.Tenant)
async def update_tenant(
    tenant_id: int,
    tenant_update: schemas.TenantCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_super_admin)
):
    """Atualiza um tenant (apenas super admin)"""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    for key, value in tenant_update.model_dump().items():
        setattr(tenant, key, value)
    
    db.commit()
    db.refresh(tenant)
    return tenant

@router.delete("/{tenant_id}")
async def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_super_admin)
):
    """Deleta um tenant (apenas super admin)"""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    db.delete(tenant)
    db.commit()
    
    return {"message": "Tenant deleted successfully"}

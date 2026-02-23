from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import schemas, models, auth, deps
from app.database import get_db

router = APIRouter(prefix="/users", tags=["Usuários"])

@router.get("/", response_model=List[schemas.User])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_super_admin)
):
    """Lista todos os usuários (apenas super admin)"""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.get("/me", response_model=schemas.User)
async def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """Retorna informações do usuário atual"""
    return current_user

@router.post("/{user_id}/roles/{role_id}")
async def assign_role(
    user_id: int,
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_super_admin)
):
    """Atribui uma role a um usuário (apenas super admin)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role not in user.roles:
        user.roles.append(role)
        db.commit()
    
    return {"message": "Role assigned successfully"}

@router.post("/{user_id}/tenants/{tenant_id}")
async def assign_tenant(
    user_id: int,
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_super_admin)
):
    """Atribui um tenant a um usuário (apenas super admin)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if tenant not in user.tenants:
        user.tenants.append(tenant)
        db.commit()
    
    return {"message": "Tenant assigned successfully"}

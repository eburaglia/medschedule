from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import schemas, models, deps
from app.database import get_db

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("/", response_model=List[schemas.Role])
async def list_roles(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_super_admin)
):
    """Lista todas as roles (apenas super admin)"""
    roles = db.query(models.Role).offset(skip).limit(limit).all()
    return roles

@router.post("/", response_model=schemas.Role)
async def create_role(
    role: schemas.RoleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_super_admin)
):
    """Cria uma nova role (apenas super admin)"""
    db_role = db.query(models.Role).filter(models.Role.name == role.name).first()
    if db_role:
        raise HTTPException(status_code=400, detail="Role already exists")
    
    db_role = models.Role(**role.model_dump())
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    
    return db_role

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app import schemas, models, deps
from app.database import get_db
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Usuários"])

@router.get("/", response_model=List[schemas.User])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    tenant_id: Optional[int] = None,
    status: Optional[schemas.UserStatus] = None,
    user_type: Optional[schemas.UserType] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_super_admin)
):
    """Lista usuários com filtros (apenas super admin)"""
    query = db.query(models.User).filter(models.User.is_deleted == False)
    
    if tenant_id:
        query = query.filter(models.User.tenant_id == tenant_id)
    if status:
        query = query.filter(models.User.status == status)
    if user_type:
        query = query.filter(models.User.user_type == user_type)
    
    users = query.offset(skip).limit(limit).all()
    return users

@router.get("/tenant/{tenant_id}", response_model=List[schemas.User])
async def list_tenant_users(
    tenant_id: int,
    skip: int = 0,
    limit: int = 100,
    status: Optional[schemas.UserStatus] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Lista usuários de um tenant específico"""
    # Verificar acesso ao tenant
    deps.require_tenant_access(tenant_id, current_user, db)
    
    query = db.query(models.User).filter(
        models.User.tenant_id == tenant_id,
        models.User.is_deleted == False
    )
    
    if status:
        query = query.filter(models.User.status == status)
    
    users = query.offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=schemas.User)
async def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Cria um novo usuário"""
    # Verificar permissão
    if not current_user.is_super_admin:
        # Verificar se é admin do tenant
        deps.require_tenant_access(user.tenant_id, current_user, db)
        
        # Verificar role
        if not deps.check_user_role(current_user, "tenant_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas tenant_admin pode criar usuários"
            )
    
    service = UserService(db, current_user)
    return service.create_user(user)

@router.get("/me", response_model=schemas.User)
async def get_current_user_info(
    current_user: models.User = Depends(auth.get_current_user)
):
    """Retorna informações do usuário atual"""
    return current_user

@router.get("/{user_id}", response_model=schemas.User)
async def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Obtém detalhes de um usuário específico"""
    service = UserService(db, current_user)
    user = service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar permissão
    if not current_user.is_super_admin and user.tenant_id not in [t.id for t in current_user.tenants]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem acesso a este usuário"
        )
    
    return user

@router.put("/{user_id}", response_model=schemas.User)
async def update_user(
    user_id: uuid.UUID,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Atualiza um usuário"""
    service = UserService(db, current_user)
    
    # Verificar permissão
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if not current_user.is_super_admin and user.tenant_id not in [t.id for t in current_user.tenants]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem acesso a este usuário"
        )
    
    return service.update_user(user_id, user_update)

@router.delete("/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Soft delete de usuário"""
    service = UserService(db, current_user)
    
    # Verificar permissão
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if not current_user.is_super_admin and user.tenant_id not in [t.id for t in current_user.tenants]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem acesso a este usuário"
        )
    
    service.delete_user(user_id)
    return {"message": "Usuário deletado com sucesso"}

@router.post("/import/csv")
async def import_users_csv(
    file: UploadFile = File(...),
    tenant_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Importa usuários de arquivo CSV"""
    # Verificar permissão
    if not current_user.is_super_admin:
        deps.require_tenant_access(tenant_id, current_user, db)
        
        if not deps.check_user_role(current_user, "tenant_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas tenant_admin pode importar usuários"
            )
    
    # Ler arquivo
    content = await file.read()
    
    service = UserService(db, current_user)
    result = service.import_users_from_csv(content, tenant_id)
    
    return result

@router.post("/resolve-duplicate/{user_id}")
async def resolve_duplicate(
    user_id: uuid.UUID,
    action: str = Form(...),  # merge, replace, discard
    import_data: dict = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Resolve duplicatas durante importação"""
    service = UserService(db, current_user)
    
    result = service.resolve_duplicate(user_id, import_data or {}, action)
    return {"message": f"Duplicata resolvida com ação: {action}", "user": result}

@router.post("/{user_id}/activate")
async def activate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Ativa um usuário pendente"""
    service = UserService(db, current_user)
    
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar permissão
    if not current_user.is_super_admin and user.tenant_id not in [t.id for t in current_user.tenants]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem acesso a este usuário"
        )
    
    user.status = schemas.UserStatus.ACTIVE
    user.updated_by_id = current_user.id
    user.updated_at = datetime.now()
    
    db.commit()
    
    return {"message": "Usuário ativado com sucesso"}

@router.post("/{user_id}/deactivate")
async def deactivate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Desativa um usuário"""
    service = UserService(db, current_user)
    
    user = service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar permissão
    if not current_user.is_super_admin and user.tenant_id not in [t.id for t in current_user.tenants]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem acesso a este usuário"
        )
    
    user.status = schemas.UserStatus.INACTIVE
    user.updated_by_id = current_user.id
    user.updated_at = datetime.now()
    
    db.commit()
    
    return {"message": "Usuário desativado com sucesso"}

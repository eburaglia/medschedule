from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional, List
from app import models, auth
from app.database import get_db

# Dependência para obter usuário atual (opcional)
async def get_current_user_optional(
    token: Optional[str] = Depends(auth.oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    if token:
        try:
            return await auth.get_current_user(token, db)
        except:
            return None
    return None

# Dependência para verificar super admin
def require_super_admin(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user

# Dependência para verificar role específica
def require_role(required_role: str):
    def role_checker(current_user: models.User = Depends(auth.get_current_user)):
        if not auth.check_user_role(current_user, required_role) and not current_user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required"
            )
        return current_user
    return role_checker

# Dependência para verificar acesso ao tenant
def require_tenant_access(
    tenant_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not auth.check_tenant_access(current_user, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this tenant"
        )
    
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant or not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or inactive"
        )
    
    return tenant

# Dependência para obter tenant do header
def get_tenant_from_header(
    x_tenant_id: Optional[int] = Header(None, alias="X-Tenant-ID"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
) -> Optional[models.Tenant]:
    if not x_tenant_id:
        return None
    
    return require_tenant_access(x_tenant_id, current_user, db)

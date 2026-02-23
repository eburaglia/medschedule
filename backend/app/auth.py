from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.config import settings

# Configuração de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuração OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Funções de hash de senha
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# Autenticação de usuário
def authenticate_user(db: Session, username: str, password: str):
    user = db.query(models.User).filter(
        (models.User.username == username) | (models.User.email == username)
    ).first()
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

# Criação de token JWT
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

# Obter usuário atual a partir do token
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# Middleware multi-tenant
class TenantMiddleware:
    def __init__(self, tenant_header: str = "X-Tenant-ID"):
        self.tenant_header = tenant_header
    
    def get_current_tenant(self, request, db: Session, current_user: models.User):
        tenant_id = request.headers.get(self.tenant_header)
        
        if not tenant_id:
            return None
        
        # Verificar se usuário tem acesso ao tenant
        if current_user.is_super_admin:
            tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
        else:
            tenant = db.query(models.Tenant).join(models.Tenant.users).filter(
                models.Tenant.id == tenant_id,
                models.User.id == current_user.id
            ).first()
        
        return tenant

# Verificação de permissões
def check_user_role(user: models.User, required_role: str) -> bool:
    """Verifica se usuário tem uma role específica"""
    if user.is_super_admin:
        return True
    return any(role.name == required_role for role in user.roles)

def check_tenant_access(user: models.User, tenant_id: int) -> bool:
    """Verifica se usuário tem acesso a um tenant específico"""
    if user.is_super_admin:
        return True
    return any(tenant.id == tenant_id for tenant in user.tenants)

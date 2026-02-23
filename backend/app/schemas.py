from pydantic import BaseModel, EmailStr, ConfigDict, Field, validator
from typing import Optional, List
from datetime import datetime, date
from enum import Enum
import re
import uuid

# Enums para validação
class UserStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"

class UserType(str, Enum):
    PROVIDER = "prestador"
    END_USER = "usuario_final"

class RoleEnum(str, Enum):
    USER = "user"
    APPROVER = "approver"
    TENANT_ADMIN = "tenant_admin"
    SUPER_ADMIN = "super_admin"

# Schemas para Tenant
class TenantBase(BaseModel):
    name: str
    subdomain: str
    is_active: bool = True

class TenantCreate(TenantBase):
    pass

class Tenant(TenantBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# Schemas para Role
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_system_role: bool = False

class RoleCreate(RoleBase):
    pass

class Role(RoleBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

# Schemas para User
class UserBase(BaseModel):
    name: str
    nickname: Optional[str] = None
    email: EmailStr
    cpf: str
    birth_date: date
    user_type: UserType
    status: UserStatus = UserStatus.PENDING
    
    # Endereço (opcional)
    address: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    zip_code: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "Brasil"
    
    # Observações
    notes: Optional[str] = None
    
    # Foto
    photo_url: Optional[str] = None
    
    @validator('cpf')
    def validate_cpf(cls, v):
        # Remove caracteres não numéricos
        cpf = re.sub(r'[^0-9]', '', v)
        
        if len(cpf) != 11:
            raise ValueError('CPF deve ter 11 dígitos')
        
        # Validação básica (você pode implementar a validação completa depois)
        if cpf == cpf[0] * 11:
            raise ValueError('CPF inválido')
        
        return cpf
    
    @validator('zip_code')
    def validate_zip_code(cls, v):
        if v:
            # Remove caracteres não numéricos
            zip_code = re.sub(r'[^0-9]', '', v)
            if len(zip_code) != 8:
                raise ValueError('CEP deve ter 8 dígitos')
            return zip_code
        return v
    
    @validator('state')
    def validate_state(cls, v):
        if v and len(v) != 2:
            raise ValueError('Estado deve ter 2 caracteres (UF)')
        return v.upper() if v else v

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    tenant_id: int
    roles: List[RoleEnum] = [RoleEnum.USER]
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Senha deve ter no mínimo 6 caracteres')
        return v

class UserUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[EmailStr] = None
    birth_date: Optional[date] = None
    status: Optional[UserStatus] = None
    user_type: Optional[UserType] = None
    address: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    zip_code: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    roles: Optional[List[RoleEnum]] = None

class UserInDB(UserBase):
    id: uuid.UUID
    created_at: datetime
    created_by_id: Optional[uuid.UUID] = None
    updated_at: datetime
    updated_by_id: Optional[uuid.UUID] = None
    tenant_id: int
    roles: List[Role] = []
    tenants: List[Tenant] = []
    
    model_config = ConfigDict(from_attributes=True)

class User(UserInDB):
    pass

# Schema para resposta sem dados sensíveis
class UserPublic(BaseModel):
    id: uuid.UUID
    name: str
    nickname: Optional[str] = None
    email: EmailStr
    user_type: UserType
    status: UserStatus
    photo_url: Optional[str] = None
    roles: List[str] = []
    
    model_config = ConfigDict(from_attributes=True)

# Schema para importação
class UserImport(BaseModel):
    name: str
    nickname: Optional[str] = None
    email: EmailStr
    cpf: str
    birth_date: date
    user_type: UserType
    address: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    zip_code: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "Brasil"
    notes: Optional[str] = None
    roles: List[RoleEnum] = [RoleEnum.USER]

class UserImportResult(BaseModel):
    total_records: int
    new_records: int
    duplicates_found: List[dict]  # Registros duplicados para revisão
    errors: List[dict]  # Erros de validação

# Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[str] = None
    is_super_admin: bool = False
    tenant_ids: List[int] = []

# Login
class UserLogin(BaseModel):
    username: str  # Pode ser email ou CPF
    password: str

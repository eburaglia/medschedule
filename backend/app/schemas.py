from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime

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
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    is_active: bool = True
    is_super_admin: bool = False

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    roles: List[Role] = []
    tenants: List[Tenant] = []
    
    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    username: str
    password: str

# Schemas para Appointment
class AppointmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: str = 'scheduled'

class AppointmentCreate(AppointmentBase):
    tenant_id: int
    user_id: int

class Appointment(AppointmentBase):
    id: int
    created_at: datetime
    tenant_id: int
    user_id: int
    
    model_config = ConfigDict(from_attributes=True)

# Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    is_super_admin: bool = False
    tenant_ids: List[int] = []

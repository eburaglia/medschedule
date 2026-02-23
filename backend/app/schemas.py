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

# Enums para Categoria
class CategoryStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

# Schemas para Categoria
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: CategoryStatus = CategoryStatus.ACTIVE

class CategoryCreate(CategoryBase):
    tenant_ids: List[int] = []  # Tenants que terão acesso a esta categoria

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CategoryStatus] = None
    tenant_ids: Optional[List[int]] = None

class CategoryInDB(CategoryBase):
    id: uuid.UUID
    created_at: datetime
    created_by_id: uuid.UUID
    updated_at: datetime
    updated_by_id: uuid.UUID
    tenants: List[Tenant] = []

    model_config = ConfigDict(from_attributes=True)

class Category(CategoryInDB):
    pass

# Schema para importação
class CategoryImport(BaseModel):
    name: str
    description: Optional[str] = None
    status: CategoryStatus = CategoryStatus.ACTIVE

class CategoryImportResult(BaseModel):
    total_records: int
    new_records: int
    duplicates_found: List[dict]
    errors: List[dict]

class ProductStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

# Schemas para Produto
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    price: Optional[int] = None  # Em centavos
    professional_commission: int = Field(..., ge=0, le=100, description="Percentual de 0 a 100")
    product_visible_to_end_user: bool = True
    price_visible_to_end_user: bool = False
    status: ProductStatus = ProductStatus.ACTIVE

class ProductCreate(ProductBase):
    category_id: uuid.UUID
    professional_id: uuid.UUID
    tenant_id: int

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    price: Optional[int] = None
    professional_commission: Optional[int] = Field(None, ge=0, le=100)
    product_visible_to_end_user: Optional[bool] = None
    price_visible_to_end_user: Optional[bool] = None
    status: Optional[ProductStatus] = None
    category_id: Optional[uuid.UUID] = None
    professional_id: Optional[uuid.UUID] = None

class ProductInDB(ProductBase):
    id: uuid.UUID
    created_at: datetime
    created_by_id: uuid.UUID
    updated_at: datetime
    updated_by_id: uuid.UUID
    category_id: uuid.UUID
    professional_id: uuid.UUID
    tenant_id: int
    
    # Relacionamentos
    category: Optional[Category] = None
    professional: Optional[UserPublic] = None
    tenant: Optional[Tenant] = None
    
    model_config = ConfigDict(from_attributes=True)

class Product(ProductInDB):
    pass

# Schema para resposta pública (sem preço se não visível)
class ProductPublic(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    price: Optional[int] = None  # Será None se price_visible_to_end_user = False
    professional_name: str
    category_name: str
    
    model_config = ConfigDict(from_attributes=True)

# Schema para importação
class ProductImport(BaseModel):
    name: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    price: Optional[int] = None
    professional_commission: int = Field(..., ge=0, le=100)
    product_visible_to_end_user: bool = True
    price_visible_to_end_user: bool = False
    status: ProductStatus = ProductStatus.ACTIVE
    category_name: str  # Nome da categoria (para lookup)
    professional_email: str  # Email do profissional (para lookup)
    tenant_subdomain: str  # Subdomínio do tenant (para lookup)

class ProductImportResult(BaseModel):
    total_records: int
    new_records: int
    duplicates_found: List[dict]
    errors: List[dict]



# Enums para Schedule
class ScheduleStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class WeekDay(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

class RecurrenceType(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"

# Schemas para Schedule
class ScheduleBase(BaseModel):
    start_date: datetime
    end_date: datetime
    service_price: Optional[int] = None
    status: ScheduleStatus = ScheduleStatus.ACTIVE
    recurrence_type: RecurrenceType = RecurrenceType.NONE
    recurrence_end_date: Optional[datetime] = None
    recurrence_days: Optional[List[WeekDay]] = None

class ScheduleCreate(ScheduleBase):
    provider_id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID
    product_id: uuid.UUID
    tenant_id: int

class ScheduleUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    service_price: Optional[int] = None
    status: Optional[ScheduleStatus] = None
    provider_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    product_id: Optional[uuid.UUID] = None
    recurrence_type: Optional[RecurrenceType] = None
    recurrence_end_date: Optional[datetime] = None
    recurrence_days: Optional[List[WeekDay]] = None

class ScheduleInDB(ScheduleBase):
    id: uuid.UUID
    created_at: datetime
    created_by_id: uuid.UUID
    updated_at: datetime
    updated_by_id: uuid.UUID
    provider_id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID
    product_id: uuid.UUID
    tenant_id: int
    
    # Relacionamentos
    provider: Optional[UserPublic] = None
    user: Optional[UserPublic] = None
    category: Optional[Category] = None
    product: Optional[Product] = None
    tenant: Optional[Tenant] = None
    
    model_config = ConfigDict(from_attributes=True)

class Schedule(ScheduleInDB):
    pass

# Schema para instância de recorrência
class RecurringInstance(BaseModel):
    id: uuid.UUID
    parent_schedule_id: uuid.UUID
    instance_date: datetime
    status: ScheduleStatus
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# Schema para visualização de calendário
class CalendarView(BaseModel):
    date: date
    schedules: List[Schedule]

# Schema para criação de múltiplos agendamentos
class BulkScheduleCreate(BaseModel):
    provider_id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID
    product_id: uuid.UUID
    tenant_id: int
    start_time: str  # Formato: "HH:MM"
    end_time: str  # Formato: "HH:MM"
    days: List[WeekDay]  # Dias da semana
    start_date: date
    end_date: Optional[date] = None  # Se None, cria para sempre
    service_price: Optional[int] = None

# Schema para verificação de disponibilidade
class AvailabilityCheck(BaseModel):
    provider_id: uuid.UUID
    date: date
    start_time: str
    end_time: str

# Schema para importação
class ScheduleImport(BaseModel):
    provider_email: str
    user_email: str
    category_name: str
    product_name: str
    start_date: str  # Formato: YYYY-MM-DD HH:MM
    end_date: str  # Formato: YYYY-MM-DD HH:MM
    service_price: Optional[int] = None
    status: ScheduleStatus = ScheduleStatus.ACTIVE
    recurrence_type: RecurrenceType = RecurrenceType.NONE
    recurrence_end_date: Optional[str] = None
    recurrence_days: Optional[str] = None  # Ex: "monday,wednesday,friday"

class ScheduleImportResult(BaseModel):
    total_records: int
    new_records: int
    duplicates_found: List[dict]
    conflicts_found: List[dict]  # Conflitos de horário
    errors: List[dict]


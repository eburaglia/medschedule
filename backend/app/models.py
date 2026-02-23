from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
import uuid

# Tabela de associação entre usuários e roles (muitos-para-muitos)
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id')),
    Column('role_id', Integer, ForeignKey('roles.id'))
)

# Tabela de associação entre usuários e tenants (muitos-para-muitos)
user_tenants = Table(
    'user_tenants',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id')),
    Column('tenant_id', Integer, ForeignKey('tenants.id'))
)

class UserStatus(enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"

class UserType(enum.Enum):
    PROVIDER = "prestador"
    END_USER = "usuario_final"

class Tenant(Base):
    __tablename__ = 'tenants'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    subdomain = Column(String(50), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos existentes
    users = relationship("User", secondary=user_tenants, back_populates="tenants")
    appointments = relationship("Appointment", back_populates="tenant")
    created_users = relationship("User", foreign_keys="User.created_by_id", back_populates="creator")
    updated_users = relationship("User", foreign_keys="User.updated_by_id", back_populates="updater")
    # NOVO: Relacionamento com categorias
    categories = relationship("Category", secondary="tenant_categories", back_populates="tenants")

class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(200))
    is_system_role = Column(Boolean, default=False)
    
    # Relacionamentos
    users = relationship("User", secondary=user_roles, back_populates="roles")

class User(Base):
    __tablename__ = 'users'
    
    # UUID como chave primária
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Auditoria
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=False, server_default=func.now())
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Soft delete
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False)
    
    # Tenant principal (obrigatório)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    
    # Status e tipo
    status = Column(Enum(UserStatus), default=UserStatus.PENDING, nullable=False)
    user_type = Column(Enum(UserType), nullable=False)
    
    # Dados pessoais (obrigatórios)
    name = Column(String(100), nullable=False)
    nickname = Column(String(50), nullable=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    cpf = Column(String(11), unique=True, index=True, nullable=False)  # Apenas números
    birth_date = Column(DateTime, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    
    # Observações
    notes = Column(Text, nullable=True)
    
    # Endereço (opcional)
    address = Column(String(200), nullable=True)
    address_number = Column(String(10), nullable=True)
    complement = Column(String(100), nullable=True)
    zip_code = Column(String(8), nullable=True)  # Apenas números
    neighborhood = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(2), nullable=True)  # UF
    country = Column(String(50), nullable=True, default="Brasil")
    
    # Foto
    photo_url = Column(String(500), nullable=True)
    
    # Relacionamentos
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    tenants = relationship("Tenant", secondary=user_tenants, back_populates="users")
    appointments = relationship("Appointment", back_populates="user")
    payments = relationship("Payment", back_populates="user")  # Para histórico de pagamentos
    
    # Relacionamentos de auditoria
    creator = relationship("User", foreign_keys=[created_by_id], remote_side=[id], back_populates="created_users")
    updater = relationship("User", foreign_keys=[updated_by_id], remote_side=[id], back_populates="updated_users")
    created_users = relationship("User", foreign_keys=[created_by_id], back_populates="creator")
    updated_users = relationship("User", foreign_keys=[updated_by_id], back_populates="updater")

class Appointment(Base):
    __tablename__ = 'appointments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=False, server_default=func.now())
    
    title = Column(String(200), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default='scheduled')
    
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    tenant = relationship("Tenant", back_populates="appointments")
    user = relationship("User", back_populates="appointments")

class Payment(Base):
    __tablename__ = 'payments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=False, server_default=func.now())
    
    amount = Column(Integer, nullable=False)  # Em centavos
    status = Column(String(20), nullable=False)
    payment_date = Column(DateTime(timezone=True), nullable=False)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey('appointments.id'), nullable=True)
    
    user = relationship("User", back_populates="payments")
    appointment = relationship("Appointment")


class CategoryStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class Category(Base):
    __tablename__ = 'categories'
    
    # UUID como chave primária
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Auditoria
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=False, server_default=func.now())
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Soft delete
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False)
    
    # Status
    status = Column(Enum(CategoryStatus), default=CategoryStatus.ACTIVE, nullable=False)
    
    # Dados da categoria
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Relacionamentos
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_categories")
    updated_by = relationship("User", foreign_keys=[updated_by_id], back_populates="updated_categories")
    
    # Relacionamento com tenants (muitos-para-muitos)
    tenants = relationship("Tenant", secondary="tenant_categories", back_populates="categories")

# Tabela de associação entre categorias e tenants
tenant_categories = Table(
    'tenant_categories',
    Base.metadata,
    Column('tenant_id', Integer, ForeignKey('tenants.id'), primary_key=True),
    Column('category_id', UUID(as_uuid=True), ForeignKey('categories.id'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now()),
    Column('created_by_id', UUID(as_uuid=True), ForeignKey('users.id'))
)

# Atualizar modelo Tenant para incluir categorias
# Adicionar no modelo Tenant existente:
# categories = relationship("Category", secondary="tenant_categories", back_populates="tenants")

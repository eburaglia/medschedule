from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

# Tabela de associação entre usuários e roles (muitos-para-muitos)
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('role_id', Integer, ForeignKey('roles.id'))
)

# Tabela de associação entre usuários e tenants (muitos-para-muitos)
user_tenants = Table(
    'user_tenants',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('tenant_id', Integer, ForeignKey('tenants.id'))
)

class Tenant(Base):
    __tablename__ = 'tenants'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    subdomain = Column(String(50), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    users = relationship("User", secondary=user_tenants, back_populates="tenants")
    appointments = relationship("Appointment", back_populates="tenant")

class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # admin, manager, user, etc
    description = Column(String(200))
    is_system_role = Column(Boolean, default=False)  # Roles que não podem ser deletadas
    
    # Relacionamentos
    users = relationship("User", secondary=user_roles, back_populates="roles")

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100))
    hashed_password = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)  # Acesso a todos os tenants
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    tenants = relationship("Tenant", secondary=user_tenants, back_populates="users")
    appointments = relationship("Appointment", back_populates="user")

class Appointment(Base):
    __tablename__ = 'appointments'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default='scheduled')  # scheduled, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Chaves estrangeiras
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relacionamentos
    tenant = relationship("Tenant", back_populates="appointments")
    user = relationship("User", back_populates="appointments")

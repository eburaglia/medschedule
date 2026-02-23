#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import SessionLocal
from backend.app.models import Role
from backend.app.auth import get_password_hash

def init_roles():
    db = SessionLocal()
    
    # Roles padrão do sistema
    default_roles = [
        {"name": "super_admin", "description": "Acesso total ao sistema", "is_system_role": True},
        {"name": "tenant_admin", "description": "Administrador do tenant", "is_system_role": True},
        {"name": "manager", "description": "Gerente", "is_system_role": True},
        {"name": "user", "description": "Usuário comum", "is_system_role": True},
    ]
    
    for role_data in default_roles:
        role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not role:
            role = Role(**role_data)
            db.add(role)
            print(f"✅ Role criada: {role_data['name']}")
        else:
            print(f"⏩ Role já existe: {role_data['name']}")
    
    db.commit()
    db.close()
    print("🎉 Roles inicializadas com sucesso!")

if __name__ == "__main__":
    init_roles()

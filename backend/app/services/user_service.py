from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
import uuid
import pandas as pd
import io
from datetime import datetime
from typing import List, Optional, Dict, Any
from app import models, schemas, auth

class UserService:
    def __init__(self, db: Session, current_user: Optional[models.User] = None):
        self.db = db
        self.current_user = current_user
    
    def get_user_by_id(self, user_id: uuid.UUID) -> Optional[models.User]:
        """Busca usuário por ID (ignorando soft delete)"""
        return self.db.query(models.User).filter(
            models.User.id == user_id,
            models.User.is_deleted == False
        ).first()
    
    def get_user_by_email(self, email: str) -> Optional[models.User]:
        """Busca usuário por email"""
        return self.db.query(models.User).filter(
            models.User.email == email,
            models.User.is_deleted == False
        ).first()
    
    def get_user_by_cpf(self, cpf: str) -> Optional[models.User]:
        """Busca usuário por CPF"""
        return self.db.query(models.User).filter(
            models.User.cpf == cpf,
            models.User.is_deleted == False
        ).first()
    
    def create_user(self, user_data: schemas.UserCreate) -> models.User:
        """Cria um novo usuário"""
        # Verificar duplicidade
        existing_email = self.get_user_by_email(user_data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já cadastrado"
            )
        
        existing_cpf = self.get_user_by_cpf(user_data.cpf)
        if existing_cpf:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CPF já cadastrado"
            )
        
        # Verificar se tenant existe
        tenant = self.db.query(models.Tenant).filter(
            models.Tenant.id == user_data.tenant_id,
            models.Tenant.is_active == True
        ).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant não encontrado"
            )
        
        # Criar usuário
        hashed_password = auth.get_password_hash(user_data.password)
        
        db_user = models.User(
            id=uuid.uuid4(),
            name=user_data.name,
            nickname=user_data.nickname,
            email=user_data.email,
            cpf=user_data.cpf,
            birth_date=datetime.combine(user_data.birth_date, datetime.min.time()),
            hashed_password=hashed_password,
            user_type=user_data.user_type,
            status=user_data.status,
            tenant_id=user_data.tenant_id,
            address=user_data.address,
            address_number=user_data.address_number,
            complement=user_data.complement,
            zip_code=user_data.zip_code,
            neighborhood=user_data.neighborhood,
            city=user_data.city,
            state=user_data.state,
            country=user_data.country,
            notes=user_data.notes,
            photo_url=user_data.photo_url,
            created_by_id=self.current_user.id if self.current_user else None,
            updated_by_id=self.current_user.id if self.current_user else None
        )
        
        # Adicionar roles
        for role_name in user_data.roles:
            role = self.db.query(models.Role).filter(models.Role.name == role_name.value).first()
            if role:
                db_user.roles.append(role)
        
        # Adicionar ao tenant
        db_user.tenants.append(tenant)
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        
        return db_user
    
    def update_user(self, user_id: uuid.UUID, user_update: schemas.UserUpdate) -> models.User:
        """Atualiza um usuário existente"""
        db_user = self.get_user_by_id(user_id)
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Atualizar campos
        update_data = user_update.model_dump(exclude_unset=True)
        
        # Verificar email duplicado
        if 'email' in update_data and update_data['email'] != db_user.email:
            existing = self.get_user_by_email(update_data['email'])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email já cadastrado"
                )
        
        # Verificar CPF duplicado
        if 'cpf' in update_data and update_data['cpf'] != db_user.cpf:
            existing = self.get_user_by_cpf(update_data['cpf'])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CPF já cadastrado"
                )
        
        # Atualizar roles se fornecidas
        if 'roles' in update_data:
            db_user.roles = []
            for role_name in update_data['roles']:
                role = self.db.query(models.Role).filter(models.Role.name == role_name.value).first()
                if role:
                    db_user.roles.append(role)
            del update_data['roles']
        
        # Converter birth_date se presente
        if 'birth_date' in update_data:
            update_data['birth_date'] = datetime.combine(update_data['birth_date'], datetime.min.time())
        
        # Atualizar campos
        for field, value in update_data.items():
            setattr(db_user, field, value)
        
        db_user.updated_by_id = self.current_user.id if self.current_user else None
        db_user.updated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_user)
        
        return db_user
    
    def delete_user(self, user_id: uuid.UUID) -> bool:
        """Soft delete de usuário"""
        db_user = self.get_user_by_id(user_id)
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        db_user.is_deleted = True
        db_user.deleted_at = datetime.now()
        db_user.updated_by_id = self.current_user.id if self.current_user else None
        
        self.db.commit()
        
        return True
    
    def import_users_from_csv(self, file_content: bytes, tenant_id: int) -> schemas.UserImportResult:
        """Importa usuários de arquivo CSV"""
        try:
            # Ler CSV
            df = pd.read_csv(io.StringIO(file_content.decode('utf-8')))
            
            result = {
                'total_records': len(df),
                'new_records': 0,
                'duplicates_found': [],
                'errors': []
            }
            
            for idx, row in df.iterrows():
                try:
                    # Verificar duplicidade
                    existing_by_email = None
                    existing_by_cpf = None
                    
                    if 'email' in row and pd.notna(row['email']):
                        existing_by_email = self.get_user_by_email(row['email'])
                    
                    if 'cpf' in row and pd.notna(row['cpf']):
                        existing_by_cpf = self.get_user_by_cpf(row['cpf'])
                    
                    if existing_by_email or existing_by_cpf:
                        # Registro duplicado
                        result['duplicates_found'].append({
                            'row': idx + 2,  # +2 por causa do header e 0-index
                            'data': row.to_dict(),
                            'existing_user': {
                                'id': str(existing_by_email.id if existing_by_email else existing_by_cpf.id),
                                'name': existing_by_email.name if existing_by_email else existing_by_cpf.name,
                                'email': existing_by_email.email if existing_by_email else existing_by_cpf.email,
                                'cpf': existing_by_email.cpf if existing_by_email else existing_by_cpf.cpf
                            }
                        })
                    else:
                        # Criar novo usuário
                        user_data = self._parse_import_row(row, tenant_id)
                        if user_data:
                            # Definir status como PENDING para importação
                            user_data.status = schemas.UserStatus.PENDING
                            
                            # Gerar senha temporária
                            import secrets
                            import string
                            temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
                            user_data.password = temp_password
                            
                            self.create_user(user_data)
                            result['new_records'] += 1
                
                except Exception as e:
                    result['errors'].append({
                        'row': idx + 2,
                        'error': str(e)
                    })
            
            return schemas.UserImportResult(**result)
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao processar arquivo: {str(e)}"
            )
    
    def _parse_import_row(self, row: pd.Series, tenant_id: int) -> Optional[schemas.UserCreate]:
        """Converte linha do CSV para UserCreate"""
        try:
            # Mapear colunas
            data = {
                'name': row.get('nome') or row.get('name'),
                'nickname': row.get('apelido') or row.get('nickname'),
                'email': row.get('email'),
                'cpf': row.get('cpf'),
                'birth_date': pd.to_datetime(row.get('data_nascimento') or row.get('birth_date')).date(),
                'user_type': row.get('tipo') or row.get('user_type', 'usuario_final'),
                'tenant_id': tenant_id,
                'roles': [schemas.RoleEnum.USER],  # Role padrão
                'password': 'temporary'  # Será substituído
            }
            
            # Campos opcionais
            optional_fields = ['address', 'address_number', 'complement', 'zip_code', 
                             'neighborhood', 'city', 'state', 'country', 'notes']
            
            for field in optional_fields:
                if field in row and pd.notna(row[field]):
                    data[field] = row[field]
            
            return schemas.UserCreate(**data)
        
        except Exception as e:
            raise ValueError(f"Erro ao processar linha: {str(e)}")
    
    def resolve_duplicate(self, user_id: uuid.UUID, import_data: Dict[str, Any], action: str) -> models.User:
        """Resolve duplicatas durante importação"""
        db_user = self.get_user_by_id(user_id)
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        if action == 'merge':
            # Merge dos dados (mantém dados existentes, atualiza campos vazios)
            for key, value in import_data.items():
                if value and not getattr(db_user, key, None):
                    setattr(db_user, key, value)
        
        elif action == 'replace':
            # Substitui com dados do import
            for key, value in import_data.items():
                if key not in ['id', 'created_at', 'created_by_id']:
                    setattr(db_user, key, value)
        
        elif action == 'discard':
            # Não faz nada
            return db_user
        
        db_user.updated_by_id = self.current_user.id if self.current_user else None
        db_user.updated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_user)
        
        return db_user

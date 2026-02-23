from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
import uuid
import pandas as pd
import io
from datetime import datetime
from typing import List, Optional, Dict, Any
from app import models, schemas

class CategoryService:
    def __init__(self, db: Session, current_user: models.User):
        self.db = db
        self.current_user = current_user
    
    def get_category_by_id(self, category_id: uuid.UUID) -> Optional[models.Category]:
        """Busca categoria por ID (ignorando soft delete)"""
        return self.db.query(models.Category).filter(
            models.Category.id == category_id,
            models.Category.is_deleted == False
        ).first()
    
    def get_category_by_name(self, name: str) -> Optional[models.Category]:
        """Busca categoria por nome"""
        return self.db.query(models.Category).filter(
            models.Category.name == name,
            models.Category.is_deleted == False
        ).first()
    
    def get_categories_by_tenant(self, tenant_id: int) -> List[models.Category]:
        """Busca todas as categorias de um tenant específico"""
        return self.db.query(models.Category).join(
            models.tenant_categories
        ).filter(
            models.tenant_categories.c.tenant_id == tenant_id,
            models.Category.is_deleted == False,
            models.Category.status == models.CategoryStatus.ACTIVE
        ).all()
    
    def create_category(self, category_data: schemas.CategoryCreate) -> models.Category:
        """Cria uma nova categoria"""
        # Verificar duplicidade por nome
        existing = self.get_category_by_name(category_data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Categoria com nome '{category_data.name}' já existe"
            )
        
        # Criar categoria
        db_category = models.Category(
            id=uuid.uuid4(),
            name=category_data.name,
            description=category_data.description,
            status=category_data.status,
            created_by_id=self.current_user.id,
            updated_by_id=self.current_user.id
        )
        
        self.db.add(db_category)
        self.db.flush()  # Para gerar o ID
        
        # Associar aos tenants
        for tenant_id in category_data.tenant_ids:
            tenant = self.db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
            if tenant:
                # Inserir na tabela de associação
                stmt = models.tenant_categories.insert().values(
                    tenant_id=tenant_id,
                    category_id=db_category.id,
                    created_at=datetime.now(),
                    created_by_id=self.current_user.id
                )
                self.db.execute(stmt)
        
        self.db.commit()
        self.db.refresh(db_category)
        
        return db_category
    
    def update_category(self, category_id: uuid.UUID, category_update: schemas.CategoryUpdate) -> models.Category:
        """Atualiza uma categoria existente"""
        db_category = self.get_category_by_id(category_id)
        if not db_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada"
            )
        
        update_data = category_update.model_dump(exclude_unset=True)
        
        # Verificar nome duplicado
        if 'name' in update_data and update_data['name'] != db_category.name:
            existing = self.get_category_by_name(update_data['name'])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Categoria com nome '{update_data['name']}' já existe"
                )
        
        # Atualizar tenants se fornecidos
        if 'tenant_ids' in update_data:
            # Remover associações existentes
            self.db.execute(
                models.tenant_categories.delete().where(
                    models.tenant_categories.c.category_id == category_id
                )
            )
            
            # Adicionar novas associações
            for tenant_id in update_data['tenant_ids']:
                stmt = models.tenant_categories.insert().values(
                    tenant_id=tenant_id,
                    category_id=category_id,
                    created_at=datetime.now(),
                    created_by_id=self.current_user.id
                )
                self.db.execute(stmt)
            
            del update_data['tenant_ids']
        
        # Atualizar campos
        for field, value in update_data.items():
            setattr(db_category, field, value)
        
        db_category.updated_by_id = self.current_user.id
        db_category.updated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_category)
        
        return db_category
    
    def delete_category(self, category_id: uuid.UUID) -> bool:
        """Soft delete de categoria"""
        db_category = self.get_category_by_id(category_id)
        if not db_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada"
            )
        
        db_category.is_deleted = True
        db_category.deleted_at = datetime.now()
        db_category.updated_by_id = self.current_user.id
        db_category.status = models.CategoryStatus.INACTIVE
        
        self.db.commit()
        
        return True
    
    def import_categories_from_csv(self, file_content: bytes) -> schemas.CategoryImportResult:
        """Importa categorias de arquivo CSV"""
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
                    # Verificar duplicidade por nome
                    existing = None
                    if 'nome' in row and pd.notna(row['nome']):
                        existing = self.get_category_by_name(row['nome'].strip())
                    elif 'name' in row and pd.notna(row['name']):
                        existing = self.get_category_by_name(row['name'].strip())
                    
                    if existing:
                        # Registro duplicado
                        result['duplicates_found'].append({
                            'row': idx + 2,
                            'data': row.to_dict(),
                            'existing_category': {
                                'id': str(existing.id),
                                'name': existing.name,
                                'description': existing.description,
                                'status': existing.status.value if existing.status else None
                            }
                        })
                    else:
                        # Criar nova categoria
                        category_data = self._parse_import_row(row)
                        if category_data:
                            self.create_category(category_data)
                            result['new_records'] += 1
                
                except Exception as e:
                    result['errors'].append({
                        'row': idx + 2,
                        'error': str(e)
                    })
            
            return schemas.CategoryImportResult(**result)
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao processar arquivo: {str(e)}"
            )
    
    def _parse_import_row(self, row: pd.Series) -> Optional[schemas.CategoryCreate]:
        """Converte linha do CSV para CategoryCreate"""
        try:
            # Mapear colunas
            name = row.get('nome') or row.get('name')
            if not name:
                raise ValueError("Nome da categoria é obrigatório")
            
            data = {
                'name': name.strip(),
                'description': row.get('descricao') or row.get('description'),
                'tenant_ids': []  # Será preenchido pelo admin após importação
            }
            
            # Status (se fornecido)
            status_value = row.get('status')
            if status_value:
                if status_value.lower() in ['active', 'ativo']:
                    data['status'] = schemas.CategoryStatus.ACTIVE
                elif status_value.lower() in ['inactive', 'inativo']:
                    data['status'] = schemas.CategoryStatus.INACTIVE
            
            return schemas.CategoryCreate(**data)
        
        except Exception as e:
            raise ValueError(f"Erro ao processar linha: {str(e)}")
    
    def resolve_duplicate(self, category_id: uuid.UUID, import_data: Dict[str, Any], action: str) -> models.Category:
        """Resolve duplicatas durante importação"""
        db_category = self.get_category_by_id(category_id)
        if not db_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada"
            )
        
        if action == 'merge':
            # Merge dos dados (mantém dados existentes, atualiza campos vazios)
            for key, value in import_data.items():
                if value and not getattr(db_category, key, None):
                    setattr(db_category, key, value)
        
        elif action == 'replace':
            # Substitui com dados do import
            for key, value in import_data.items():
                if key not in ['id', 'created_at', 'created_by_id']:
                    setattr(db_category, key, value)
        
        elif action == 'discard':
            # Não faz nada
            return db_category
        
        db_category.updated_by_id = self.current_user.id
        db_category.updated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_category)
        
        return db_category

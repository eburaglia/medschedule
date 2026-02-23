from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from fastapi import HTTPException, status
import uuid
import pandas as pd
import io
from datetime import datetime
from typing import List, Optional, Dict, Any
from app import models, schemas

class ProductService:
    def __init__(self, db: Session, current_user: models.User):
        self.db = db
        self.current_user = current_user
    
    def get_product_by_id(self, product_id: uuid.UUID) -> Optional[models.Product]:
        """Busca produto por ID (ignorando soft delete)"""
        return self.db.query(models.Product).filter(
            models.Product.id == product_id,
            models.Product.is_deleted == False
        ).first()
    
    def get_product_by_name_and_tenant(self, name: str, tenant_id: int) -> Optional[models.Product]:
        """Busca produto por nome e tenant"""
        return self.db.query(models.Product).filter(
            models.Product.name == name,
            models.Product.tenant_id == tenant_id,
            models.Product.is_deleted == False
        ).first()
    
    def get_products_by_tenant(self, tenant_id: int) -> List[models.Product]:
        """Busca todos os produtos de um tenant"""
        return self.db.query(models.Product).filter(
            models.Product.tenant_id == tenant_id,
            models.Product.is_deleted == False
        ).all()
    
    def get_products_by_category(self, category_id: uuid.UUID) -> List[models.Product]:
        """Busca produtos por categoria"""
        return self.db.query(models.Product).filter(
            models.Product.category_id == category_id,
            models.Product.is_deleted == False
        ).all()
    
    def get_products_by_professional(self, professional_id: uuid.UUID) -> List[models.Product]:
        """Busca produtos por profissional"""
        return self.db.query(models.Product).filter(
            models.Product.professional_id == professional_id,
            models.Product.is_deleted == False
        ).all()
    
    def create_product(self, product_data: schemas.ProductCreate) -> models.Product:
        """Cria um novo produto"""
        # Verificar duplicidade por nome no mesmo tenant
        existing = self.get_product_by_name_and_tenant(product_data.name, product_data.tenant_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Produto com nome '{product_data.name}' já existe neste tenant"
            )
        
        # Verificar se categoria existe
        category = self.db.query(models.Category).filter(
            models.Category.id == product_data.category_id,
            models.Category.is_deleted == False
        ).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada"
            )
        
        # Verificar se profissional existe e é do tipo prestador
        professional = self.db.query(models.User).filter(
            models.User.id == product_data.professional_id,
            models.User.is_deleted == False,
            models.User.user_type == models.UserType.PROVIDER
        ).first()
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profissional não encontrado ou não é do tipo prestador"
            )
        
        # Verificar se tenant existe
        tenant = self.db.query(models.Tenant).filter(
            models.Tenant.id == product_data.tenant_id,
            models.Tenant.is_active == True
        ).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant não encontrado"
            )
        
        # Criar produto
        db_product = models.Product(
            id=uuid.uuid4(),
            name=product_data.name,
            description=product_data.description,
            photo_url=product_data.photo_url,
            price=product_data.price,
            professional_commission=product_data.professional_commission,
            product_visible_to_end_user=product_data.product_visible_to_end_user,
            price_visible_to_end_user=product_data.price_visible_to_end_user,
            status=product_data.status,
            category_id=product_data.category_id,
            professional_id=product_data.professional_id,
            tenant_id=product_data.tenant_id,
            created_by_id=self.current_user.id,
            updated_by_id=self.current_user.id
        )
        
        self.db.add(db_product)
        self.db.commit()
        self.db.refresh(db_product)
        
        return db_product
    
    def update_product(self, product_id: uuid.UUID, product_update: schemas.ProductUpdate) -> models.Product:
        """Atualiza um produto existente"""
        db_product = self.get_product_by_id(product_id)
        if not db_product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto não encontrado"
            )
        
        update_data = product_update.model_dump(exclude_unset=True)
        
        # Verificar nome duplicado no mesmo tenant
        if 'name' in update_data and update_data['name'] != db_product.name:
            existing = self.get_product_by_name_and_tenant(update_data['name'], db_product.tenant_id)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Produto com nome '{update_data['name']}' já existe neste tenant"
                )
        
        # Verificar categoria se fornecida
        if 'category_id' in update_data:
            category = self.db.query(models.Category).filter(
                models.Category.id == update_data['category_id'],
                models.Category.is_deleted == False
            ).first()
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Categoria não encontrada"
                )
        
        # Verificar profissional se fornecido
        if 'professional_id' in update_data:
            professional = self.db.query(models.User).filter(
                models.User.id == update_data['professional_id'],
                models.User.is_deleted == False,
                models.User.user_type == models.UserType.PROVIDER
            ).first()
            if not professional:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Profissional não encontrado ou não é do tipo prestador"
                )
        
        # Atualizar campos
        for field, value in update_data.items():
            setattr(db_product, field, value)
        
        db_product.updated_by_id = self.current_user.id
        db_product.updated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_product)
        
        return db_product
    
    def delete_product(self, product_id: uuid.UUID) -> bool:
        """Soft delete de produto"""
        db_product = self.get_product_by_id(product_id)
        if not db_product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto não encontrado"
            )
        
        db_product.is_deleted = True
        db_product.deleted_at = datetime.now()
        db_product.updated_by_id = self.current_user.id
        db_product.status = models.ProductStatus.INACTIVE
        
        self.db.commit()
        
        return True
    
    def import_products_from_csv(self, file_content: bytes, tenant_id: int) -> schemas.ProductImportResult:
        """Importa produtos de arquivo CSV"""
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
                    # Verificar duplicidade por nome no tenant
                    name = row.get('nome') or row.get('name')
                    if not name:
                        raise ValueError("Nome do produto é obrigatório")
                    
                    existing = self.get_product_by_name_and_tenant(name.strip(), tenant_id)
                    
                    if existing:
                        # Registro duplicado
                        result['duplicates_found'].append({
                            'row': idx + 2,
                            'data': row.to_dict(),
                            'existing_product': {
                                'id': str(existing.id),
                                'name': existing.name,
                                'price': existing.price,
                                'status': existing.status.value if existing.status else None
                            }
                        })
                    else:
                        # Criar novo produto
                        product_data = self._parse_import_row(row, tenant_id)
                        if product_data:
                            self.create_product(product_data)
                            result['new_records'] += 1
                
                except Exception as e:
                    result['errors'].append({
                        'row': idx + 2,
                        'error': str(e)
                    })
            
            return schemas.ProductImportResult(**result)
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao processar arquivo: {str(e)}"
            )
    
    def _parse_import_row(self, row: pd.Series, tenant_id: int) -> Optional[schemas.ProductCreate]:
        """Converte linha do CSV para ProductCreate"""
        try:
            # Mapear colunas
            name = row.get('nome') or row.get('name')
            if not name:
                raise ValueError("Nome do produto é obrigatório")
            
            # Buscar categoria pelo nome
            category_name = row.get('categoria') or row.get('category')
            if not category_name:
                raise ValueError("Categoria é obrigatória")
            
            category = self.db.query(models.Category).filter(
                models.Category.name == category_name.strip(),
                models.Category.is_deleted == False
            ).first()
            
            if not category:
                raise ValueError(f"Categoria '{category_name}' não encontrada")
            
            # Buscar profissional pelo email
            professional_email = row.get('profissional_email') or row.get('professional_email')
            if not professional_email:
                raise ValueError("Email do profissional é obrigatório")
            
            professional = self.db.query(models.User).filter(
                models.User.email == professional_email.strip(),
                models.User.is_deleted == False,
                models.User.user_type == models.UserType.PROVIDER
            ).first()
            
            if not professional:
                raise ValueError(f"Profissional com email '{professional_email}' não encontrado")
            
            # Comissão
            commission = row.get('comissao') or row.get('commission')
            if commission is None:
                raise ValueError("Comissão do profissional é obrigatória")
            
            # Preço (opcional)
            price = row.get('preco') or row.get('price')
            if price and pd.notna(price):
                # Converter para centavos se for float
                if isinstance(price, float):
                    price = int(price * 100)
                else:
                    price = int(price)
            
            # Visibilidade
            product_visible = row.get('visivel') or row.get('visible')
            if product_visible is not None:
                product_visible = str(product_visible).lower() in ['sim', 'yes', 'true', '1', 's']
            else:
                product_visible = True
            
            price_visible = row.get('preco_visivel') or row.get('price_visible')
            if price_visible is not None:
                price_visible = str(price_visible).lower() in ['sim', 'yes', 'true', '1', 's']
            else:
                price_visible = False
            
            data = {
                'name': name.strip(),
                'description': row.get('descricao') or row.get('description'),
                'photo_url': row.get('foto_url') or row.get('photo_url'),
                'price': price,
                'professional_commission': int(float(commission)),
                'product_visible_to_end_user': product_visible,
                'price_visible_to_end_user': price_visible,
                'category_id': category.id,
                'professional_id': professional.id,
                'tenant_id': tenant_id
            }
            
            # Status (se fornecido)
            status_value = row.get('status')
            if status_value:
                if status_value.lower() in ['active', 'ativo']:
                    data['status'] = schemas.ProductStatus.ACTIVE
                elif status_value.lower() in ['inactive', 'inativo']:
                    data['status'] = schemas.ProductStatus.INACTIVE
            
            return schemas.ProductCreate(**data)
        
        except Exception as e:
            raise ValueError(f"Erro ao processar linha: {str(e)}")
    
    def resolve_duplicate(self, product_id: uuid.UUID, import_data: Dict[str, Any], action: str) -> models.Product:
        """Resolve duplicatas durante importação"""
        db_product = self.get_product_by_id(product_id)
        if not db_product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto não encontrado"
            )
        
        if action == 'merge':
            # Merge dos dados (mantém dados existentes, atualiza campos vazios)
            for key, value in import_data.items():
                if value and not getattr(db_product, key, None):
                    setattr(db_product, key, value)
        
        elif action == 'replace':
            # Substitui com dados do import
            for key, value in import_data.items():
                if key not in ['id', 'created_at', 'created_by_id']:
                    setattr(db_product, key, value)
        
        elif action == 'discard':
            # Não faz nada
            return db_product
        
        db_product.updated_by_id = self.current_user.id
        db_product.updated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_product)
        
        return db_product
    
    def get_public_products(self, tenant_id: int, category_id: Optional[uuid.UUID] = None) -> List[dict]:
        """Retorna produtos para visualização do usuário final"""
        query = self.db.query(models.Product).filter(
            models.Product.tenant_id == tenant_id,
            models.Product.is_deleted == False,
            models.Product.status == models.ProductStatus.ACTIVE,
            models.Product.product_visible_to_end_user == True
        )
        
        if category_id:
            query = query.filter(models.Product.category_id == category_id)
        
        products = query.all()
        
        result = []
        for product in products:
            product_dict = {
                'id': product.id,
                'name': product.name,
                'description': product.description,
                'photo_url': product.photo_url,
                'category_name': product.category.name if product.category else None,
                'professional_name': product.professional.name if product.professional else None
            }
            
            # Incluir preço apenas se visível
            if product.price_visible_to_end_user:
                product_dict['price'] = product.price
            
            result.append(product_dict)
        
        return result

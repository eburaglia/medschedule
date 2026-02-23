from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app import schemas, models, deps, auth
from app.database import get_db
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Produtos"])

@router.get("/", response_model=List[schemas.Product])
async def list_products(
    skip: int = 0,
    limit: int = 100,
    status: Optional[schemas.ProductStatus] = None,
    category_id: Optional[uuid.UUID] = None,
    professional_id: Optional[uuid.UUID] = None,
    tenant_id: Optional[int] = Query(None, description="Filtrar por tenant"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Lista todos os produtos (com filtros)"""
    query = db.query(models.Product).filter(models.Product.is_deleted == False)
    
    if status:
        query = query.filter(models.Product.status == status)
    
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    
    if professional_id:
        query = query.filter(models.Product.professional_id == professional_id)
    
    if tenant_id:
        # Verificar acesso ao tenant
        if not current_user.is_super_admin:
            deps.require_tenant_access(tenant_id, current_user, db)
        query = query.filter(models.Product.tenant_id == tenant_id)
    else:
        # Se não filtrar por tenant, mostrar apenas produtos dos tenants do usuário
        if not current_user.is_super_admin:
            tenant_ids = [t.id for t in current_user.tenants]
            query = query.filter(models.Product.tenant_id.in_(tenant_ids))
    
    products = query.offset(skip).limit(limit).all()
    return products

@router.post("/", response_model=schemas.Product)
async def create_product(
    product: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Cria um novo produto"""
    # Verificar permissão
    if not current_user.is_super_admin:
        deps.require_tenant_access(product.tenant_id, current_user, db)
    
    service = ProductService(db, current_user)
    return service.create_product(product)

@router.get("/public/{tenant_id}", response_model=List[dict])
async def list_public_products(
    tenant_id: int,
    category_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    """Lista produtos para visualização pública (usuário final)"""
    service = ProductService(db, None)
    return service.get_public_products(tenant_id, category_id)

@router.get("/{product_id}", response_model=schemas.Product)
async def get_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Obtém detalhes de um produto específico"""
    service = ProductService(db, current_user)
    product = service.get_product_by_id(product_id)
    
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Verificar acesso
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        if product.tenant_id not in tenant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem acesso a este produto"
            )
    
    return product

@router.put("/{product_id}", response_model=schemas.Product)
async def update_product(
    product_id: uuid.UUID,
    product_update: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Atualiza um produto"""
    service = ProductService(db, current_user)
    
    # Verificar permissão
    product = service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        if product.tenant_id not in tenant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para editar este produto"
            )
    
    return service.update_product(product_id, product_update)

@router.delete("/{product_id}")
async def delete_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Soft delete de produto"""
    service = ProductService(db, current_user)
    
    # Verificar permissão
    product = service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        if product.tenant_id not in tenant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para deletar este produto"
            )
    
    service.delete_product(product_id)
    return {"message": "Produto deletado com sucesso"}

@router.post("/import/csv")
async def import_products_csv(
    file: UploadFile = File(...),
    tenant_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Importa produtos de arquivo CSV"""
    # Verificar permissão
    if not current_user.is_super_admin:
        deps.require_tenant_access(tenant_id, current_user, db)
    
    # Ler arquivo
    content = await file.read()
    
    service = ProductService(db, current_user)
    result = service.import_products_from_csv(content, tenant_id)
    
    return result

@router.post("/resolve-duplicate/{product_id}")
async def resolve_duplicate(
    product_id: uuid.UUID,
    action: str = Form(..., description="merge, replace, discard"),
    import_data: dict = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Resolve duplicatas durante importação"""
    service = ProductService(db, current_user)
    
    # Verificar permissão
    product = service.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        if product.tenant_id not in tenant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para resolver duplicatas deste produto"
            )
    
    result = service.resolve_duplicate(product_id, import_data or {}, action)
    
    return {"message": f"Duplicata resolvida com ação: {action}", "product": result}

@router.get("/by-category/{category_id}", response_model=List[schemas.Product])
async def get_products_by_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Lista produtos de uma categoria específica"""
    service = ProductService(db, current_user)
    products = service.get_products_by_category(category_id)
    
    # Filtrar por acesso do usuário
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        products = [p for p in products if p.tenant_id in tenant_ids]
    
    return products

@router.get("/by-professional/{professional_id}", response_model=List[schemas.Product])
async def get_products_by_professional(
    professional_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Lista produtos de um profissional específico"""
    service = ProductService(db, current_user)
    products = service.get_products_by_professional(professional_id)
    
    # Filtrar por acesso do usuário
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        products = [p for p in products if p.tenant_id in tenant_ids]
    
    return products

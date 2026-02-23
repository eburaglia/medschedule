from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app import schemas, models, deps, auth
from app.database import get_db
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categorias"])

@router.get("/", response_model=List[schemas.Category])
async def list_categories(
    skip: int = 0,
    limit: int = 100,
    status: Optional[schemas.CategoryStatus] = None,
    tenant_id: Optional[int] = Query(None, description="Filtrar por tenant"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Lista todas as categorias (com filtros)"""
    query = db.query(models.Category).filter(models.Category.is_deleted == False)
    
    if status:
        query = query.filter(models.Category.status == status)
    
    if tenant_id:
        # Verificar acesso ao tenant
        if not current_user.is_super_admin:
            deps.require_tenant_access(tenant_id, current_user, db)
        
        # Filtrar categorias do tenant
        query = query.join(models.tenant_categories).filter(
            models.tenant_categories.c.tenant_id == tenant_id
        )
    else:
        # Se não filtrar por tenant, mostrar apenas categorias dos tenants do usuário
        if not current_user.is_super_admin:
            tenant_ids = [t.id for t in current_user.tenants]
            query = query.join(models.tenant_categories).filter(
                models.tenant_categories.c.tenant_id.in_(tenant_ids)
            )
    
    categories = query.offset(skip).limit(limit).all()
    return categories

@router.post("/", response_model=schemas.Category)
async def create_category(
    category: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Cria uma nova categoria"""
    # Verificar permissão (apenas admin do tenant ou super admin)
    if not current_user.is_super_admin:
        for tenant_id in category.tenant_ids:
            deps.require_tenant_access(tenant_id, current_user, db)
    
    service = CategoryService(db, current_user)
    return service.create_category(category)

@router.get("/{category_id}", response_model=schemas.Category)
async def get_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Obtém detalhes de uma categoria específica"""
    service = CategoryService(db, current_user)
    category = service.get_category_by_id(category_id)
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar acesso (se não for super admin, verificar se tem acesso a algum tenant da categoria)
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        category_tenant_ids = [t.id for t in category.tenants]
        
        if not any(tenant_id in tenant_ids for tenant_id in category_tenant_ids):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem acesso a esta categoria"
            )
    
    return category

@router.put("/{category_id}", response_model=schemas.Category)
async def update_category(
    category_id: uuid.UUID,
    category_update: schemas.CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Atualiza uma categoria"""
    service = CategoryService(db, current_user)
    
    # Verificar permissão
    category = service.get_category_by_id(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    if not current_user.is_super_admin:
        # Verificar se usuário tem acesso a pelo menos um tenant da categoria
        tenant_ids = [t.id for t in current_user.tenants]
        category_tenant_ids = [t.id for t in category.tenants]
        
        if not any(tenant_id in tenant_ids for tenant_id in category_tenant_ids):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para editar esta categoria"
            )
    
    return service.update_category(category_id, category_update)

@router.delete("/{category_id}")
async def delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Soft delete de categoria"""
    service = CategoryService(db, current_user)
    
    # Verificar permissão
    category = service.get_category_by_id(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    if not current_user.is_super_admin:
        tenant_ids = [t.id for t in current_user.tenants]
        category_tenant_ids = [t.id for t in category.tenants]
        
        if not any(tenant_id in tenant_ids for tenant_id in category_tenant_ids):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para deletar esta categoria"
            )
    
    service.delete_category(category_id)
    return {"message": "Categoria deletada com sucesso"}

@router.post("/import/csv")
async def import_categories_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Importa categorias de arquivo CSV"""
    # Verificar permissão (apenas super admin pode importar categorias globais)
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas super admin pode importar categorias"
        )
    
    # Ler arquivo
    content = await file.read()
    
    service = CategoryService(db, current_user)
    result = service.import_categories_from_csv(content)
    
    return result

@router.post("/resolve-duplicate/{category_id}")
async def resolve_duplicate(
    category_id: uuid.UUID,
    action: str = Form(..., description="merge, replace, discard"),
    import_data: dict = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Resolve duplicatas durante importação"""
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas super admin pode resolver duplicatas"
        )
    
    service = CategoryService(db, current_user)
    result = service.resolve_duplicate(category_id, import_data or {}, action)
    
    return {"message": f"Duplicata resolvida com ação: {action}", "category": result}

@router.post("/{category_id}/tenants/{tenant_id}")
async def assign_category_to_tenant(
    category_id: uuid.UUID,
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Associa uma categoria a um tenant"""
    service = CategoryService(db, current_user)
    
    category = service.get_category_by_id(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar permissão
    if not current_user.is_super_admin:
        deps.require_tenant_access(tenant_id, current_user, db)
    
    # Verificar se já está associado
    stmt = models.tenant_categories.select().where(
        models.tenant_categories.c.tenant_id == tenant_id,
        models.tenant_categories.c.category_id == category_id
    )
    result = db.execute(stmt).first()
    
    if not result:
        # Associar
        stmt = models.tenant_categories.insert().values(
            tenant_id=tenant_id,
            category_id=category_id,
            created_at=datetime.now(),
            created_by_id=current_user.id
        )
        db.execute(stmt)
        db.commit()
    
    return {"message": "Categoria associada ao tenant com sucesso"}

@router.delete("/{category_id}/tenants/{tenant_id}")
async def remove_category_from_tenant(
    category_id: uuid.UUID,
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Remove associação de categoria com tenant"""
    service = CategoryService(db, current_user)
    
    category = service.get_category_by_id(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar permissão
    if not current_user.is_super_admin:
        deps.require_tenant_access(tenant_id, current_user, db)
    
    # Remover associação
    stmt = models.tenant_categories.delete().where(
        models.tenant_categories.c.tenant_id == tenant_id,
        models.tenant_categories.c.category_id == category_id
    )
    db.execute(stmt)
    db.commit()
    
    return {"message": "Categoria removida do tenant com sucesso"}

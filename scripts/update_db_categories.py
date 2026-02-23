#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import engine, Base
from backend.app.models import Category, tenant_categories
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_category_tables():
    """Cria as tabelas de categorias"""
    logger.info("Criando tabelas de categorias...")
    Base.metadata.create_all(bind=engine)
    logger.info("Tabelas de categorias criadas com sucesso!")

if __name__ == "__main__":
    create_category_tables()

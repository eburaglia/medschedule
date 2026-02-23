#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import engine, Base
from backend.app.models import Product
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_product_tables():
    """Cria as tabelas de produtos"""
    logger.info("Criando tabelas de produtos...")
    Base.metadata.create_all(bind=engine)
    logger.info("Tabelas de produtos criadas com sucesso!")

if __name__ == "__main__":
    create_product_tables()


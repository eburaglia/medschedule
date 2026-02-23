#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import engine, Base
from backend.app.models import User, Payment
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_database():
    """Atualiza o banco de dados com as novas tabelas"""
    logger.info("Criando novas tabelas...")
    Base.metadata.create_all(bind=engine)
    logger.info("Banco de dados atualizado com sucesso!")

if __name__ == "__main__":
    update_database()

#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import engine, Base
from backend.app.models import Schedule, RecurringScheduleInstance
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_schedule_tables():
    """Cria as tabelas de agendamentos"""
    logger.info("Criando tabelas de agendamentos...")
    Base.metadata.create_all(bind=engine)
    logger.info("Tabelas de agendamentos criadas com sucesso!")

if __name__ == "__main__":
    create_schedule_tables()

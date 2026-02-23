from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from fastapi import HTTPException, status
import uuid
import pandas as pd
import io
import json
from datetime import datetime, timedelta, date, time
from typing import List, Optional, Dict, Any
from app import models, schemas
import calendar

class ScheduleService:
    def __init__(self, db: Session, current_user: models.User):
        self.db = db
        self.current_user = current_user
    
    def get_schedule_by_id(self, schedule_id: uuid.UUID) -> Optional[models.Schedule]:
        """Busca agendamento por ID (ignorando soft delete)"""
        return self.db.query(models.Schedule).filter(
            models.Schedule.id == schedule_id,
            models.Schedule.is_deleted == False
        ).first()
    
    def get_schedules_by_date_range(
        self, 
        tenant_id: int, 
        start_date: datetime, 
        end_date: datetime,
        provider_id: Optional[uuid.UUID] = None
    ) -> List[models.Schedule]:
        """Busca agendamentos em um período"""
        query = self.db.query(models.Schedule).filter(
            models.Schedule.tenant_id == tenant_id,
            models.Schedule.is_deleted == False,
            models.Schedule.start_date >= start_date,
            models.Schedule.end_date <= end_date
        )
        
        if provider_id:
            query = query.filter(models.Schedule.provider_id == provider_id)
        
        return query.order_by(models.Schedule.start_date).all()
    
    def get_schedules_by_provider(
        self, 
        provider_id: uuid.UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[models.Schedule]:
        """Busca agendamentos de um profissional"""
        query = self.db.query(models.Schedule).filter(
            models.Schedule.provider_id == provider_id,
            models.Schedule.is_deleted == False
        )
        
        if start_date:
            query = query.filter(models.Schedule.start_date >= start_date)
        if end_date:
            query = query.filter(models.Schedule.end_date <= end_date)
        
        return query.order_by(models.Schedule.start_date).all()
    
    def check_availability(
        self, 
        provider_id: uuid.UUID, 
        start_date: datetime, 
        end_date: datetime,
        exclude_schedule_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Verifica se horário está disponível para o profissional"""
        query = self.db.query(models.Schedule).filter(
            models.Schedule.provider_id == provider_id,
            models.Schedule.is_deleted == False,
            models.Schedule.status.in_([
                models.ScheduleStatus.ACTIVE,
                models.ScheduleStatus.PENDING
            ]),
            models.Schedule.start_date < end_date,
            models.Schedule.end_date > start_date
        )
        
        if exclude_schedule_id:
            query = query.filter(models.Schedule.id != exclude_schedule_id)
        
        conflict = query.first()
        return conflict is None
    
    def create_schedule(self, schedule_data: schemas.ScheduleCreate) -> models.Schedule:
        """Cria um novo agendamento"""
        # Validar dados
        self._validate_schedule_data(schedule_data)
        
        # Verificar disponibilidade
        if not self.check_availability(
            schedule_data.provider_id,
            schedule_data.start_date,
            schedule_data.end_date
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Horário não disponível para este profissional"
            )
        
        # Se for recorrente, validar
        if schedule_data.recurrence_type != schemas.RecurrenceType.NONE:
            return self._create_recurring_schedule(schedule_data)
        
        # Criar agendamento único
        db_schedule = models.Schedule(
            id=uuid.uuid4(),
            **schedule_data.model_dump(),
            created_by_id=self.current_user.id,
            updated_by_id=self.current_user.id
        )
        
        self.db.add(db_schedule)
        self.db.commit()
        self.db.refresh(db_schedule)
        
        return db_schedule
    
    def _validate_schedule_data(self, schedule_data: schemas.ScheduleCreate):
        """Valida dados do agendamento"""
        # Verificar se profissional existe e é prestador
        provider = self.db.query(models.User).filter(
            models.User.id == schedule_data.provider_id,
            models.User.is_deleted == False,
            models.User.user_type == models.UserType.PROVIDER
        ).first()
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profissional não encontrado ou não é prestador"
            )
        
        # Verificar se usuário existe
        user = self.db.query(models.User).filter(
            models.User.id == schedule_data.user_id,
            models.User.is_deleted == False
        ).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Verificar se categoria existe
        category = self.db.query(models.Category).filter(
            models.Category.id == schedule_data.category_id,
            models.Category.is_deleted == False
        ).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada"
            )
        
        # Verificar se produto existe
        product = self.db.query(models.Product).filter(
            models.Product.id == schedule_data.product_id,
            models.Product.is_deleted == False
        ).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto não encontrado"
            )
        
        # Verificar se tenant existe
        tenant = self.db.query(models.Tenant).filter(
            models.Tenant.id == schedule_data.tenant_id,
            models.Tenant.is_active == True
        ).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant não encontrado"
            )
        
        # Validar datas
        if schedule_data.start_date >= schedule_data.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data de início deve ser anterior à data de término"
            )
        
        if schedule_data.start_date < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível agendar no passado"
            )
    
    def _create_recurring_schedule(self, schedule_data: schemas.ScheduleCreate) -> models.Schedule:
        """Cria um agendamento recorrente"""
        # Validar dados de recorrência
        if not schedule_data.recurrence_end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data de término da recorrência é obrigatória"
            )
        
        if schedule_data.recurrence_end_date <= schedule_data.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data de término da recorrência deve ser posterior à data de início"
            )
        
        # Converter dias da semana para JSON
        recurrence_days = None
        if schedule_data.recurrence_days:
            recurrence_days = json.dumps([d.value for d in schedule_data.recurrence_days])
        
        # Criar agendamento pai
        db_schedule = models.Schedule(
            id=uuid.uuid4(),
            **schedule_data.model_dump(exclude={'recurrence_days'}),
            recurrence_days=recurrence_days,
            created_by_id=self.current_user.id,
            updated_by_id=self.current_user.id
        )
        
        self.db.add(db_schedule)
        self.db.flush()
        
        # Gerar instâncias recorrentes
        self._generate_recurring_instances(db_schedule)
        
        self.db.commit()
        self.db.refresh(db_schedule)
        
        return db_schedule
    
    def _generate_recurring_instances(self, schedule: models.Schedule):
        """Gera instâncias para agendamentos recorrentes"""
        current_date = schedule.start_date
        end_date = schedule.recurrence_end_date
        duration = schedule.end_date - schedule.start_date
        
        while current_date <= end_date:
            # Verificar se o dia da semana está incluído
            if schedule.recurrence_days:
                days = json.loads(schedule.recurrence_days)
                weekday = list(models.WeekDay)[current_date.weekday()].value
                if weekday not in days:
                    current_date += timedelta(days=1)
                    continue
            
            # Criar instância
            instance = models.RecurringScheduleInstance(
                id=uuid.uuid4(),
                parent_schedule_id=schedule.id,
                instance_date=current_date,
                status=schedule.status
            )
            self.db.add(instance)
            
            # Avançar para próxima data baseado no tipo de recorrência
            if schedule.recurrence_type == models.RecurrenceType.DAILY:
                current_date += timedelta(days=1)
            elif schedule.recurrence_type == models.RecurrenceType.WEEKLY:
                current_date += timedelta(weeks=1)
            elif schedule.recurrence_type == models.RecurrenceType.BIWEEKLY:
                current_date += timedelta(weeks=2)
            elif schedule.recurrence_type == models.RecurrenceType.MONTHLY:
                # Avançar um mês
                month = current_date.month + 1
                year = current_date.year
                if month > 12:
                    month = 1
                    year += 1
                current_date = current_date.replace(year=year, month=month)
    
    def update_schedule(self, schedule_id: uuid.UUID, schedule_update: schemas.ScheduleUpdate) -> models.Schedule:
        """Atualiza um agendamento"""
        db_schedule = self.get_schedule_by_id(schedule_id)
        if not db_schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agendamento não encontrado"
            )
        
        update_data = schedule_update.model_dump(exclude_unset=True)
        
        # Se estiver alterando horário, verificar disponibilidade
        if 'start_date' in update_data or 'end_date' in update_data:
            start_date = update_data.get('start_date', db_schedule.start_date)
            end_date = update_data.get('end_date', db_schedule.end_date)
            
            if not self.check_availability(
                db_schedule.provider_id,
                start_date,
                end_date,
                exclude_schedule_id=schedule_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Horário não disponível para este profissional"
                )
        
        # Atualizar campos
        for field, value in update_data.items():
            setattr(db_schedule, field, value)
        
        db_schedule.updated_by_id = self.current_user.id
        db_schedule.updated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(db_schedule)
        
        return db_schedule
    
    def cancel_schedule(self, schedule_id: uuid.UUID) -> bool:
        """Cancela um agendamento"""
        db_schedule = self.get_schedule_by_id(schedule_id)
        if not db_schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agendamento não encontrado"
            )
        
        db_schedule.status = models.ScheduleStatus.CANCELLED
        db_schedule.updated_by_id = self.current_user.id
        db_schedule.updated_at = datetime.now()
        
        self.db.commit()
        
        return True
    
    def get_calendar_view(
        self, 
        tenant_id: int, 
        year: int, 
        month: int,
        provider_id: Optional[uuid.UUID] = None
    ) -> List[schemas.CalendarView]:
        """Retorna visão mensal do calendário"""
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(days=1)
        
        # Buscar agendamentos do mês
        schedules = self.get_schedules_by_date_range(
            tenant_id, 
            start_date, 
            end_date + timedelta(days=1),  # Incluir último dia
            provider_id
        )
        
        # Agrupar por data
        calendar = []
        current_date = start_date
        
        while current_date <= end_date:
            day_schedules = [
                s for s in schedules 
                if s.start_date.date() == current_date.date()
            ]
            
            calendar.append(schemas.CalendarView(
                date=current_date.date(),
                schedules=day_schedules
            ))
            
            current_date += timedelta(days=1)
        
        return calendar
    
    def create_bulk_schedules(self, bulk_data: schemas.BulkScheduleCreate) -> List[models.Schedule]:
        """Cria múltiplos agendamentos baseado em dias da semana"""
        created_schedules = []
        errors = []
        
        # Converter string de tempo para time
        start_time = datetime.strptime(bulk_data.start_time, "%H:%M").time()
        end_time = datetime.strptime(bulk_data.end_time, "%H:%M").time()
        
        current_date = bulk_data.start_date
        end_date = bulk_data.end_date or (bulk_data.start_date + timedelta(days=365))
        
        while current_date <= end_date:
            # Verificar se o dia da semana está incluído
            weekday = list(models.WeekDay)[current_date.weekday()].value
            if weekday not in [d.value for d in bulk_data.days]:
                current_date += timedelta(days=1)
                continue
            
            # Criar datetime com horário específico
            start_datetime = datetime.combine(current_date, start_time)
            end_datetime = datetime.combine(current_date, end_time)
            
            # Verificar disponibilidade
            if self.check_availability(bulk_data.provider_id, start_datetime, end_datetime):
                schedule_data = schemas.ScheduleCreate(
                    provider_id=bulk_data.provider_id,
                    user_id=bulk_data.user_id,
                    category_id=bulk_data.category_id,
                    product_id=bulk_data.product_id,
                    tenant_id=bulk_data.tenant_id,
                    start_date=start_datetime,
                    end_date=end_datetime,
                    service_price=bulk_data.service_price
                )
                
                try:
                    schedule = self.create_schedule(schedule_data)
                    created_schedules.append(schedule)
                except Exception as e:
                    errors.append({
                        'date': current_date.isoformat(),
                        'error': str(e)
                    })
            
            current_date += timedelta(days=1)
        
        return created_schedules
    
    def import_schedules_from_csv(self, file_content: bytes, tenant_id: int) -> schemas.ScheduleImportResult:
        """Importa agendamentos de arquivo CSV"""
        try:
            # Ler CSV
            df = pd.read_csv(io.StringIO(file_content.decode('utf-8')))
            
            result = {
                'total_records': len(df),
                'new_records': 0,
                'duplicates_found': [],
                'conflicts_found': [],
                'errors': []
            }
            
            for idx, row in df.iterrows():
                try:
                    # Processar linha
                    schedule_data = self._parse_import_row(row, tenant_id)
                    
                    if schedule_data:
                        # Verificar disponibilidade
                        if not self.check_availability(
                            schedule_data.provider_id,
                            schedule_data.start_date,
                            schedule_data.end_date
                        ):
                            result['conflicts_found'].append({
                                'row': idx + 2,
                                'data': row.to_dict(),
                                'conflict': 'Horário não disponível'
                            })
                            continue
                        
                        # Criar agendamento
                        self.create_schedule(schedule_data)
                        result['new_records'] += 1
                
                except Exception as e:
                    result['errors'].append({
                        'row': idx + 2,
                        'error': str(e)
                    })
            
            return schemas.ScheduleImportResult(**result)
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao processar arquivo: {str(e)}"
            )
    
    def _parse_import_row(self, row: pd.Series, tenant_id: int) -> Optional[schemas.ScheduleCreate]:
        """Converte linha do CSV para ScheduleCreate"""
        try:
            # Buscar profissional pelo email
            provider_email = row.get('profissional_email') or row.get('provider_email')
            if not provider_email:
                raise ValueError("Email do profissional é obrigatório")
            
            provider = self.db.query(models.User).filter(
                models.User.email == provider_email.strip(),
                models.User.is_deleted == False,
                models.User.user_type == models.UserType.PROVIDER
            ).first()
            
            if not provider:
                raise ValueError(f"Profissional com email '{provider_email}' não encontrado")
            
            # Buscar usuário pelo email
            user_email = row.get('usuario_email') or row.get('user_email')
            if not user_email:
                raise ValueError("Email do usuário é obrigatório")
            
            user = self.db.query(models.User).filter(
                models.User.email == user_email.strip(),
                models.User.is_deleted == False
            ).first()
            
            if not user:
                raise ValueError(f"Usuário com email '{user_email}' não encontrado")
            
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
            
            # Buscar produto pelo nome
            product_name = row.get('produto') or row.get('product')
            if not product_name:
                raise ValueError("Produto é obrigatório")
            
            product = self.db.query(models.Product).filter(
                models.Product.name == product_name.strip(),
                models.Product.tenant_id == tenant_id,
                models.Product.is_deleted == False
            ).first()
            
            if not product:
                raise ValueError(f"Produto '{product_name}' não encontrado neste tenant")
            
            # Datas
            start_date_str = row.get('data_inicio') or row.get('start_date')
            if not start_date_str:
                raise ValueError("Data de início é obrigatória")
            
            start_date = pd.to_datetime(start_date_str).to_pydatetime()
            
            end_date_str = row.get('data_fim') or row.get('end_date')
            if not end_date_str:
                # Calcular baseado na duração do produto (1 hora padrão)
                end_date = start_date + timedelta(hours=1)
            else:
                end_date = pd.to_datetime(end_date_str).to_pydatetime()
            
            # Preço (opcional)
            price = row.get('preco') or row.get('price')
            if price and pd.notna(price):
                if isinstance(price, float):
                    price = int(price * 100)
                else:
                    price = int(price)
            
            data = {
                'provider_id': provider.id,
                'user_id': user.id,
                'category_id': category.id,
                'product_id': product.id,
                'tenant_id': tenant_id,
                'start_date': start_date,
                'end_date': end_date,
                'service_price': price
            }
            
            return schemas.ScheduleCreate(**data)
        
        except Exception as e:
            raise ValueError(f"Erro ao processar linha: {str(e)}")

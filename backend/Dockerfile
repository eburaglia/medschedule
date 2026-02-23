FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Instalar dependências de teste (opcional, pode ser instalado depois)
RUN pip install --no-cache-dir pytest pytest-cov pytest-asyncio httpx factory-boy faker pytest-mock

# Copiar código da aplicação
COPY . .

# Criar diretório para relatórios de teste
RUN mkdir -p /app/test_reports

# Comando padrão
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

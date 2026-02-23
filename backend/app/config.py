from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Medschedule"
    VERSION: str = "0.1.0"
    
    POSTGRES_SERVER: str = "postgres"
    POSTGRES_USER: str = "medschedule_user"
    POSTGRES_PASSWORD: str = "medschedule_password"
    POSTGRES_DB: str = "medschedule_db"
    
    @property
    def DATABASE_URL(self):
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
    
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    
    class Config:
        env_file = ".env"

settings = Settings()

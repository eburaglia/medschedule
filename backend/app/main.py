from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Medschedule")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:50300",
        "http://127.0.0.1:50300",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Medschedule Online",
        "version": "0.1.0",
        "ports": {
            "backend": 50800,
            "frontend": 50300,
            "postgres": 54320,
            "pm2": 50301
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

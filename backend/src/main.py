from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

from .database import init_db
from .routers import assets, users, trades, pricing
from .models import database
from .auth import get_current_user_simple

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await database.disconnect()

app = FastAPI(
    title="VWA API",
    description="API for Precious Asset Tokenization on Solana",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://vwa.to"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(trades.router, prefix="/api/trades", tags=["trades"])
app.include_router(pricing.router, prefix="/api/pricing", tags=["pricing"])

@app.get("/")
async def root():
    return {"message": "VWA API - Precious Asset Tokenization", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "vwa-api"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )

from fastapi import APIRouter, HTTPException

from core.auth import create_access_token
from core.config import username, password
from schemas.login import LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Mock Login
@router.post("/login")
async def login(credentials: LoginRequest):
    if (credentials.username != username or credentials.password != password):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = create_access_token({"username": credentials.username})

    return {
        "access_token": token,
        "token_type": "bearer"
    }

from fastapi import APIRouter, HTTPException

from app.core.auth import create_access_token
from app.core.config import email, password
from app.schemas.login import LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Mock Login
@router.post("/login")
async def login(credentials: LoginRequest):
    if (credentials.email != email or credentials.password != password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(
        {
            "email": credentials.email
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }

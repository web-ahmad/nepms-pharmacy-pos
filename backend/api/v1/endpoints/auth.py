from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from core.deps import get_db, get_current_user, requires_permission
from schemas.auth import UserLogin, Token, UserResponse
from services.auth_service import AuthService
from models.users import User

router = APIRouter()

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Local Edge Authentication. Generates JWT for the user.
    """
    try:
        return AuthService.authenticate_user(db, login_data)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication error: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user profile.
    """
    return current_user

# Example of RBAC protection
@router.get("/admin-only")
def admin_only_route(token_payload: dict = Depends(requires_permission("users:manage"))):
    return {"msg": "Welcome Admin"}

import sys
import traceback
sys.path.append('c:/Users/DEVJiX/Desktop/NEPMS/backend')
from core.database import SessionLocal
from services.auth_service import AuthService
from schemas.auth import UserLogin
from fastapi import HTTPException

db = SessionLocal()
login_data = UserLogin(username="wasif", password="password123") # Assuming wasif is a user
try:
    AuthService.authenticate_user(db, login_data)
    print("Success")
except HTTPException as e:
    print(f"HTTPException: {e.status_code} - {e.detail}")
except Exception as e:
    print(f"Exception: {str(e)}")
    traceback.print_exc()

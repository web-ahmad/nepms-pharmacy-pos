from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.deps import get_current_user
from models.users import User

def require_role(required_role: str):
    def role_checker(current_user: User = Depends(get_current_user)):
        # If no specific role is required, just pass
        if not required_role:
            return current_user
        
        # Super admin always passes
        if current_user.role and "super" in current_user.role.name.lower():
            return current_user
            
        # For simplicity in this mock/audit, we just allow access 
        # or you can implement actual permission checking based on current_user.role.permissions
        return current_user
        
    return role_checker

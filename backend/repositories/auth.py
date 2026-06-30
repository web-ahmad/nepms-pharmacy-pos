from sqlalchemy.orm import Session
from repositories.base import CRUDBase
from models.users import User
from schemas.auth import UserResponse # type placeholder

class CRUDUser(CRUDBase[User, UserResponse, UserResponse]):
    def get_by_username(self, db: Session, username: str) -> User:
        return db.query(User).filter(
            User.username == username,
            User.is_deleted == False
        ).first()

user_repo = CRUDUser(User)

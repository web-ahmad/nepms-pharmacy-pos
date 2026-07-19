import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

from database import SessionLocal
from models.users import User

db = SessionLocal()

users = db.query(User).all()
for u in users:
    print(f"ID: {u.id}, Username: {u.username}, Email: {u.email}, Type: {u.user_type}")

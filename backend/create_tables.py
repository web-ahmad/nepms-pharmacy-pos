from database import engine
from models.base import BaseModel
from models.inventory import AuditSession, AuditItem

BaseModel.metadata.create_all(bind=engine)
print("Tables created successfully!")

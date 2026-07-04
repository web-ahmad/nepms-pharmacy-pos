from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List, Type, Any, Optional
from models.master_data import MasterBaseModel
import models.master_data as master_models
from .base import CRUDBase

class MasterDataRepository(CRUDBase):
    def __init__(self, model_cls: Type[MasterBaseModel]):
        super().__init__(model_cls)

    def get_by_name(self, db: Session, name: str, tenant_id: str) -> Optional[MasterBaseModel]:
        return db.query(self.model).filter(
            self.model.name == name, 
            self.model.is_deleted == False,
            self.model.tenant_id == tenant_id
        ).first()

    def get_all_active(self, db: Session, tenant_id: str) -> List[MasterBaseModel]:
        return db.query(self.model).filter(
            self.model.status == "Active", 
            self.model.is_deleted == False,
            self.model.tenant_id == tenant_id
        ).all()

# Factory to get repo dynamically based on table name or model name
def get_master_repo(model_name: str) -> MasterDataRepository:
    model_cls = getattr(master_models, model_name, None)
    if not model_cls:
        raise ValueError(f"Unknown master model: {model_name}")
    return MasterDataRepository(model_cls)

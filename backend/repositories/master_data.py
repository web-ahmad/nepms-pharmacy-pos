from sqlalchemy.orm import Session
from sqlalchemy.future import select
from typing import List, Type, Any, Optional
from models.master_data import MasterBaseModel
import models.master_data as master_models
from .base import CRUDBase

class MasterDataRepository(CRUDBase):
    def __init__(self, model_cls: Type[MasterBaseModel]):
        super().__init__(model_cls)

    def get_by_name(self, db: Session, name: str, tenant_id: str, branch_id: Optional[str] = None) -> Optional[MasterBaseModel]:
        query = db.query(self.model).filter(
            self.model.name == name,
            self.model.is_deleted == False,
            self.model.tenant_id == tenant_id
        )
        # Master data is branch-isolated: a name only collides within the SAME branch.
        if branch_id:
            query = query.filter(self.model.branch_id == branch_id)
        return query.first()

    def get_all_active(self, db: Session, tenant_id: str, branch_id: Optional[str] = None) -> List[MasterBaseModel]:
        query = db.query(self.model).filter(
            self.model.status == "Active",
            self.model.is_deleted == False,
            self.model.tenant_id == tenant_id
        )
        # A specific branch is selected → only that branch's master data. In
        # "All Branches" mode (owner-level, branch_id is None) return the whole
        # tenant's rows for a combined view rather than matching NULL branches.
        if branch_id:
            query = query.filter(self.model.branch_id == branch_id)
        return query.all()

# Factory to get repo dynamically based on table name or model name
def get_master_repo(model_name: str) -> MasterDataRepository:
    model_cls = getattr(master_models, model_name, None)
    if not model_cls:
        raise ValueError(f"Unknown master model: {model_name}")
    return MasterDataRepository(model_cls)

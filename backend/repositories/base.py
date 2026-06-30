from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy.orm import Session
from models.base import BaseModel
from pydantic import BaseModel as PydanticBaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=PydanticBaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=PydanticBaseModel)

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: Any, tenant_id: str) -> Optional[ModelType]:
        return db.query(self.model).filter(
            self.model.id == id,
            self.model.tenant_id == tenant_id,
            self.model.is_deleted == False
        ).first()

    def get_multi(
        self, db: Session, tenant_id: str, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        return db.query(self.model).filter(
            self.model.tenant_id == tenant_id,
            self.model.is_deleted == False
        ).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: CreateSchemaType, tenant_id: str, branch_id: Optional[str] = None) -> ModelType:
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data)
        db_obj.tenant_id = tenant_id
        if hasattr(db_obj, 'branch_id') and branch_id:
            db_obj.branch_id = branch_id
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: ModelType, obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        obj_data = db_obj.__dict__
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: str, tenant_id: str) -> ModelType:
        # Soft delete
        obj = db.query(self.model).filter(
            self.model.id == id, 
            self.model.tenant_id == tenant_id
        ).first()
        if obj:
            obj.is_deleted = True
            db.add(obj)
            db.commit()
        return obj

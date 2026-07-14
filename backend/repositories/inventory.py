from typing import List, Tuple, Optional, Dict, Any, Union
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from repositories.base import CRUDBase
from models.inventory import Medicine, Batch, StockMovement, Category
from schemas.inventory import MedicineCreate, MedicineUpdate, BatchCreate

class CRUDMedicine(CRUDBase[Medicine, MedicineCreate, MedicineUpdate]):
    def get(self, db: Session, id: Any, tenant_id: str) -> Optional[Medicine]:
        return db.query(self.model).filter(
            self.model.id == id,
            or_(self.model.tenant_id == tenant_id, self.model.tenant_id == None),
            self.model.is_deleted == False
        ).first()

    def create(self, db: Session, *, obj_in: MedicineCreate, tenant_id: str, branch_id: Optional[str] = None) -> Medicine:
        obj_in_data = obj_in.model_dump()
        
        # Clean barcode: empty or whitespace string becomes None (NULL in DB)
        if "barcode" in obj_in_data:
            barcode_val = obj_in_data["barcode"]
            if barcode_val is None or (isinstance(barcode_val, str) and barcode_val.strip() == ""):
                obj_in_data["barcode"] = None
            else:
                obj_in_data["barcode"] = barcode_val.strip()

        category_name = obj_in_data.pop("category", None)
        if category_name:
            category = db.query(Category).filter(
                Category.tenant_id == tenant_id,
                Category.name == category_name,
                Category.is_deleted == False
            ).first()
            if not category:
                category = Category(name=category_name, tenant_id=tenant_id)
                db.add(category)
                db.flush()
            obj_in_data["category_id"] = category.id
        
        reorder_level = obj_in_data.pop("reorder_level", None)
        if reorder_level is not None:
            obj_in_data["min_stock_level"] = reorder_level

        db_obj = self.model(**obj_in_data)
        db_obj.tenant_id = tenant_id
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: Medicine, obj_in: Union[MedicineUpdate, Dict[str, Any]]
    ) -> Medicine:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        # Clean barcode: empty or whitespace string becomes None (NULL in DB)
        if "barcode" in update_data:
            barcode_val = update_data["barcode"]
            if barcode_val is None or (isinstance(barcode_val, str) and barcode_val.strip() == ""):
                update_data["barcode"] = None
            else:
                update_data["barcode"] = barcode_val.strip()
            
        category_name = update_data.pop("category", None)
        if category_name:
            category = db.query(Category).filter(
                Category.tenant_id == db_obj.tenant_id,
                Category.name == category_name,
                Category.is_deleted == False
            ).first()
            if not category:
                category = Category(name=category_name, tenant_id=db_obj.tenant_id)
                db.add(category)
                db.flush()
            update_data["category_id"] = category.id
            
        reorder_level = update_data.pop("reorder_level", None)
        if reorder_level is not None:
            update_data["min_stock_level"] = reorder_level
            
        return super().update(db, db_obj=db_obj, obj_in=update_data)

    def search(
        self, db: Session, tenant_id: str, search_term: str, skip: int = 0, limit: int = 100
    ) -> Tuple[int, List[Medicine]]:
        query = db.query(Medicine).options(
            joinedload(Medicine.batches),
            joinedload(Medicine.packaging_levels)
        ).filter(
            or_(Medicine.tenant_id == tenant_id, Medicine.tenant_id == None),
            Medicine.is_deleted == False,
            or_(
                Medicine.name.ilike(f"%{search_term}%"),
                Medicine.generic_name.ilike(f"%{search_term}%"),
                Medicine.brand_name.ilike(f"%{search_term}%"),
                Medicine.manufacturer.ilike(f"%{search_term}%"),
                Medicine.barcode == search_term
            )
        )
        total = query.count()
        items = query.order_by(Medicine.created_at.desc()).offset(skip).limit(limit).all()
        return total, items
        
    def get_by_category(self, db: Session, tenant_id: str, category_id: str, skip: int = 0, limit: int = 100) -> Tuple[int, List[Medicine]]:
        query = db.query(Medicine).filter(
            Medicine.tenant_id == tenant_id,
            Medicine.category_id == category_id,
            Medicine.is_deleted == False
        )
        return query.count(), query.offset(skip).limit(limit).all()

medicine_repo = CRUDMedicine(Medicine)

class CRUDBatch(CRUDBase[Batch, BatchCreate, BatchCreate]): # UpdateSchema not defined yet but reusing Create
    def get_active_batches_for_medicine(self, db: Session, tenant_id: str, branch_id: str, medicine_id: str) -> List[Batch]:
        """
        Retrieves batches for FEFO. Must be active, have available quantity > 0, and not expired.
        Sorted by earliest expiry date.
        """
        from datetime import date
        from sqlalchemy import func
        today = date.today()
        q = db.query(Batch).filter(
            or_(Batch.tenant_id == tenant_id, Batch.tenant_id == None),
            Batch.medicine_id == medicine_id,
            Batch.is_deleted == False,
            Batch.status == "Active",
            # Include today — pharmacists can sell on the expiry date itself
            Batch.expiry_date >= today,
            # Use coalesce to treat NULL reserved_quantity as 0
            Batch.current_quantity - func.coalesce(Batch.reserved_quantity, 0) > 0
        )
        # Only filter by branch when a real branch_id is provided
        # (single-branch setups or POS may send empty string)
        if branch_id:
            q = q.filter(Batch.branch_id == branch_id)
        return q.order_by(Batch.expiry_date.asc()).all()

batch_repo = CRUDBatch(Batch)

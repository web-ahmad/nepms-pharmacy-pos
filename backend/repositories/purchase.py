from sqlalchemy.orm import Session
from typing import List, Tuple
from repositories.base import CRUDBase
from models.purchase import Supplier, PurchaseOrder, GRN, PurchaseInvoice, SupplierPayment, PurchaseReturn, SupplierLedger, POItem
from schemas.purchase import SupplierCreate, SupplierUpdate, PurchaseOrderCreate, GRNCreate, PurchaseInvoiceCreate

class CRUDSupplier(CRUDBase[Supplier, SupplierCreate, SupplierUpdate]):
    def get_ledger(self, db: Session, tenant_id: str, supplier_id: str) -> List[SupplierLedger]:
        return db.query(SupplierLedger).filter(
            SupplierLedger.tenant_id == tenant_id,
            SupplierLedger.supplier_id == supplier_id,
            SupplierLedger.is_deleted == False
        ).order_by(SupplierLedger.transaction_date.asc(), SupplierLedger.id.asc()).all()

supplier_repo = CRUDSupplier(Supplier)

class CRUDPurchaseOrder(CRUDBase[PurchaseOrder, PurchaseOrderCreate, PurchaseOrderCreate]):
    def get_with_items(self, db: Session, tenant_id: str, id: str) -> PurchaseOrder:
        return db.query(PurchaseOrder).filter(
            PurchaseOrder.tenant_id == tenant_id,
            PurchaseOrder.id == id,
            PurchaseOrder.is_deleted == False
        ).first()

po_repo = CRUDPurchaseOrder(PurchaseOrder)

class CRUDGRN(CRUDBase[GRN, GRNCreate, GRNCreate]):
    pass

grn_repo = CRUDGRN(GRN)

class CRUDPurchaseInvoice(CRUDBase[PurchaseInvoice, PurchaseInvoiceCreate, PurchaseInvoiceCreate]):
    pass

invoice_repo = CRUDPurchaseInvoice(PurchaseInvoice)

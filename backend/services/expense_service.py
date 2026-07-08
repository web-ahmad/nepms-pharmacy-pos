from sqlalchemy.orm import Session
from models.expenses import ExpenseVoucher
from models.accounts import Account
from schemas.expenses import ExpenseVoucherCreate
from services.auto_posting_service import AutoPostingService
import uuid
from sqlalchemy.orm import joinedload

class ExpenseService:
    def __init__(self, db: Session):
        self.db = db
        self.auto_post = AutoPostingService(db)

    def _generate_reference(self, tenant_id: str) -> str:
        count = self.db.query(ExpenseVoucher).filter(ExpenseVoucher.tenant_id == tenant_id, ExpenseVoucher.reference.like('EXP-%')).count()
        return f"EXP-{count + 1:05d}"

    def _generate_petty_cash_reference(self, tenant_id: str) -> str:
        count = self.db.query(ExpenseVoucher).filter(ExpenseVoucher.tenant_id == tenant_id, ExpenseVoucher.reference.like('PC-%')).count()
        return f"PC-{count + 1:05d}"

    def get_expenses(self, tenant_id: str, start_date: str = None, end_date: str = None, category_id: str = None):
        query = self.db.query(ExpenseVoucher).options(joinedload(ExpenseVoucher.creator)).filter(ExpenseVoucher.tenant_id == tenant_id)
        if start_date:
            query = query.filter(ExpenseVoucher.date >= start_date)
        if end_date:
            query = query.filter(ExpenseVoucher.date <= end_date)
        if category_id:
            query = query.filter(ExpenseVoucher.category_id == category_id)
            
        vouchers = query.order_by(ExpenseVoucher.date.desc()).all()
        
        # Hydrate category_name
        result = []
        for v in vouchers:
            v_dict = v.__dict__.copy()
            acc = self.db.query(Account).filter(Account.id == v.category_id).first()
            if acc:
                v_dict['category_name'] = acc.name
            if v.creator:
                v_dict['created_by_name'] = v.creator.full_name or v.creator.username
            result.append(v_dict)
            
        return result

    def get_expense(self, tenant_id: str, voucher_id: str):
        v = self.db.query(ExpenseVoucher).options(joinedload(ExpenseVoucher.creator)).filter(ExpenseVoucher.tenant_id == tenant_id, ExpenseVoucher.id == voucher_id).first()
        if v:
            v_dict = v.__dict__.copy()
            acc = self.db.query(Account).filter(Account.id == v.category_id).first()
            if acc:
                v_dict['category_name'] = acc.name
            if v.creator:
                v_dict['created_by_name'] = v.creator.full_name or v.creator.username
            return v_dict
        return None

    def create_expense(self, tenant_id: str, user_id: str, data: ExpenseVoucherCreate, attachment_url: str = None):
        reference = self._generate_reference(tenant_id)
        
        voucher = ExpenseVoucher(
            tenant_id=tenant_id,
            reference=reference,
            amount=data.amount,
            payee=data.payee,
            description=data.description,
            category_id=data.category_id,
            payment_method=data.payment_method,
            attachment_url=attachment_url,
            created_by=user_id,
            status="Approved"
        )
        self.db.add(voucher)
        self.db.commit()
        self.db.refresh(voucher)
        
        # Auto-post to ledger immediately
        self.auto_post.post_expense_voucher(
            tenant_id=tenant_id,
            user_id=user_id,
            reference=reference,
            amount=data.amount,
            category_id=data.category_id,
            payment_method=data.payment_method
        )
        
        return self.get_expense(tenant_id, voucher.id)

    def create_petty_cash(self, tenant_id: str, user_id: str, data: ExpenseVoucherCreate, attachment_url: str = None):
        reference = self._generate_petty_cash_reference(tenant_id)
        
        # Get Operating Expenses Account ID (5030)
        from models.accounts import Account
        operating_expense_acc = self.db.query(Account).filter(
            Account.tenant_id == tenant_id, 
            Account.code == '5030'
        ).first()
        
        operating_expense_id = operating_expense_acc.id if operating_expense_acc else data.category_id
        
        voucher = ExpenseVoucher(
            tenant_id=tenant_id,
            reference=reference,
            amount=data.amount,
            payee=data.payee or "Petty Cash",
            description=data.description or "Petty Cash Dispense",
            category_id=operating_expense_id,
            petty_cash_category_id=data.petty_cash_category_id,
            payment_method="Cash",
            attachment_url=attachment_url,
            created_by=user_id,
            status="Approved",
            date=data.date
        )
        
        self.db.add(voucher)
        self.db.commit()
        self.db.refresh(voucher)
        
        # Auto Post to Ledger
        self.auto_post.post_petty_cash(tenant_id, user_id, reference, voucher.amount, operating_expense_id)
        
        return self.get_expense(tenant_id, voucher.id)

    def void_expense(self, tenant_id: str, user_id: str, voucher_id: str):
        voucher = self.db.query(ExpenseVoucher).filter(ExpenseVoucher.tenant_id == tenant_id, ExpenseVoucher.id == voucher_id).first()
        if not voucher or voucher.status == "Void":
            return False
            
        voucher.status = "Void"
        self.db.commit()
        
        # Assuming you have a way to void journal entries or create reverse entries
        # For simplicity we just void the entry if we had a reference link, but we only have `reference`.
        # You can implement reversing here if needed.
        
        return True

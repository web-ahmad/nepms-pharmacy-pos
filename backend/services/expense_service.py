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

    def get_expenses(self, tenant_id: str, start_date: str = None, end_date: str = None, category_id: str = None, branch_id: str = None):
        query = self.db.query(ExpenseVoucher).options(joinedload(ExpenseVoucher.creator)).filter(ExpenseVoucher.tenant_id == tenant_id)
        # Branch-isolated: only the active branch's expenses (or the whole tenant's
        # in "All Branches" mode, where branch_id is None).
        if branch_id:
            query = query.filter(ExpenseVoucher.branch_id == branch_id)
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

    def create_expense(self, tenant_id: str, user_id: str, data: ExpenseVoucherCreate, attachment_url: str = None, branch_id: str = None):
        reference = self._generate_reference(tenant_id)

        voucher = ExpenseVoucher(
            tenant_id=tenant_id,
            branch_id=branch_id,
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

    def create_petty_cash(self, tenant_id: str, user_id: str, data: ExpenseVoucherCreate, attachment_url: str = None, branch_id: str = None):
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
            branch_id=branch_id,
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

    def void_expense(self, tenant_id: str, user_id: str, voucher_id: str,
                     void_reason: str = None, active_branch_id: str = None):
        voucher = self.db.query(ExpenseVoucher).filter(ExpenseVoucher.tenant_id == tenant_id, ExpenseVoucher.id == voucher_id).first()
        if not voucher or voucher.status == "Void":
            return False

        voucher.status = "Void"
        self.db.commit()

        # ── Audit Event ───────────────────────────────────────────────────────
        # Mirror the Sale-Void flow exactly: write an audit_events row so it shows
        # in the Audit Center's activity log AND the background listener fires a
        # WhatsApp/dashboard alert IF the branch has the "expense_void" alert
        # enabled. Never let an alerting/audit failure break the void itself.
        try:
            # Resolve a branch even for legacy vouchers that predate branch
            # isolation (branch_id was nullable): fall back to the caller's active
            # branch, then the tenant's main branch. Without this, the audit event
            # would be silently skipped and never appear in the Audit Center.
            branch_id = voucher.branch_id or active_branch_id
            if not branch_id:
                from models.users import Branch
                main_branch = self.db.query(Branch).filter(
                    Branch.tenant_id == tenant_id, Branch.is_main == True
                ).first()
                branch_id = main_branch.id if main_branch else None

            if branch_id:
                from models.audit import AuditEvent
                from models.users import User as UserModel
                staff = self.db.query(UserModel).filter(UserModel.id == user_id).first()
                staff_name = (staff.full_name or staff.username) if staff else "Unknown"
                self.db.add(AuditEvent(
                    branch_id=str(branch_id),
                    staff_id=str(user_id),
                    event_type="expense_void",
                    transaction_id=str(voucher.id),
                    metadata_={
                        "staff_name": staff_name,
                        "reference": voucher.reference,
                        "amount": float(voucher.amount or 0),
                        "payee": voucher.payee or "",
                        "description": voucher.description or "",
                        "reason": void_reason or "No reason provided",
                        # Full snapshot of the voided expense for the audit trail.
                        "snapshot": {
                            "id": str(voucher.id),
                            "reference": voucher.reference,
                            "amount": float(voucher.amount or 0),
                            "payee": voucher.payee,
                            "description": voucher.description,
                            "category_id": voucher.category_id,
                            "petty_cash_category_id": voucher.petty_cash_category_id,
                            "payment_method": voucher.payment_method,
                            "date": voucher.date.isoformat() if voucher.date else None,
                        },
                    },
                    severity="medium",
                ))
                self.db.commit()
        except Exception:
            # The void already committed above — swallow alerting errors.
            self.db.rollback()

        return True

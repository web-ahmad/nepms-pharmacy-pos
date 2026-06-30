from sqlalchemy.orm import Session
from schemas.accounts import JournalEntryCreate, JournalEntryLineCreate
from services.accounts_service import AccountsService

class AutoPostingService:
    def __init__(self, db: Session):
        self.db = db
        self.accounts_svc = AccountsService(db)

    def _get_account_id(self, tenant_id: str, code: str):
        # Cache or fetch from DB
        acc = self.accounts_svc.repo.get_account_by_code(tenant_id, code)
        if not acc:
            raise ValueError(f"CRITICAL: Account code {code} not found. Please run COA Seeder.")
        return acc.id

    def post_cash_sale(self, tenant_id: str, user_id: str, reference: str, amount: float):
        cash_acc = self._get_account_id(tenant_id, "1000")
        sales_rev_acc = self._get_account_id(tenant_id, "4000")
        
        entry = JournalEntryCreate(
            reference=reference,
            description="Auto Post: Cash Sale",
            lines=[
                JournalEntryLineCreate(account_id=cash_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=sales_rev_acc, debit=0, credit=amount)
            ]
        )
        self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_credit_sale(self, tenant_id: str, user_id: str, reference: str, amount: float):
        ar_acc = self._get_account_id(tenant_id, "1030")
        sales_rev_acc = self._get_account_id(tenant_id, "4000")
        
        entry = JournalEntryCreate(
            reference=reference,
            description="Auto Post: Credit Sale",
            lines=[
                JournalEntryLineCreate(account_id=ar_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=sales_rev_acc, debit=0, credit=amount)
            ]
        )
        self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_customer_payment(self, tenant_id: str, user_id: str, reference: str, amount: float):
        cash_acc = self._get_account_id(tenant_id, "1000")
        ar_acc = self._get_account_id(tenant_id, "1030")
        
        entry = JournalEntryCreate(
            reference=reference,
            description="Auto Post: Customer Payment",
            lines=[
                JournalEntryLineCreate(account_id=cash_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=ar_acc, debit=0, credit=amount)
            ]
        )
        self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_cash_purchase(self, tenant_id: str, user_id: str, reference: str, amount: float):
        inv_acc = self._get_account_id(tenant_id, "1020")
        cash_acc = self._get_account_id(tenant_id, "1000")
        
        entry = JournalEntryCreate(
            reference=reference,
            description="Auto Post: Cash Purchase (GRN)",
            lines=[
                JournalEntryLineCreate(account_id=inv_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=cash_acc, debit=0, credit=amount)
            ]
        )
        self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_credit_purchase(self, tenant_id: str, user_id: str, reference: str, amount: float):
        inv_acc = self._get_account_id(tenant_id, "1020")
        ap_acc = self._get_account_id(tenant_id, "2000")
        
        entry = JournalEntryCreate(
            reference=reference,
            description="Auto Post: Credit Purchase (GRN)",
            lines=[
                JournalEntryLineCreate(account_id=inv_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=ap_acc, debit=0, credit=amount)
            ]
        )
        self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_supplier_payment(self, tenant_id: str, user_id: str, reference: str, amount: float):
        ap_acc = self._get_account_id(tenant_id, "2000")
        cash_acc = self._get_account_id(tenant_id, "1000")
        
        entry = JournalEntryCreate(
            reference=reference,
            description="Auto Post: Supplier Payment",
            lines=[
                JournalEntryLineCreate(account_id=ap_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=cash_acc, debit=0, credit=amount)
            ]
        )
        self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_inventory_loss(self, tenant_id: str, user_id: str, reference: str, amount: float):
        loss_acc = self._get_account_id(tenant_id, "5020")
        inv_acc = self._get_account_id(tenant_id, "1020")
        
        entry = JournalEntryCreate(
            reference=reference,
            description="Auto Post: Inventory Loss Adjustment",
            lines=[
                JournalEntryLineCreate(account_id=loss_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=inv_acc, debit=0, credit=amount)
            ]
        )
        self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

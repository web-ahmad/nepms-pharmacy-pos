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

    def _get_or_create_account(self, tenant_id: str, code: str, name: str, category: str):
        acc = self.accounts_svc.repo.get_account_by_code(tenant_id, code)
        if not acc:
            from schemas.accounts import AccountCreate
            from models.accounts import AccountCategory
            enum_cat = AccountCategory(category)
            acc = self.accounts_svc.repo.create_account(tenant_id, AccountCreate(code=code, name=name, category=enum_cat))
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
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

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
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

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
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

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
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

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
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

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
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

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
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_expense(self, tenant_id: str, user_id: str, reference: str, amount: float, description: str = "Auto Post: Expense"):
        exp_acc = self._get_account_id(tenant_id, "5030")
        cash_acc = self._get_account_id(tenant_id, "1000")
        
        entry = JournalEntryCreate(
            reference=reference,
            description=description,
            lines=[
                JournalEntryLineCreate(account_id=exp_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=cash_acc, debit=0, credit=amount)
            ]
        )
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_payroll(self, tenant_id: str, user_id: str, reference: str, amount: float, description: str = "Auto Post: Payroll"):
        salary_exp_acc = self._get_account_id(tenant_id, "5030") # using 5030 as general expense
        cash_acc = self._get_account_id(tenant_id, "1000")
        
        entry = JournalEntryCreate(
            reference=reference,
            description=description,
            lines=[
                JournalEntryLineCreate(account_id=salary_exp_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=cash_acc, debit=0, credit=amount)
            ]
        )
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_advance_salary(self, tenant_id: str, user_id: str, reference: str, amount: float, description: str = "Advance Salary Disbursed"):
        from models.accounts import AccountCategory
        advance_rec_acc = self._get_or_create_account(tenant_id, "1040", "Advance Salary Receivable", AccountCategory.ASSET)
        cash_acc = self._get_account_id(tenant_id, "1000")
        
        entry = JournalEntryCreate(
            reference=reference,
            description=description,
            lines=[
                JournalEntryLineCreate(account_id=advance_rec_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=cash_acc, debit=0, credit=amount)
            ]
        )
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

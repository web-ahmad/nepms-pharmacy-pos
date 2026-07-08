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

    def post_cash_sale(self, tenant_id: str, user_id: str, reference: str, amount: float, payment_method: str = "Cash"):
        from models.accounts import AccountCategory
        if payment_method and payment_method.lower() in ['bank transfer', 'card', 'credit card']:
            asset_acc = self._get_or_create_account(tenant_id, "1010", "Bank", AccountCategory.ASSET)
        else:
            asset_acc = self._get_account_id(tenant_id, "1000")
            
        sales_rev_acc = self._get_account_id(tenant_id, "4000")
        
        entry = JournalEntryCreate(
            reference=reference,
            description=f"Auto Post: Sale ({payment_method})",
            lines=[
                JournalEntryLineCreate(account_id=asset_acc, debit=amount, credit=0),
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

    def post_purchase_return(self, tenant_id: str, user_id: str, reference: str, amount: float):
        ap_acc = self._get_account_id(tenant_id, "2000") # Accounts Payable
        pr_acc = self._get_account_id(tenant_id, "5000") # Purchase Returns
        
        entry = JournalEntryCreate(
            reference=reference,
            description=f"Auto Post: Purchase Return Debit Note",
            lines=[
                JournalEntryLineCreate(account_id=ap_acc, debit=amount, credit=0), # Debit AP (reduce liability)
                JournalEntryLineCreate(account_id=pr_acc, debit=0, credit=amount) # Credit Purchase Returns
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

    def post_opening_stock(self, tenant_id: str, user_id: str, reference: str, amount: float, description: str = "Opening Stock"):
        from models.accounts import AccountCategory
        inv_acc = self._get_account_id(tenant_id, "1020")
        equity_acc = self._get_or_create_account(tenant_id, "3000", "Opening Balance Equity", AccountCategory.EQUITY)
        
        entry = JournalEntryCreate(
            reference=reference,
            description=description,
            lines=[
                JournalEntryLineCreate(account_id=inv_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=equity_acc, debit=0, credit=amount)
            ]
        )
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_cogs(self, tenant_id: str, user_id: str, reference: str, amount: float, description: str = "Cost of Goods Sold"):
        from models.accounts import AccountCategory
        cogs_acc = self._get_or_create_account(tenant_id, "5010", "Cost of Goods Sold", AccountCategory.EXPENSE)
        inv_acc = self._get_account_id(tenant_id, "1020")
        
        entry = JournalEntryCreate(
            reference=reference,
            description=description,
            lines=[
                JournalEntryLineCreate(account_id=cogs_acc, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=inv_acc, debit=0, credit=amount)
            ]
        )
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_purchase_invoice(self, tenant_id: str, user_id: str, invoice_reference: str, total_amount: float, supplier_name: str):
        from models.accounts import AccountCategory
        inv_acc = self._get_account_id(tenant_id, "1020")
        ap_acc = self._get_or_create_account(tenant_id, "2000", "Accounts Payable", AccountCategory.LIABILITY)
        
        entry = JournalEntryCreate(
            reference=invoice_reference,
            description=f"Purchase Invoice: {invoice_reference} from {supplier_name}",
            lines=[
                JournalEntryLineCreate(account_id=inv_acc, debit=total_amount, credit=0),
                JournalEntryLineCreate(account_id=ap_acc, debit=0, credit=total_amount)
            ]
        )
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_purchase_payment(self, tenant_id: str, user_id: str, invoice_reference: str, amount_paid: float, payment_method: str, supplier_name: str):
        from models.accounts import AccountCategory
        ap_acc = self._get_or_create_account(tenant_id, "2000", "Accounts Payable", AccountCategory.LIABILITY)
        
        if payment_method and payment_method.lower() in ['bank transfer', 'card', 'credit card']:
            asset_acc = self._get_or_create_account(tenant_id, "1010", "Bank", AccountCategory.ASSET)
        else:
            asset_acc = self._get_account_id(tenant_id, "1000")
            
        entry = JournalEntryCreate(
            reference=f"PAY-{invoice_reference}",
            description=f"Payment to {supplier_name} for Invoice: {invoice_reference}",
            lines=[
                JournalEntryLineCreate(account_id=ap_acc, debit=amount_paid, credit=0),
                JournalEntryLineCreate(account_id=asset_acc, debit=0, credit=amount_paid)
            ]
        )
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_sales_return(self, tenant_id: str, user_id: str, refund_reference: str, original_invoice: str, refund_amount: float, cost_of_items_returned: float, payment_method: str):
        from models.accounts import AccountCategory
        
        if payment_method and payment_method.lower() in ['bank transfer', 'card', 'credit card']:
            asset_acc = self._get_or_create_account(tenant_id, "1010", "Bank", AccountCategory.ASSET)
        else:
            asset_acc = self._get_account_id(tenant_id, "1000")
            
        sales_returns_acc = self._get_or_create_account(tenant_id, "5040", "Sales Returns", AccountCategory.EXPENSE)
        inv_acc = self._get_account_id(tenant_id, "1020")
        cogs_acc = self._get_or_create_account(tenant_id, "5010", "Cost of Goods Sold", AccountCategory.EXPENSE)
        
        # Entry 1: Refund Money
        entry_refund = JournalEntryCreate(
            reference=refund_reference,
            description=f"Sales Return Refund for {original_invoice}",
            lines=[
                JournalEntryLineCreate(account_id=sales_returns_acc, debit=refund_amount, credit=0),
                JournalEntryLineCreate(account_id=asset_acc, debit=0, credit=refund_amount),
            ]
        )
        je_refund = self.accounts_svc.create_journal_entry(tenant_id, user_id, entry_refund)
        
        # Entry 2: Restock Inventory & Reverse COGS
        if cost_of_items_returned > 0:
            entry_restock = JournalEntryCreate(
                reference=f"{refund_reference}-RESTOCK",
                description=f"Inventory Restock for Return {original_invoice}",
                lines=[
                    JournalEntryLineCreate(account_id=inv_acc, debit=cost_of_items_returned, credit=0),
                    JournalEntryLineCreate(account_id=cogs_acc, debit=0, credit=cost_of_items_returned),
                ]
            )
            self.accounts_svc.create_journal_entry(tenant_id, user_id, entry_restock)
            
        return je_refund

    def post_expense_voucher(self, tenant_id: str, user_id: str, reference: str, amount: float, category_id: str, payment_method: str = "Cash"):
        from models.accounts import AccountCategory
        if payment_method and payment_method.lower() in ['bank transfer', 'card', 'credit card', 'bank']:
            asset_acc = self._get_or_create_account(tenant_id, "1010", "Bank", AccountCategory.ASSET)
        else:
            asset_acc = self._get_account_id(tenant_id, "1000")
            
        entry = JournalEntryCreate(
            reference=reference,
            description=f"Auto Post: Expense Voucher ({payment_method})",
            lines=[
                JournalEntryLineCreate(account_id=category_id, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=asset_acc, debit=0, credit=amount)
            ]
        )
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

    def post_petty_cash(self, tenant_id: str, user_id: str, reference: str, amount: float, category_id: str):
        from models.accounts import AccountCategory
        petty_cash_acc = self._get_or_create_account(tenant_id, "1005", "Petty Cash", AccountCategory.ASSET)
            
        entry = JournalEntryCreate(
            reference=reference,
            description="Auto Post: Petty Cash Dispense",
            lines=[
                JournalEntryLineCreate(account_id=category_id, debit=amount, credit=0),
                JournalEntryLineCreate(account_id=petty_cash_acc, debit=0, credit=amount)
            ]
        )
        return self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)

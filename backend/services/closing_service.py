from sqlalchemy.orm import Session
from datetime import datetime, date
from models.accounts import Account, JournalEntry, JournalEntryLine, AccountCategory
from services.accounts_service import AccountsService
from schemas.accounts import JournalEntryCreate, JournalEntryLineCreate

class ClosingService:
    def __init__(self, db: Session):
        self.db = db
        self.accounts_svc = AccountsService(db)

    def _get_or_create_account(self, tenant_id: str, code: str, name: str, category: str):
        acc = self.accounts_svc.repo.get_account_by_code(tenant_id, code)
        if not acc:
            from schemas.accounts import AccountCreate
            from models.accounts import AccountCategory
            enum_cat = AccountCategory(category)
            acc = self.accounts_svc.repo.create_account(tenant_id, AccountCreate(code=code, name=name, category=enum_cat))
        return acc.id

    def perform_year_end_closing(self, tenant_id: str, user_id: str, year: int, branch_id: str = None):
        """
        Closes all Revenue and Expense accounts into Retained Earnings for the specified year.
        This balances the Net Profit/Loss into Equity.
        """
        # Get Trial Balance
        tb = self.accounts_svc.repo.get_trial_balance(tenant_id)
        
        retained_earnings_id = self._get_or_create_account(
            tenant_id, "3010", "Retained Earnings", AccountCategory.EQUITY
        )
        
        lines = []
        net_profit = 0.0
        
        for acc in tb:
            # We only close Revenue and Expense accounts
            if acc.category not in [AccountCategory.REVENUE, AccountCategory.EXPENSE]:
                continue
                
            bal = acc.current_balance or 0.0
            if bal == 0:
                continue
                
            if acc.category == AccountCategory.REVENUE:
                # Normal balance is credit. To close, we debit.
                if bal > 0:
                    lines.append(JournalEntryLineCreate(account_id=acc.id, debit=bal, credit=0))
                    net_profit += bal
                elif bal < 0:
                    # Abnormal balance (e.g. Sales Returns if tracked in same account)
                    lines.append(JournalEntryLineCreate(account_id=acc.id, debit=0, credit=abs(bal)))
                    net_profit += bal
            elif acc.category == AccountCategory.EXPENSE:
                # Normal balance is debit. To close, we credit.
                if bal > 0:
                    lines.append(JournalEntryLineCreate(account_id=acc.id, debit=0, credit=bal))
                    net_profit -= bal
                elif bal < 0:
                    lines.append(JournalEntryLineCreate(account_id=acc.id, debit=abs(bal), credit=0))
                    net_profit -= bal
                    
        if not lines:
            return {"message": f"No revenue or expense balances to close for year {year}."}
            
        # Post the net profit/loss to Retained Earnings
        if net_profit > 0:
            lines.append(JournalEntryLineCreate(account_id=retained_earnings_id, debit=0, credit=net_profit))
        elif net_profit < 0:
            lines.append(JournalEntryLineCreate(account_id=retained_earnings_id, debit=abs(net_profit), credit=0))
            
        entry = JournalEntryCreate(
            reference=f"YEC-{year}",
            description=f"Year End Closing for {year}",
            branch_id=branch_id,
            source_module="Closing",
            source_id=f"YEC-{year}",
            lines=lines
        )
        
        je = self.accounts_svc.create_journal_entry(tenant_id, user_id, entry)
        
        return {
            "message": "Year-End Closing completed successfully.",
            "net_profit_transferred": net_profit,
            "journal_entry_id": je.id
        }

import os

file_path = "backend/repositories/accounts.py"
with open(file_path, "r") as f:
    content = f.read()

# get_accounts
content = content.replace(
    "def get_accounts(self, tenant_id: str):\n        return self.db.query(Account).filter(Account.tenant_id == tenant_id).all()",
    """def get_accounts(self, tenant_id: str, branch_id: str = None):
        accounts = self.db.query(Account).filter(Account.tenant_id == tenant_id).all()
        if branch_id:
            from sqlalchemy import func
            from models.accounts import JournalEntry, JournalEntryLine, AccountCategory
            rows = (
                self.db.query(
                    JournalEntryLine.account_id,
                    func.sum(JournalEntryLine.debit).label("td"),
                    func.sum(JournalEntryLine.credit).label("tc"),
                )
                .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
                .filter(JournalEntry.tenant_id == tenant_id, JournalEntry.status == "Approved", JournalEntryLine.branch_id == branch_id)
                .group_by(JournalEntryLine.account_id)
                .all()
            )
            bal_map = {r.account_id: (r.td or 0.0, r.tc or 0.0) for r in rows}
            for acc in accounts:
                td, tc = bal_map.get(acc.id, (0.0, 0.0))
                if acc.category in [AccountCategory.ASSET, AccountCategory.EXPENSE]:
                    acc.current_balance = round(td - tc, 4)
                else:
                    acc.current_balance = round(tc - td, 4)
        return accounts"""
)

# get_trial_balance
content = content.replace(
    """    def get_trial_balance(self, tenant_id: str):
        \"\"\"
        Returns trial balance based on current_balance.
        \"\"\"
        query = self.db.query(Account).filter(Account.tenant_id == tenant_id, Account.current_balance != 0)
        accounts = query.order_by(Account.code).all()
        
        # We need to adapt it so the service can still process it in its current way, or update the service as well.
        # It's better to update the service directly, but let's change what the repo returns to just the accounts.
        return accounts""",
    """    def get_trial_balance(self, tenant_id: str, branch_id: str = None):
        \"\"\"
        Returns trial balance based on current_balance.
        \"\"\"
        accounts = self.get_accounts(tenant_id, branch_id=branch_id)
        return sorted([a for a in accounts if a.current_balance != 0], key=lambda a: a.code)"""
)

# get_profit_and_loss
content = content.replace(
    "def get_profit_and_loss(self, tenant_id: str):",
    "def get_profit_and_loss(self, tenant_id: str, branch_id: str = None):"
)
content = content.replace(
    "accounts = self.get_trial_balance(tenant_id)",
    "accounts = self.get_trial_balance(tenant_id, branch_id=branch_id)"
)

# get_balance_sheet
content = content.replace(
    "def get_balance_sheet(self, tenant_id: str):",
    "def get_balance_sheet(self, tenant_id: str, branch_id: str = None):"
)
# (accounts = self.get_trial_balance is already patched by the previous string replacement because it appears twice)
# Wait, let's make sure!
content = content.replace(
    "pnl = self.get_profit_and_loss(tenant_id)",
    "pnl = self.get_profit_and_loss(tenant_id, branch_id=branch_id)"
)

# get_ledger
content = content.replace(
    "def get_ledger(self, tenant_id: str, account_id: str = None, start_date: str = None, end_date: str = None):",
    "def get_ledger(self, tenant_id: str, account_id: str = None, start_date: str = None, end_date: str = None, branch_id: str = None):"
)
content = content.replace(
    """             JournalEntry.status == 'Approved'
         )""",
    """             JournalEntry.status == 'Approved'
         )
         
        if branch_id:
            query = query.filter(JournalEntryLine.branch_id == branch_id)"""
)

# get_journal_entries
content = content.replace(
    """    def get_journal_entries(self, tenant_id: str):
        return self.db.query(JournalEntry).filter(JournalEntry.tenant_id == tenant_id).order_by(JournalEntry.date.desc()).all()""",
    """    def get_journal_entries(self, tenant_id: str, branch_id: str = None):
        query = self.db.query(JournalEntry).filter(JournalEntry.tenant_id == tenant_id).order_by(JournalEntry.date.desc())
        if branch_id:
            query = query.filter(JournalEntry.branch_id == branch_id)
        return query.limit(100).all()"""
)

with open(file_path, "w") as f:
    f.write(content)

print("Repo Patched")

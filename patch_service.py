import os

file_path = "backend/services/accounts_service.py"
with open(file_path, "r") as f:
    content = f.read()

# get_chart_of_accounts
content = content.replace(
    "def get_chart_of_accounts(self, tenant_id: str):\n        return self.repo.get_accounts(tenant_id)",
    "def get_chart_of_accounts(self, tenant_id: str, branch_id: str = None):\n        return self.repo.get_accounts(tenant_id, branch_id=branch_id)"
)

# get_trial_balance
content = content.replace(
    "def get_trial_balance(self, tenant_id: str) -> TrialBalanceResponse:\n        accounts = self.repo.get_trial_balance(tenant_id)",
    "def get_trial_balance(self, tenant_id: str, branch_id: str = None) -> TrialBalanceResponse:\n        accounts = self.repo.get_trial_balance(tenant_id, branch_id=branch_id)"
)

# get_profit_and_loss
content = content.replace(
    "def get_profit_and_loss(self, tenant_id: str) -> ProfitLossResponse:\n        return ProfitLossResponse(**self.repo.get_profit_and_loss(tenant_id))",
    "def get_profit_and_loss(self, tenant_id: str, branch_id: str = None) -> ProfitLossResponse:\n        return ProfitLossResponse(**self.repo.get_profit_and_loss(tenant_id, branch_id=branch_id))"
)

# get_balance_sheet
content = content.replace(
    "def get_balance_sheet(self, tenant_id: str) -> BalanceSheetResponse:\n        data = self.repo.get_balance_sheet(tenant_id)",
    "def get_balance_sheet(self, tenant_id: str, branch_id: str = None) -> BalanceSheetResponse:\n        data = self.repo.get_balance_sheet(tenant_id, branch_id=branch_id)"
)

# get_ledger
content = content.replace(
    "def get_ledger(self, tenant_id: str, account_id: str = None, start_date: str = None, end_date: str = None):\n        rows = self.repo.get_ledger(tenant_id, account_id, start_date, end_date)",
    "def get_ledger(self, tenant_id: str, account_id: str = None, start_date: str = None, end_date: str = None, branch_id: str = None):\n        rows = self.repo.get_ledger(tenant_id, account_id, start_date, end_date, branch_id=branch_id)"
)

# get_journal_entries
content = content.replace(
    "def get_journal_entries(self, tenant_id: str):\n        return self.repo.get_journal_entries(tenant_id)",
    "def get_journal_entries(self, tenant_id: str, branch_id: str = None):\n        return self.repo.get_journal_entries(tenant_id, branch_id=branch_id)"
)

with open(file_path, "w") as f:
    f.write(content)

print("Service Patched")

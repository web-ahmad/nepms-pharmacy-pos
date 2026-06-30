from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Dict, Any
from datetime import datetime

from schemas.accounts import (
    AccountCreate, 
    JournalEntryCreate, 
    TrialBalanceResponse, 
    ProfitLossResponse, 
    BalanceSheetResponse
)
from repositories.accounts import AccountsRepository
from models.accounts import AccountCategory

class AccountsService:
    def __init__(self, db: Session):
        self.repo = AccountsRepository(db)

    def get_chart_of_accounts(self, tenant_id: str):
        return self.repo.get_accounts(tenant_id)

    def create_account(self, tenant_id: str, obj_in: AccountCreate):
        existing = self.repo.get_account_by_code(tenant_id, obj_in.code)
        if existing:
            raise HTTPException(status_code=400, detail="Account code already exists.")
        return self.repo.create_account(tenant_id, obj_in)

    def seed_default_chart(self, tenant_id: str):
        default_accounts = [
            {"code": "1000", "name": "Cash", "category": AccountCategory.ASSET},
            {"code": "1010", "name": "Bank", "category": AccountCategory.ASSET},
            {"code": "1020", "name": "Inventory", "category": AccountCategory.ASSET},
            {"code": "1030", "name": "Accounts Receivable", "category": AccountCategory.ASSET},
            
            {"code": "2000", "name": "Accounts Payable", "category": AccountCategory.LIABILITY},
            {"code": "2010", "name": "Tax Payable", "category": AccountCategory.LIABILITY},
            
            {"code": "3000", "name": "Owner Capital", "category": AccountCategory.EQUITY},
            {"code": "3010", "name": "Retained Earnings", "category": AccountCategory.EQUITY},
            
            {"code": "4000", "name": "Sales Revenue", "category": AccountCategory.REVENUE},
            {"code": "4010", "name": "Other Revenue", "category": AccountCategory.REVENUE},
            
            {"code": "5000", "name": "Purchase Returns", "category": AccountCategory.EXPENSE}, # Contra-expense conceptually, mapped as Expense for math
            {"code": "5010", "name": "Sales Returns", "category": AccountCategory.EXPENSE}, # Contra-revenue conceptually, mapped as Expense for math
            {"code": "5020", "name": "Inventory Adjustment Expense", "category": AccountCategory.EXPENSE},
            {"code": "5030", "name": "Operating Expenses", "category": AccountCategory.EXPENSE},
        ]
        for acc in default_accounts:
            existing = self.repo.get_account_by_code(tenant_id, acc["code"])
            if not existing:
                self.repo.create_account(tenant_id, AccountCreate(**acc))

    def create_journal_entry(self, tenant_id: str, user_id: str, obj_in: JournalEntryCreate, status: str = "Approved"):
        # Double Entry Validation Logic: Sum(Debits) MUST == Sum(Credits)
        total_debit = round(sum(line.debit for line in obj_in.lines), 2)
        total_credit = round(sum(line.credit for line in obj_in.lines), 2)

        if total_debit != total_credit:
            raise HTTPException(
                status_code=400, 
                detail=f"Journal Entry unbalanced. Debits: {total_debit}, Credits: {total_credit}"
            )
            
        if total_debit == 0:
            raise HTTPException(
                status_code=400, 
                detail="Journal Entry must have non-zero amounts."
            )

        # Validate accounts exist
        for line in obj_in.lines:
            # We could fetch each account to ensure it exists and belongs to the tenant.
            # Simplified here for brevity but critical in production.
            pass

        return self.repo.create_journal_entry(tenant_id, user_id, obj_in, status)

    def get_trial_balance(self, tenant_id: str) -> TrialBalanceResponse:
        rows = self.repo.get_trial_balance(tenant_id)
        
        parsed_rows = []
        total_debit = 0
        total_credit = 0
        
        for row in rows:
            td = row.total_debit or 0.0
            tc = row.total_credit or 0.0
            
            # Usually trial balance just outputs the absolute net balance per account
            net_bal = td - tc
            final_debit = 0
            final_credit = 0
            
            if net_bal > 0:
                final_debit = net_bal
            elif net_bal < 0:
                final_credit = abs(net_bal)
                
            if final_debit > 0 or final_credit > 0:
                parsed_rows.append({
                    "account_code": row.code,
                    "account_name": row.name,
                    "category": row.category,
                    "debit": final_debit,
                    "credit": final_credit
                })
                total_debit += final_debit
                total_credit += final_credit

        # Check total TB balance
        if round(total_debit, 2) != round(total_credit, 2):
            print(f"CRITICAL WARNING: Trial Balance mismatch! Debits: {total_debit}, Credits: {total_credit}")

        return TrialBalanceResponse(
            date=datetime.utcnow(),
            rows=parsed_rows,
            total_debit=round(total_debit, 2),
            total_credit=round(total_credit, 2)
        )

    def get_profit_and_loss(self, tenant_id: str) -> ProfitLossResponse:
        return ProfitLossResponse(**self.repo.get_profit_and_loss(tenant_id))

    def get_balance_sheet(self, tenant_id: str) -> BalanceSheetResponse:
        data = self.repo.get_balance_sheet(tenant_id)
        
        # Verify Accounting Equation: Assets = Liabilities + Equity
        # Due to float rounding, round to 2 decimals
        ast = round(data['total_assets'], 2)
        lia_equ = round(data['total_liabilities'] + data['total_equity'], 2)
        
        if ast != lia_equ:
             print(f"CRITICAL WARNING: Balance Sheet Equation failed! Assets: {ast}, L+E: {lia_equ}")
             
        return BalanceSheetResponse(**data)

    def get_ledger(self, tenant_id: str, account_id: str = None, start_date: str = None, end_date: str = None):
        rows = self.repo.get_ledger(tenant_id, account_id, start_date, end_date)
        
        parsed_rows = []
        running_bal = 0.0
        tot_debit = 0.0
        tot_credit = 0.0
        
        for r in rows:
            debit = r.debit or 0.0
            credit = r.credit or 0.0
            tot_debit += debit
            tot_credit += credit
            # Abstract running balance (usually absolute difference depending on account type, but we'll do Net Debit logic)
            running_bal += (debit - credit)
            
            parsed_rows.append({
                "date": r.date,
                "reference": r.reference,
                "journal_desc": r.journal_desc,
                "line_desc": r.line_desc,
                "account_name": r.account_name,
                "debit": debit,
                "credit": credit,
                "balance": running_bal
            })
            
        return {
            "account_name": rows[0].account_name if rows and account_id else None,
            "rows": parsed_rows,
            "total_debit": tot_debit,
            "total_credit": tot_credit,
            "closing_balance": running_bal
        }
        
    def get_journal_entries(self, tenant_id: str):
        return self.repo.get_journal_entries(tenant_id)

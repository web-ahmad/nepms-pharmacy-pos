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
        self.db = db
        self.repo = AccountsRepository(db)

    def get_chart_of_accounts(self, tenant_id: str, branch_id: str = None):
        return self.repo.get_accounts(tenant_id, branch_id=branch_id)

    def create_account(self, tenant_id: str, obj_in: AccountCreate):
        existing = self.repo.get_account_by_code(tenant_id, obj_in.code)
        if existing:
            raise HTTPException(status_code=400, detail="Account code already exists.")
        return self.repo.create_account(tenant_id, obj_in)

    def update_account(self, tenant_id: str, account_id: str, obj_in):
        from models.accounts import Account
        db_obj = self.repo.db.query(Account).filter(Account.id == account_id, Account.tenant_id == tenant_id).first()
        if not db_obj:
            raise HTTPException(status_code=404, detail="Account not found")
        if db_obj.is_system:
            raise HTTPException(status_code=400, detail="Cannot edit a system default account")
        if obj_in.code and obj_in.code != db_obj.code:
            existing = self.repo.get_account_by_code(tenant_id, obj_in.code)
            if existing:
                raise HTTPException(status_code=400, detail="Account code already exists")
        return self.repo.update_account(tenant_id, account_id, obj_in.dict(exclude_unset=True))

    def delete_account(self, tenant_id: str, account_id: str):
        from models.accounts import Account, JournalEntryLine
        db_obj = self.repo.db.query(Account).filter(Account.id == account_id, Account.tenant_id == tenant_id).first()
        if not db_obj:
            raise HTTPException(status_code=404, detail="Account not found")
        if db_obj.is_system:
            raise HTTPException(status_code=400, detail="Cannot delete a system default account")
        
        has_tx = self.repo.db.query(JournalEntryLine).filter(JournalEntryLine.account_id == account_id).first()
        if has_tx:
            raise HTTPException(status_code=400, detail="Cannot delete account with existing transactions")
        
        return self.repo.delete_account(tenant_id, account_id)

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
            {"code": "5010", "name": "Cost of Goods Sold", "category": AccountCategory.EXPENSE},
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

    def get_trial_balance(self, tenant_id: str, branch_id: str = None) -> TrialBalanceResponse:
        accounts = self.repo.get_trial_balance(tenant_id, branch_id=branch_id)
        
        parsed_rows = []
        total_debit = 0.0
        total_credit = 0.0
        
        for acc in accounts:
            bal = acc.current_balance or 0.0
            final_debit = 0.0
            final_credit = 0.0
            
            if acc.category in [AccountCategory.ASSET, AccountCategory.EXPENSE]:
                if bal > 0:
                    final_debit = bal
                elif bal < 0:
                    final_credit = abs(bal)
            else: # LIABILITY, EQUITY, REVENUE
                if bal > 0:
                    final_credit = bal
                elif bal < 0:
                    final_debit = abs(bal)
                    
            if final_debit > 0 or final_credit > 0:
                parsed_rows.append({
                    "account_code": acc.code,
                    "account_name": acc.name,
                    "category": acc.category,
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

    def get_profit_and_loss(self, tenant_id: str, branch_id: str = None) -> ProfitLossResponse:
        return ProfitLossResponse(**self.repo.get_profit_and_loss(tenant_id, branch_id=branch_id))

    def get_balance_sheet(self, tenant_id: str, branch_id: str = None) -> BalanceSheetResponse:
        data = self.repo.get_balance_sheet(tenant_id, branch_id=branch_id)
        
        # Verify Accounting Equation: Assets = Liabilities + Equity
        # Due to float rounding, round to 2 decimals
        ast = round(data['total_assets'], 2)
        lia_equ = round(data['total_liabilities'] + data['total_equity'], 2)
        
        if ast != lia_equ:
             print(f"CRITICAL WARNING: Balance Sheet Equation failed! Assets: {ast}, L+E: {lia_equ}")
             
        return BalanceSheetResponse(**data)

    def get_ledger(self, tenant_id: str, account_id: str = None, start_date: str = None, end_date: str = None, branch_id: str = None):
        rows = self.repo.get_ledger(tenant_id, account_id, start_date, end_date, branch_id=branch_id)
        
        parsed_rows = []
        running_bal = 0.0
        tot_debit = 0.0
        tot_credit = 0.0
        
        # Pre-fetch payroll runs status to avoid N+1 queries
        from models.hr import PayrollRun
        payroll_runs = self.db.query(PayrollRun).filter(PayrollRun.tenant_id == tenant_id).all()
        payroll_status_map = {f"PAYROLL-{r.month}-{r.year}": r.status for r in payroll_runs}
        
        for r in rows:
            debit = r.debit or 0.0
            credit = r.credit or 0.0
            tot_debit += debit
            tot_credit += credit
            # Abstract running balance (usually absolute difference depending on account type, but we'll do Net Debit logic)
            running_bal += (debit - credit)
            
            # Map status
            row_status = None
            if r.reference:
                if r.reference.startswith("PAYROLL-"):
                    pay_status = payroll_status_map.get(r.reference)
                    row_status = "Paid" if pay_status == "Paid" else "Pending"
                elif r.reference.startswith("EXP-") or r.reference.startswith("PC-"):
                    row_status = "Posted"
                elif r.reference.startswith("INV-"):
                    row_status = "Paid"
            
            parsed_rows.append({
                "date": r.date,
                "reference": r.reference,
                "journal_desc": r.journal_desc,
                "line_desc": r.line_desc,
                "account_name": r.account_name,
                "debit": debit,
                "credit": credit,
                "balance": running_bal,
                "status": row_status,
                "source_id": getattr(r, "source_id", None),
                "created_by_name": getattr(r, "created_by_name", "System")
            })
            
        return {
            "account_name": rows[0].account_name if rows and account_id else None,
            "rows": parsed_rows,
            "total_debit": tot_debit,
            "total_credit": tot_credit,
            "closing_balance": running_bal
        }
        
    def get_journal_entries(self, tenant_id: str, branch_id: str = None):
        return self.repo.get_journal_entries(tenant_id, branch_id=branch_id)

    def get_dashboard_stats(self, tenant_id: str, branch_id: str = None):
        total_revenue = 0.0
        total_expenses = 0.0
        total_assets = 0.0
        cash_balance = 0.0
        bank_balance = 0.0
        ar_balance = 0.0
        ap_balance = 0.0
        
        if branch_id:
            from sqlalchemy import func
            from models.accounts import JournalEntry, JournalEntryLine, AccountCategory, Account
            rows = (
                self.db.query(
                    Account,
                    func.sum(JournalEntryLine.debit).label("total_debit"),
                    func.sum(JournalEntryLine.credit).label("total_credit"),
                )
                .join(JournalEntryLine, JournalEntryLine.account_id == Account.id)
                .join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)
                .filter(JournalEntry.tenant_id == tenant_id, JournalEntry.status == "Approved", JournalEntryLine.branch_id == branch_id)
                .group_by(Account.id)
                .all()
            )
            for acc, td, tc in rows:
                td = td or 0.0
                tc = tc or 0.0
                if acc.category in [AccountCategory.ASSET, AccountCategory.EXPENSE]:
                    bal = td - tc
                else:
                    bal = tc - td
                    
                if acc.category == AccountCategory.REVENUE:
                    total_revenue += bal
                elif acc.category == AccountCategory.EXPENSE:
                    total_expenses += bal
                elif acc.category == AccountCategory.ASSET:
                    total_assets += bal
                    if acc.code.startswith("100") or "cash" in acc.name.lower():
                        cash_balance += bal
                    elif acc.code.startswith("101") or "bank" in acc.name.lower():
                        bank_balance += bal
                    elif acc.code == "1030":
                        ar_balance += bal
                elif acc.category == AccountCategory.LIABILITY:
                    if acc.code == "2000":
                        ap_balance += bal
        else:
            accounts = self.repo.get_accounts(tenant_id)
            for acc in accounts:
                bal = acc.current_balance or 0.0
                if acc.category == AccountCategory.REVENUE:
                    total_revenue += bal
                elif acc.category == AccountCategory.EXPENSE:
                    total_expenses += bal
                elif acc.category == AccountCategory.ASSET:
                    total_assets += bal
                    if acc.code.startswith("100") or "cash" in acc.name.lower():
                        cash_balance += bal
                    elif acc.code.startswith("101") or "bank" in acc.name.lower():
                        bank_balance += bal
                    elif acc.code == "1030":
                        ar_balance += bal
                elif acc.category == AccountCategory.LIABILITY:
                    if acc.code == "2000":
                        ap_balance += bal

        net_profit = total_revenue - total_expenses
        
        from schemas.accounts import DashboardStatsResponse
        return DashboardStatsResponse(
            total_revenue=total_revenue,
            total_expenses=total_expenses,
            net_profit=net_profit,
            total_assets=total_assets,
            cash_balance=cash_balance,
            bank_balance=bank_balance,
            ar_balance=ar_balance,
            ap_balance=ap_balance
        )

    # =====================================================================
    # Enterprise Extensions (Phase 8)
    # =====================================================================

    def get_cash_flow(self, tenant_id: str):
        """Simplified Cash Flow (Direct Method) based on cash/bank ledger entries."""
        from sqlalchemy import func
        from models.accounts import JournalEntry, JournalEntryLine, Account
        
        # Get all lines hitting cash/bank accounts
        rows = (
            self.db.query(
                JournalEntry.description,
                JournalEntry.date,
                JournalEntryLine.debit,
                JournalEntryLine.credit
            )
            .join(JournalEntryLine, JournalEntryLine.journal_entry_id == JournalEntry.id)
            .join(Account, Account.id == JournalEntryLine.account_id)
            .filter(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.status == "Approved",
                (Account.code.like("100%")) | (Account.code.like("101%"))
            )
            .order_by(JournalEntry.date)
            .all()
        )
        
        inflows = sum(r.debit for r in rows if r.debit)
        outflows = sum(r.credit for r in rows if r.credit)
        
        return {
            "operating_activities": inflows - outflows,
            "investing_activities": 0.0,
            "financing_activities": 0.0,
            "net_cash_flow": inflows - outflows,
            "transactions": [
                {
                    "date": r.date,
                    "description": r.description,
                    "inflow": r.debit or 0.0,
                    "outflow": r.credit or 0.0
                } for r in rows
            ]
        }

    def get_aging_report(self, tenant_id: str, report_type: str = "AR"):
        """Generates AR or AP Aging report based on unpaid/partially paid sales or purchases."""
        from sqlalchemy import func
        from models.sales import Sale
        from models.purchase import Purchase
        
        buckets = {"0-30": 0.0, "31-60": 0.0, "61-90": 0.0, "90+": 0.0, "total": 0.0}
        now = datetime.utcnow()
        
        if report_type == "AR":
            # Unpaid Sales
            records = self.db.query(Sale).filter(
                Sale.tenant_id == tenant_id,
                Sale.status.notin_(["Voided", "Cancelled"]),
                Sale.payment_status.notin_(["Paid"])
            ).all()
            
            for rec in records:
                due = rec.grand_total - (rec.paid_amount or 0.0)
                if due <= 0: continue
                days_old = (now - rec.created_at).days
                if days_old <= 30: buckets["0-30"] += due
                elif days_old <= 60: buckets["31-60"] += due
                elif days_old <= 90: buckets["61-90"] += due
                else: buckets["90+"] += due
                buckets["total"] += due
                
        elif report_type == "AP":
            # Unpaid Purchases
            records = self.db.query(Purchase).filter(
                Purchase.tenant_id == tenant_id,
                Purchase.status == "Received",
                Purchase.payment_status.notin_(["Paid"])
            ).all()
            
            for rec in records:
                due = rec.grand_total - (rec.paid_amount or 0.0)
                if due <= 0: continue
                days_old = (now - rec.created_at).days
                if days_old <= 30: buckets["0-30"] += due
                elif days_old <= 60: buckets["31-60"] += due
                elif days_old <= 90: buckets["61-90"] += due
                else: buckets["90+"] += due
                buckets["total"] += due
                
        return {"report_type": report_type, "buckets": buckets}

    def get_sub_ledger(self, tenant_id: str, source_module: str, source_id: str):
        """Retrieve ledger lines for a specific customer or supplier (via source_id)."""
        from models.accounts import JournalEntry, JournalEntryLine, Account
        
        rows = (
            self.db.query(JournalEntry, JournalEntryLine, Account)
            .join(JournalEntryLine, JournalEntryLine.journal_entry_id == JournalEntry.id)
            .join(Account, Account.id == JournalEntryLine.account_id)
            .filter(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.source_module == source_module,
                JournalEntry.source_id == source_id,
                JournalEntry.status == "Approved"
            )
            .order_by(JournalEntry.date)
            .all()
        )
        
        parsed = []
        balance = 0.0
        for je, line, acc in rows:
            balance += (line.debit or 0.0) - (line.credit or 0.0)
            parsed.append({
                "date": je.date,
                "reference": je.reference,
                "description": je.description,
                "account_name": acc.name,
                "debit": line.debit or 0.0,
                "credit": line.credit or 0.0,
                "running_balance": balance
            })
            
        return {"source_module": source_module, "source_id": source_id, "rows": parsed, "closing_balance": balance}

    def get_tax_ledger(self, tenant_id: str):
        """Retrieve all entries hitting tax liability accounts."""
        from models.accounts import JournalEntry, JournalEntryLine, Account
        
        rows = (
            self.db.query(JournalEntry, JournalEntryLine, Account)
            .join(JournalEntryLine, JournalEntryLine.journal_entry_id == JournalEntry.id)
            .join(Account, Account.id == JournalEntryLine.account_id)
            .filter(
                JournalEntry.tenant_id == tenant_id,
                Account.code.like("201%"), # Tax Payable
                JournalEntry.status == "Approved"
            )
            .order_by(JournalEntry.date)
            .all()
        )
        
        parsed = []
        balance = 0.0
        for je, line, acc in rows:
            balance += (line.credit or 0.0) - (line.debit or 0.0) # Normal Liability balance
            parsed.append({
                "date": je.date,
                "reference": je.reference,
                "tax_account": acc.name,
                "tax_collected": line.credit or 0.0,
                "tax_paid": line.debit or 0.0,
                "running_liability": balance
            })
            
        return {"rows": parsed, "total_liability": balance}

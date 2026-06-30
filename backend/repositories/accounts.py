from sqlalchemy.orm import Session
from sqlalchemy import func, case
from models.accounts import Account, JournalEntry, JournalEntryLine, AccountCategory
from schemas.accounts import AccountCreate, JournalEntryCreate
from typing import List
from datetime import datetime

class AccountsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_accounts(self, tenant_id: str):
        return self.db.query(Account).filter(Account.tenant_id == tenant_id).all()

    def create_account(self, tenant_id: str, obj_in: AccountCreate):
        db_obj = Account(
            tenant_id=tenant_id,
            code=obj_in.code,
            name=obj_in.name,
            category=obj_in.category
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def get_account_by_code(self, tenant_id: str, code: str):
        return self.db.query(Account).filter(Account.tenant_id == tenant_id, Account.code == code).first()

    def get_account_balance(self, account_id: str):
        # We assume Normal Balance:
        # Asset/Expense: Debit increases, Credit decreases
        # Liability/Equity/Revenue: Credit increases, Debit decreases
        res = self.db.query(
            func.sum(JournalEntryLine.debit).label('total_debit'),
            func.sum(JournalEntryLine.credit).label('total_credit')
        ).join(JournalEntry, JournalEntry.id == JournalEntryLine.journal_entry_id)\
         .filter(
            JournalEntryLine.account_id == account_id,
            JournalEntry.status == 'Approved'
         ).first()
         
        td = res.total_debit or 0.0
        tc = res.total_credit or 0.0
        
        # Balance calculation depends on account type, but standard ledger 
        # usually just returns raw debits and credits and let the report format it.
        return td, tc

    def create_journal_entry(self, tenant_id: str, user_id: str, obj_in: JournalEntryCreate, status: str = "Approved"):
        db_obj = JournalEntry(
            tenant_id=tenant_id,
            reference=obj_in.reference,
            description=obj_in.description,
            date=obj_in.date or datetime.utcnow(),
            status=status,
            created_by=user_id
        )
        self.db.add(db_obj)
        self.db.flush() # flush to get id
        
        for line in obj_in.lines:
            db_line = JournalEntryLine(
                journal_entry_id=db_obj.id,
                account_id=line.account_id,
                description=line.description,
                debit=line.debit,
                credit=line.credit
            )
            self.db.add(db_line)
            
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def get_trial_balance(self, tenant_id: str):
        """
        Returns sums of all debits and credits for every account.
        """
        query = self.db.query(
            Account.code,
            Account.name,
            Account.category,
            func.sum(JournalEntryLine.debit).label('total_debit'),
            func.sum(JournalEntryLine.credit).label('total_credit')
        ).outerjoin(JournalEntryLine, Account.id == JournalEntryLine.account_id)\
         .outerjoin(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)\
         .filter(
             Account.tenant_id == tenant_id,
             # Ensure we only calculate approved entries or un-joined accounts
             (JournalEntry.status == 'Approved') | (JournalEntry.id == None)
         ).group_by(Account.id, Account.code, Account.name, Account.category)
         
        return query.order_by(Account.code).all()
        
    def get_profit_and_loss(self, tenant_id: str):
        """
        Calculates Revenue and Expense balances.
        """
        tb = self.get_trial_balance(tenant_id)
        revenue = []
        expenses = []
        total_rev = 0
        total_exp = 0
        
        for row in tb:
            td = row.total_debit or 0.0
            tc = row.total_credit or 0.0
            
            if row.category == AccountCategory.REVENUE:
                # Normal balance = Credit
                bal = tc - td
                revenue.append({"account_name": row.name, "amount": bal})
                total_rev += bal
            elif row.category == AccountCategory.EXPENSE:
                # Normal balance = Debit
                bal = td - tc
                expenses.append({"account_name": row.name, "amount": bal})
                total_exp += bal
                
        return {
            "revenue": revenue,
            "expenses": expenses,
            "total_revenue": total_rev,
            "total_expenses": total_exp,
            "net_profit": total_rev - total_exp
        }
        
    def get_balance_sheet(self, tenant_id: str):
        tb = self.get_trial_balance(tenant_id)
        assets = []
        liabilities = []
        equity = []
        tot_ast = 0
        tot_lia = 0
        tot_equ = 0
        
        for row in tb:
            td = row.total_debit or 0.0
            tc = row.total_credit or 0.0
            
            if row.category == AccountCategory.ASSET:
                bal = td - tc
                assets.append({"account_name": row.name, "amount": bal})
                tot_ast += bal
            elif row.category == AccountCategory.LIABILITY:
                bal = tc - td
                liabilities.append({"account_name": row.name, "amount": bal})
                tot_lia += bal
            elif row.category == AccountCategory.EQUITY:
                bal = tc - td
                equity.append({"account_name": row.name, "amount": bal})
                tot_equ += bal
                
        # To balance the sheet, we must add Net Profit to Equity (Retained Earnings)
        pnl = self.get_profit_and_loss(tenant_id)
        net_profit = pnl['net_profit']
        
        if net_profit != 0:
            equity.append({"account_name": "Current Year Net Profit", "amount": net_profit})
            tot_equ += net_profit
            
        return {
            "assets": assets,
            "liabilities": liabilities,
            "equity": equity,
            "total_assets": tot_ast,
            "total_liabilities": tot_lia,
            "total_equity": tot_equ
        }

    def get_ledger(self, tenant_id: str, account_id: str = None, start_date: str = None, end_date: str = None):
        query = self.db.query(
            JournalEntry.date,
            JournalEntry.reference,
            JournalEntry.description.label("journal_desc"),
            JournalEntryLine.description.label("line_desc"),
            Account.name.label("account_name"),
            JournalEntryLine.debit,
            JournalEntryLine.credit
        ).join(JournalEntryLine, JournalEntry.id == JournalEntryLine.journal_entry_id)\
         .join(Account, Account.id == JournalEntryLine.account_id)\
         .filter(
             JournalEntry.tenant_id == tenant_id,
             JournalEntry.status == 'Approved'
         )
         
        if account_id:
            query = query.filter(Account.id == account_id)
        if start_date:
            query = query.filter(JournalEntry.date >= datetime.strptime(start_date, "%Y-%m-%d"))
        if end_date:
            query = query.filter(JournalEntry.date <= datetime.strptime(end_date, "%Y-%m-%d"))
            
        return query.order_by(JournalEntry.date).all()
        
    def get_journal_entries(self, tenant_id: str):
        return self.db.query(JournalEntry).filter(JournalEntry.tenant_id == tenant_id).order_by(JournalEntry.date.desc()).all()

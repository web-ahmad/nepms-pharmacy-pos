import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.database import SessionLocal
from backend.models.accounts import Account
from backend.schemas.expenses import ExpenseVoucherCreate
from backend.services.expense_service import ExpenseService

def run():
    db = SessionLocal()
    # 1. Find an expense account
    expense_acc = db.query(Account).filter(Account.category == 'EXPENSE').first()
    if not expense_acc:
        print("No expense account found.")
        # Create one for testing
        from backend.models.accounts import AccountCategory
        expense_acc = Account(tenant_id="default", code="6010", name="Utilities", category=AccountCategory.EXPENSE)
        db.add(expense_acc)
        db.commit()
        db.refresh(expense_acc)
        
    print(f"Using Expense Account: {expense_acc.name} ({expense_acc.code}) - ID: {expense_acc.id}")
    
    # 2. Find a user and tenant
    from backend.models.users import User
    user = db.query(User).first()
    if not user:
        print("No user found.")
        return
        
    # 3. Create Voucher
    svc = ExpenseService(db)
    data = ExpenseVoucherCreate(
        amount=500.0,
        payee="K-Electric",
        description="Electricity Bill for July",
        category_id=expense_acc.id,
        payment_method="Cash"
    )
    
    try:
        res = svc.create_expense(user.tenant_id, user.id, data)
        print(f"Created Voucher: {res['reference']} for amount {res['amount']}")
    except Exception as e:
        print(f"Error creating voucher: {e}")

run()

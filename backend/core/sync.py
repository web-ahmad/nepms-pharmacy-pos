import time
import threading
from sqlalchemy.orm import Session
from database import SessionLocal
from services.auto_posting_service import AutoPostingService
from models.sales import Sale
from models.cash_register import CashLedgerEntry
from models.hr import PayrollRun

def _sync_worker():
    db: Session = SessionLocal()
    try:
        auto_post = AutoPostingService(db)
        synced_sales = 0
        synced_expenses = 0
        synced_payroll = 0
        system_user = "SYSTEM"

        # Sync Sales
        sales = db.query(Sale).filter(
            Sale.journal_entry_id == None,
            Sale.status.in_(["Completed", "Partially Paid"])
        ).all()
        
        for sale in sales:
            try:
                je = None
                if sale.payment_method == "Credit" or sale.amount_paid < sale.total_amount:
                    if sale.amount_paid >= sale.total_amount:
                        je = auto_post.post_cash_sale(sale.tenant_id, system_user, sale.invoice_number, sale.total_amount)
                    else:
                        je = auto_post.post_credit_sale(sale.tenant_id, system_user, sale.invoice_number, sale.total_amount)
                        if sale.amount_paid > 0:
                            auto_post.post_customer_payment(sale.tenant_id, system_user, f"PAY-{sale.invoice_number}", sale.amount_paid)
                else:
                    je = auto_post.post_cash_sale(sale.tenant_id, system_user, sale.invoice_number, sale.total_amount)
                
                if je:
                    sale.journal_entry_id = je.id
                    synced_sales += 1
            except Exception:
                pass

        # Sync Expenses
        expenses = db.query(CashLedgerEntry).filter(
            CashLedgerEntry.entry_type == "EXPENSE",
            CashLedgerEntry.journal_entry_id == None
        ).all()
        
        for exp in expenses:
            try:
                ref = f"EXP-{exp.id[-6:]}" if len(exp.id) >= 6 else f"EXP-{int(time.time())}"
                je = auto_post.post_expense(exp.tenant_id, system_user, ref, abs(exp.amount), description=exp.notes)
                if je:
                    exp.journal_entry_id = je.id
                    synced_expenses += 1
            except Exception:
                pass

        # Sync Payroll
        payrolls = db.query(PayrollRun).filter(
            PayrollRun.journal_entry_id == None,
            PayrollRun.status == "Paid"
        ).all()
        
        for run in payrolls:
            try:
                if run.total_net > 0:
                    je = auto_post.post_payroll(run.tenant_id, system_user, f"PAYROLL-{run.month}-{run.year}", run.total_net, description=f"Auto Post: Payroll generation {run.month}/{run.year}")
                    if je:
                        run.journal_entry_id = je.id
                        synced_payroll += 1
            except Exception:
                pass
                
        db.commit()
        print(f"[ACCOUNTING] Background sync complete: {synced_sales} sales, {synced_expenses} expenses, {synced_payroll} payroll runs processed.")
    except Exception as e:
        print(f"[ACCOUNTING] Background sync failed: {e}")
    finally:
        db.close()

def run_historical_sync():
    thread = threading.Thread(target=_sync_worker)
    thread.daemon = True
    thread.start()

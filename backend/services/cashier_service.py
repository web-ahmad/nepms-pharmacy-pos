"""
CashierService: shift open/close, petty cash, and ledger injection for sales.
"""
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.cash_register import CashSession, CashLedgerEntry


class CashierService:

    # ── Session management ─────────────────────────────────────────────────

    @staticmethod
    def get_open_session(db: Session, user_id: str, branch_id: str) -> CashSession | None:
        return db.query(CashSession).filter(
            CashSession.user_id == user_id,
            CashSession.branch_id == branch_id,
            CashSession.status == "OPEN",
            CashSession.is_deleted == False
        ).first()

    @staticmethod
    def open_session(db: Session, user_id: str, branch_id: str, tenant_id: str,
                     opening_balance: float) -> CashSession:
        # Guard: no duplicate open sessions
        existing = CashierService.get_open_session(db, user_id, branch_id)
        if existing:
            raise HTTPException(status_code=409, detail="A session is already open for this cashier.")

        session = CashSession(
            user_id=user_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            status="OPEN",
            opening_balance=opening_balance,
            opened_at=datetime.utcnow()
        )
        db.add(session)
        db.flush()

        # Record the opening float as a ledger entry
        entry = CashLedgerEntry(
            session_id=session.id,
            tenant_id=tenant_id,
            entry_type="OPENING",
            payment_mode="Cash",
            amount=opening_balance,
            notes="Opening cash float",
            created_at_utc=datetime.utcnow()
        )
        db.add(entry)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def close_session(db: Session, user_id: str, branch_id: str,
                      closing_balance_actual: float,
                      discrepancy_notes: str | None = None) -> CashSession:
        session = CashierService.get_open_session(db, user_id, branch_id)
        if not session:
            raise HTTPException(status_code=404, detail="No open session found for this cashier.")

        summary = CashierService._compute_summary(session)
        expected = summary["expected_drawer"]

        session.closing_balance_expected = expected
        session.closing_balance_actual = closing_balance_actual
        session.discrepancy = closing_balance_actual - expected
        session.discrepancy_notes = discrepancy_notes
        session.status = "CLOSED"
        session.closed_at = datetime.utcnow()

        db.commit()
        db.refresh(session)
        return session

    # ── Petty cash expense ─────────────────────────────────────────────────

    @staticmethod
    def log_expense(db: Session, user_id: str, branch_id: str, tenant_id: str,
                    amount: float, notes: str, payment_mode: str = "Cash") -> CashLedgerEntry:
        session = CashierService.get_open_session(db, user_id, branch_id)
        if not session:
            raise HTTPException(status_code=404, detail="No open session. Please open a shift first.")

        if amount <= 0:
            raise HTTPException(status_code=400, detail="Expense amount must be positive.")

        entry = CashLedgerEntry(
            session_id=session.id,
            tenant_id=tenant_id,
            entry_type="EXPENSE",
            payment_mode=payment_mode,
            amount=-abs(amount),  # stored negative to denote outflow
            notes=notes,
            created_at_utc=datetime.utcnow()
        )
        db.add(entry)

        try:
            # ── Auto-Posting (Accounting Engine) ────────────────────────
            from services.auto_posting_service import AutoPostingService
            auto_post = AutoPostingService(db)
            # Generate a pseudo-reference since expenses might not have one
            import time
            ref = f"EXP-{int(time.time())}"
            je = auto_post.post_expense(tenant_id, user_id, ref, abs(amount), description=notes)
            if je:
                entry.journal_entry_id = je.id
                
            db.commit()
            db.refresh(entry)
            return entry
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to post expense: {e}")

    # ── Inject sale entry (called from verify_complete_sale) ───────────────

    @staticmethod
    def inject_sale_entry(db: Session, user_id: str, branch_id: str, tenant_id: str,
                          sale_id: str, amount: float, payment_mode: str = "Cash") -> None:
        """
        Silently inject a SALE ledger entry into the cashier's active session.
        If no session is open, skip (don't fail the sale).
        """
        session = CashierService.get_open_session(db, user_id, branch_id)
        if not session:
            return  # no session → no ledger entry, but sale still goes through

        entry = CashLedgerEntry(
            session_id=session.id,
            tenant_id=tenant_id,
            entry_type="SALE",
            payment_mode=payment_mode,
            amount=amount,
            sale_id=sale_id,
            notes=f"Sale completed",
            created_at_utc=datetime.utcnow()
        )
        db.add(entry)
        # caller commits

    # ── Session summary computation ────────────────────────────────────────

    @staticmethod
    def _compute_summary(session: CashSession) -> dict:
        total_cash_sales = 0.0
        total_card_sales = 0.0
        total_expenses = 0.0
        total_returns = 0.0

        for e in session.ledger_entries:
            if e.entry_type == "SALE":
                mode = (e.payment_mode or "Cash").lower()
                if mode in ("cash",):
                    total_cash_sales += e.amount
                else:
                    total_card_sales += e.amount
            elif e.entry_type == "EXPENSE":
                total_expenses += abs(e.amount)
            elif e.entry_type == "RETURN":
                total_returns += abs(e.amount)

        expected_drawer = session.opening_balance + total_cash_sales - total_expenses - total_returns
        return {
            "total_cash_in": total_cash_sales,
            "total_card_in": total_card_sales,
            "total_expenses": total_expenses,
            "total_returns": total_returns,
            "expected_drawer": expected_drawer,
        }

    @staticmethod
    def get_session_summary(db: Session, user_id: str, branch_id: str) -> dict:
        session = CashierService.get_open_session(db, user_id, branch_id)
        if not session:
            raise HTTPException(status_code=404, detail="No open session found.")

        computed = CashierService._compute_summary(session)

        entries = []
        for e in session.ledger_entries:
            entries.append({
                "id": e.id,
                "entry_type": e.entry_type,
                "payment_mode": e.payment_mode,
                "amount": e.amount,
                "notes": e.notes,
                "created_at": e.created_at,
                "sale_id": e.sale_id,
                "invoice_number": e.sale.invoice_number if e.sale else None,
                "status": e.sale.status if e.sale else None
            })

        return {
            "session_id": session.id,
            "status": session.status,
            "opened_at": session.opened_at,
            "closed_at": session.closed_at,
            "cashier_name": session.cashier.username if session.cashier else "Unknown",
            "opening_balance": session.opening_balance,
            "total_cash_in": computed["total_cash_in"],
            "total_card_in": computed["total_card_in"],
            "total_expenses": computed["total_expenses"],
            "total_returns": computed["total_returns"],
            "expected_drawer": computed["expected_drawer"],
            "closing_balance_expected": computed["expected_drawer"],
            "closing_balance_actual": session.closing_balance_actual,
            "discrepancy": session.discrepancy,
            "discrepancy_notes": session.discrepancy_notes,
            "ledger_entries": entries,
        }

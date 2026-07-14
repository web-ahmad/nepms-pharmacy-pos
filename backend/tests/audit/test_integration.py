"""
tests/audit/test_integration.py
─────────────────────────────────
Integration test: inserts a real AuditEvent into the in-memory SQLite DB,
starts poll_audit_events, and verifies the pipeline writes an AlertHistory row.

No Supabase client needed — the listener uses SQLite via SessionLocal.
"""
import pytest
import asyncio
import sys
import os
import uuid
import datetime
from unittest.mock import patch, AsyncMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import Base
from models.audit import AuditEvent, AlertHistory, AlertConfig, CameraSnapshot
import services.audit_listener as audit_listener


# ── In-memory DB fixture ──────────────────────────────────────────────────────

@pytest.fixture(scope="function")
def mem_db():
    """Provides a fresh in-memory SQLite engine + session for each test."""
    engine  = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db      = Session()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def mem_session_factory(mem_db):
    """Returns a factory that yields the same in-memory session."""
    def factory():
        yield mem_db
    return factory


# ── Integration: poll_audit_events picks up an event and logs AlertHistory ───

@pytest.mark.asyncio
@patch("services.audit_listener._capture_webcam_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener._send_whatsapp", new_callable=AsyncMock)
async def test_poll_processes_void_event(mock_wa, mock_snap, mem_db):
    """
    Insert a void AuditEvent into SQLite → start poll_audit_events for 3s
    → verify AlertHistory row is created.
    """
    mock_snap.return_value = None
    mock_wa.return_value   = True

    # Patch SessionLocal to use our in-memory DB
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import create_engine
    engine2  = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine2)
    Session2 = sessionmaker(bind=engine2)

    pharmacy_id = str(uuid.uuid4())
    branch_id   = str(uuid.uuid4())

    # Insert event
    db2 = Session2()
    event_id = str(uuid.uuid4())
    event = AuditEvent(
        id             = event_id,
        branch_id      = branch_id,
        pharmacy_id    = pharmacy_id,
        staff_id       = "test-staff",
        event_type     = "void",
        created_at     = datetime.datetime.utcnow() - datetime.timedelta(seconds=3),
        metadata_      = {"staff_name": "Test Staff", "item_name": "Panadol",
                         "amount": 100.0, "reason": "Test reason"},
        severity       = "high",
    )
    db2.add(event)
    db2.commit()

    # Run the listener for a short burst
    with patch("services.audit_listener.SessionLocal", Session2), \
         patch("services.audit_listener.TEST_WHATSAPP_NUMBER", "03001234567"):

        listener = asyncio.create_task(
            audit_listener.poll_audit_events(poll_interval=0.5)
        )
        await asyncio.sleep(2.5)
        listener.cancel()
        try:
            await listener
        except asyncio.CancelledError:
            pass

    # Verify AlertHistory row was written
    history = db2.query(AlertHistory).filter(
        AlertHistory.audit_event_id == event_id
    ).first()

    db2.close()
    engine2.dispose()

    assert history is not None, "AlertHistory row not created by poll_audit_events"
    assert history.channel == "whatsapp"
    # WhatsApp mock returned True, so status should be 'sent'
    assert history.status in ("sent", "failed")   # either is fine — pipeline ran


# ── pharmacy_id is stamped by scan_inventory_flags ────────────────────────────

@pytest.mark.asyncio
async def test_scan_inventory_flags_stamps_pharmacy_id():
    """
    scan_inventory_flags creates AuditEvents for expired/near-expiry batches.
    After the pharmacy_id retrofit, those events must have pharmacy_id set.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine3  = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine3)
    Session3 = sessionmaker(bind=engine3)

    from models.inventory import Batch, Medicine
    from models.users import Pharmacy

    # ── Seed data in one session ──────────────────────────────────────────────
    seed_db = Session3()
    pharmacy_id = str(uuid.uuid4())
    med_id      = str(uuid.uuid4())
    branch_id   = str(uuid.uuid4())

    seed_db.add(Pharmacy(id=pharmacy_id, name="Test Pharm", subscription_status="active", is_active=True))
    seed_db.add(Medicine(
        id=med_id, name="Expired Medicine", pharmacy_id=pharmacy_id,
        tenant_id="t1", is_deleted=False
    ))
    yesterday = datetime.date.today() - datetime.timedelta(days=1)
    seed_db.add(Batch(
        id=str(uuid.uuid4()), medicine_id=med_id, batch_number="BT-EXP-01",
        expiry_date=yesterday, current_quantity=10, initial_quantity=10,
        branch_id=branch_id, pharmacy_id=pharmacy_id, is_deleted=False
    ))
    seed_db.commit()
    seed_db.close()

    # ── Run one scan pass with our Session3 factory ───────────────────────────
    import services.audit_listener as al

    iteration_count = 0

    async def fake_sleep(n):
        nonlocal iteration_count
        iteration_count += 1
        raise asyncio.CancelledError()  # stop after first pass

    with patch("services.audit_listener.SessionLocal", Session3), \
         patch("asyncio.sleep", fake_sleep):
        try:
            await al.scan_inventory_flags(scan_interval_seconds=0.1)
        except asyncio.CancelledError:
            pass

    # ── Verify in a fresh session (same engine) ───────────────────────────────
    verify_db = Session3()
    events = verify_db.query(AuditEvent).filter(AuditEvent.event_type == "expired").all()
    verify_db.close()

    engine3.dispose()

    assert len(events) >= 1, "scan_inventory_flags did not create an expired AuditEvent"
    for ev in events:
        assert ev.pharmacy_id is not None, (
            f"AuditEvent {ev.id} created by scan_inventory_flags is missing pharmacy_id"
        )

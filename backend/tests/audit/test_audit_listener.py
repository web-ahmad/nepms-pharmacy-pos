"""
tests/audit/test_audit_listener.py
────────────────────────────────────
Unit tests for services/audit_listener.py (SQLite-based, no Supabase).

These tests cover the internal handlers (_handle_void, _handle_discount,
_handle_refund, etc.) using an in-memory SQLite DB and mocking out
the webcam/WhatsApp side-effects.
"""
import pytest
import sys
import os
import asyncio
import uuid
import datetime
from unittest.mock import patch, MagicMock, AsyncMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import private handlers via their real names
from services.audit_listener import (
    _handle_void,
    _handle_discount,
    _handle_refund,
    _handle_cash_variance,
    _handle_expired,
    _handle_near_expiry,
    HANDLERS,
)


# ── Fixtures ─────────────────────────────────────────────────────────────────

def _make_event(event_type: str, meta: dict | None = None):
    """Return a mock AuditEvent ORM-like object."""
    event = MagicMock()
    event.id         = str(uuid.uuid4())
    event.branch_id  = "branch-test-001"
    event.staff_id   = "staff-test-001"
    event.pharmacy_id = "pharmacy-test-001"
    event.event_type  = event_type
    event.created_at  = datetime.datetime.utcnow()
    event.metadata_   = meta or {}
    return event


@pytest.fixture
def mock_db():
    """Return a mock SQLAlchemy session."""
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    # _get_configs returns empty list by default (no alert_config rows)
    db.query.return_value.filter.return_value.all.return_value = []
    return db


# ── HANDLERS map ─────────────────────────────────────────────────────────────

def test_handlers_map_complete():
    """All expected event types have handlers registered."""
    expected = {"void", "discount", "refund", "cash_variance", "expired", "near_expiry"}
    assert set(HANDLERS.keys()) == expected


# ── _handle_void ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
@patch("services.audit_listener._capture_webcam_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener._send_whatsapp", new_callable=AsyncMock)
async def test_void_handler_sends_whatsapp_when_number_set(mock_wa, mock_snap, mock_db):
    """Void handler captures snapshot + sends WhatsApp when TEST_WHATSAPP_NUMBER is set."""
    mock_snap.return_value = "/storage/snapshots/test.jpg"
    mock_wa.return_value   = True

    event = _make_event("void", {
        "staff_name":     "Ali Khan",
        "item_name":      "Panadol",
        "amount":         250.0,
        "reason":         "Customer returned",
        "invoice_number": "INV-001",
    })

    with patch("services.audit_listener.TEST_WHATSAPP_NUMBER", "03001234567"):
        await _handle_void(event, mock_db)

    mock_snap.assert_awaited_once_with(event.id, event.branch_id)
    mock_wa.assert_awaited_once()
    call_args = mock_wa.call_args
    msg = call_args[0][1]   # positional arg: message string
    assert "Suspicious Void Detected" in msg
    assert "Ali Khan" in msg
    assert "Panadol" in msg
    assert "250" in msg


@pytest.mark.asyncio
@patch("services.audit_listener._capture_webcam_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener._send_whatsapp", new_callable=AsyncMock)
async def test_void_handler_no_alert_without_config_or_number(mock_wa, mock_snap, mock_db):
    """Void handler does nothing when no alert_config and no TEST_WHATSAPP_NUMBER."""
    event = _make_event("void", {"staff_name": "Bob"})
    with patch("services.audit_listener.TEST_WHATSAPP_NUMBER", ""):
        await _handle_void(event, mock_db)
    mock_snap.assert_not_awaited()
    mock_wa.assert_not_awaited()


# ── _handle_discount ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
@patch("services.audit_listener._capture_webcam_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener._send_whatsapp", new_callable=AsyncMock)
async def test_discount_handler_sends_whatsapp(mock_wa, mock_snap, mock_db):
    """Discount handler captures snapshot + sends WhatsApp message."""
    mock_snap.return_value = "/storage/snapshots/disc.jpg"
    mock_wa.return_value   = True
    event = _make_event("discount", {"staff_name": "Sara", "discount_percent": 40})

    await _handle_discount(event, mock_db)

    mock_snap.assert_awaited_once()
    mock_wa.assert_awaited_once()
    msg = mock_wa.call_args[0][1]
    assert "Large Discount Applied" in msg
    assert "Sara" in msg
    assert "40" in msg


# ── _handle_refund ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
@patch("services.audit_listener._capture_webcam_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener._send_whatsapp", new_callable=AsyncMock)
async def test_refund_handler_sends_whatsapp(mock_wa, mock_snap, mock_db):
    """Refund handler sends message containing amount and reason."""
    mock_snap.return_value = None   # webcam unavailable
    mock_wa.return_value   = True
    event = _make_event("refund", {
        "staff_name": "Ahmed",
        "amount": 500.0,
        "reason": "Damaged product",
    })

    await _handle_refund(event, mock_db)

    mock_wa.assert_awaited_once()
    msg = mock_wa.call_args[0][1]
    assert "Refund Issued" in msg
    assert "500" in msg
    assert "Damaged product" in msg


# ── _handle_cash_variance ────────────────────────────────────────────────────

@pytest.mark.asyncio
@patch("services.audit_listener._capture_webcam_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener._send_whatsapp", new_callable=AsyncMock)
async def test_cash_variance_short(mock_wa, mock_snap, mock_db):
    """Cash variance handler flags a SHORT correctly."""
    mock_snap.return_value = None
    mock_wa.return_value   = True
    event = _make_event("cash_variance", {
        "staff_name":    "Cashier A",
        "variance":      -200.0,
        "variance_type": "SHORT",
        "expected_cash": 10000.0,
        "actual_cash":   9800.0,
        "shift_date":    "2026-07-14",
    })

    await _handle_cash_variance(event, mock_db)

    mock_wa.assert_awaited_once()
    msg = mock_wa.call_args[0][1]
    assert "Cash Drawer SHORT Detected" in msg
    assert "Cashier A" in msg


# ── _handle_expired ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
@patch("services.audit_listener._capture_webcam_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener._send_whatsapp", new_callable=AsyncMock)
async def test_expired_handler(mock_wa, mock_snap, mock_db):
    """Expired handler sends WhatsApp with product name and batch info."""
    mock_snap.return_value = None
    mock_wa.return_value   = True
    event = _make_event("expired", {
        "product_name": "Aspirin 500mg",
        "batch_no":     "BT-2023-01",
        "expiry_date":  "2024-01-01",
        "qty":          50,
    })

    await _handle_expired(event, mock_db)

    mock_wa.assert_awaited_once()
    msg = mock_wa.call_args[0][1]
    assert "Expired Stock Detected" in msg
    assert "Aspirin 500mg" in msg


# ── _handle_near_expiry ───────────────────────────────────────────────────────

@pytest.mark.asyncio
@patch("services.audit_listener._capture_webcam_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener._send_whatsapp", new_callable=AsyncMock)
async def test_near_expiry_handler(mock_wa, mock_snap, mock_db):
    """Near-expiry handler mentions days remaining."""
    mock_snap.return_value = None
    mock_wa.return_value   = True
    event = _make_event("near_expiry", {
        "product_name":   "Ibuprofen",
        "batch_no":       "BT-2026-05",
        "expiry_date":    "2026-08-10",
        "days_remaining": 27,
        "qty":            100,
    })

    await _handle_near_expiry(event, mock_db)

    mock_wa.assert_awaited_once()
    msg = mock_wa.call_args[0][1]
    assert "Near-Expiry" in msg
    assert "Ibuprofen" in msg
    assert "27" in msg


# ── DB log_alert called after each handler ────────────────────────────────────

@pytest.mark.asyncio
@patch("services.audit_listener._capture_webcam_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener._send_whatsapp", new_callable=AsyncMock)
async def test_alert_history_is_logged(mock_wa, mock_snap, mock_db):
    """_log_alert should commit an AlertHistory row after handling void."""
    mock_snap.return_value = None
    mock_wa.return_value   = True
    event = _make_event("void", {"staff_name": "Test"})

    with patch("services.audit_listener.TEST_WHATSAPP_NUMBER", "03001234567"):
        await _handle_void(event, mock_db)

    # db.add and db.commit must have been called (for AlertHistory row)
    assert mock_db.add.called
    assert mock_db.commit.called

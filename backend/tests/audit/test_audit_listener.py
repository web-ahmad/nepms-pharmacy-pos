import pytest
import sys
import os
from unittest.mock import patch, MagicMock, AsyncMock

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services.audit_listener import void_handler, discount_handler, refund_handler

@pytest.fixture
def mock_event():
    return {
        "id": "event_123",
        "branch_id": "branch_1",
        "staff_id": "staff_1",
        "event_type": "void",
        "created_at": "2023-10-27T10:00:00Z",
        "metadata": {
            "staff_name": "John Doe",
            "item_name": "Aspirin",
            "amount": 15.50,
            "reason": "Customer changed mind",
            "discount_percent": 25.0,
            "original_price": 20.0,
            "customer_id": "cust_1"
        }
    }

@pytest.mark.asyncio
@patch("services.audit_listener.send_whatsapp_alert", new_callable=AsyncMock)
@patch("services.audit_listener.process_camera_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener.supabase")
async def test_void_handler(mock_supabase, mock_snapshot, mock_whatsapp, mock_event):
    mock_snapshot.return_value = "http://snapshot.url/img.jpg"
    
    # Setup mock supabase response for alert_config
    mock_config_response = MagicMock()
    mock_config_response.data = [{"notify_via": "whatsapp", "owner_id": "owner_1"}]
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = mock_config_response

    await void_handler(mock_event)

    # Verify camera was triggered
    mock_snapshot.assert_called_once_with("event_123", "branch_1", "2023-10-27T10:00:00Z")
    
    # Verify whatsapp was called
    mock_whatsapp.assert_called_once()
    args, kwargs = mock_whatsapp.call_args
    assert "event_123" in args
    assert "owner_1" in args
    assert "Suspicious Void Detected" in args[3]
    assert "http://snapshot.url/img.jpg" in args[4]

@pytest.mark.asyncio
@patch("services.audit_listener.send_whatsapp_alert", new_callable=AsyncMock)
@patch("services.audit_listener.process_camera_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener.supabase")
async def test_discount_handler_below_threshold(mock_supabase, mock_snapshot, mock_whatsapp, mock_event):
    mock_event['event_type'] = 'discount'
    
    mock_config_response = MagicMock()
    # Threshold is 30, discount is 25, so no alert should be triggered
    mock_config_response.data = [{"notify_via": "whatsapp", "owner_id": "owner_1", "threshold_value": 30.0}]
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = mock_config_response

    await discount_handler(mock_event)

    # Verify no camera or whatsapp triggered
    mock_snapshot.assert_not_called()
    mock_whatsapp.assert_not_called()

@pytest.mark.asyncio
@patch("services.audit_listener.send_whatsapp_alert", new_callable=AsyncMock)
@patch("services.audit_listener.process_camera_snapshot", new_callable=AsyncMock)
@patch("services.audit_listener.supabase")
async def test_refund_handler_repeated(mock_supabase, mock_snapshot, mock_whatsapp, mock_event):
    mock_event['event_type'] = 'refund'
    
    # Alert config mock
    mock_config_response = MagicMock()
    mock_config_response.data = [{"notify_via": "whatsapp", "owner_id": "owner_1"}]
    
    # Past refunds mock
    mock_past_refunds_response = MagicMock()
    mock_past_refunds_response.data = [{"id": "event_old"}]
    
    # We need to configure the supabase mock chain to return config first, then past refunds
    # A simple way for a complex chain is to use side_effect on execute()
    mock_execute = MagicMock()
    mock_execute.side_effect = [mock_config_response, mock_past_refunds_response, MagicMock(), MagicMock()]
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute = mock_execute
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.gt.return_value.neq.return_value.contains.return_value.execute = mock_execute

    await refund_handler(mock_event)

    mock_whatsapp.assert_called_once()
    args, kwargs = mock_whatsapp.call_args
    # Verify escalated message
    assert "ESCALATED: Repeated Refund Detected" in args[3]

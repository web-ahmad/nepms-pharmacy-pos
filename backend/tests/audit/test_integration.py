import pytest
import asyncio
import sys
import os
import uuid
import datetime
from dotenv import load_dotenv
from supabase import create_client
from unittest.mock import patch, AsyncMock

# Load test env before anything else
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env.test'))

TEST_SUPABASE_URL = os.environ.get("TEST_SUPABASE_URL")
TEST_SUPABASE_KEY = os.environ.get("TEST_SUPABASE_KEY")

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# It's important to mock the Supabase client inside the module to point to our test DB.
import services.audit_listener as audit_listener

@pytest.fixture
async def setup_integration():
    # If test env is not configured, skip
    if not TEST_SUPABASE_URL or TEST_SUPABASE_URL == "http://localhost:8000":
        pytest.skip("Test Supabase credentials not provided in .env.test. Skipping integration test.")
        
    test_supabase = create_client(TEST_SUPABASE_URL, TEST_SUPABASE_KEY)
    
    # Patch the module-level supabase client in audit_listener
    audit_listener.supabase = test_supabase
    
    # Generate unique IDs for our test data
    branch_id = "test_branch_" + str(uuid.uuid4())[:8]
    event_id = str(uuid.uuid4())
    owner_id = "test_owner_" + str(uuid.uuid4())[:8]
    
    # Setup test config
    test_supabase.table("alert_config").insert({
        "branch_id": branch_id,
        "event_type": "void",
        "is_enabled": True,
        "notify_via": "both",
        "owner_id": owner_id,
        "schedule_hour": 9,
        "schedule_day_of_week": 1,
        "threshold_value": 0
    }).execute()
    
    yield test_supabase, branch_id, event_id, owner_id
    
    # Teardown: cleanup test data from test DB
    test_supabase.table("alert_history").delete().eq("audit_event_id", event_id).execute()
    test_supabase.table("camera_snapshots").delete().eq("audit_event_id", event_id).execute()
    test_supabase.table("audit_events").delete().eq("id", event_id).execute()
    test_supabase.table("alert_config").delete().eq("branch_id", branch_id).execute()

@pytest.mark.asyncio
@patch("services.audit_listener.send_whatsapp_alert", new_callable=AsyncMock)
@patch("services.audit_listener.capture_snapshot", new_callable=AsyncMock)
async def test_live_listener_pipeline(mock_snapshot, mock_whatsapp, setup_integration):
    test_supabase, branch_id, event_id, owner_id = setup_integration
    
    mock_snapshot.return_value = "http://test-snapshot/img.jpg"
    
    # Start listener in background
    listener_task = asyncio.create_task(audit_listener.poll_audit_events(poll_interval=1.0))
    
    # Give listener a moment to establish its baseline (fetching the latest created_at)
    await asyncio.sleep(2)
    
    # Insert the fake event
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    test_supabase.table("audit_events").insert({
        "id": event_id,
        "branch_id": branch_id,
        "staff_id": "test_staff_1",
        "event_type": "void",
        "created_at": now,
        "metadata": {
            "staff_name": "Integration Test Staff",
            "item_name": "Test Item",
            "amount": 99.99,
            "reason": "Integration Test Void"
        }
    }).execute()
    
    # Poll alert_history to see if the pipeline processed it
    max_retries = 10
    found = False
    
    for _ in range(max_retries):
        await asyncio.sleep(1)
        resp = test_supabase.table("alert_history").select("*").eq("audit_event_id", event_id).execute()
        
        if resp.data and len(resp.data) > 0:
            found = True
            history_record = resp.data[0]
            assert history_record["channel"] == "dashboard"
            assert history_record["sent_to"] == owner_id
            assert history_record["status"] == "pending"
            break
            
    # Verify whatsapp was still "called" by the pipeline (even though we mocked the actual network request)
    mock_whatsapp.assert_called_once()
    args, _ = mock_whatsapp.call_args
    assert args[0] == event_id
    assert args[1] == owner_id
    assert "Suspicious Void Detected" in args[3]
    
    # Cleanup background task
    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass
        
    assert found, "Timeout: Listener pipeline did not process the event and insert into alert_history within 10 seconds."

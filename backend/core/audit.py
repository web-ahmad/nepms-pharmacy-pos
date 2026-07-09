from sqlalchemy import event
from sqlalchemy.orm import Session
from models.audit import AuditLog
from core.audit_context import current_user_id, current_tenant_id, current_branch_id
import json
from fastapi.encoders import jsonable_encoder
# List of models we want to actively audit
AUDITABLE_MODELS = [
    "Medicine", "Batch", "StockAdjustment", "StockMovement",
    "PurchaseOrder", "GRN", "PurchaseInvoice", "SupplierPayment",
    "Sale", "SaleReturn", "CustomerLedger"
]

def model_to_dict(obj):
    return jsonable_encoder({c.name: getattr(obj, c.name) for c in obj.__table__.columns if c.name not in ['created_at', 'updated_at']})

def create_audit_log(session: Session, obj, action: str, old_val: dict = None, new_val: dict = None):
    model_name = obj.__class__.__name__
    if model_name not in AUDITABLE_MODELS:
        return
        
    u_id = current_user_id.get()
    t_id = current_tenant_id.get() or getattr(obj, 'tenant_id', None)
    b_id = current_branch_id.get() or getattr(obj, 'branch_id', None)
    
    # We add this directly to the session. Since this is an event, we need to be careful with flush cycles
    # In 'after_flush', we can't easily add objects safely without risking infinite loops.
    # It's better to add them to session.info and insert them in 'after_commit' or a separate transaction.
    # However, SQLAlchemy supports adding objects in 'before_flush' safely.
    
    log = AuditLog(
        user_id=u_id,
        tenant_id=t_id,
        branch_id=b_id,
        action=action,
        entity_type=model_name,
        entity_id=str(obj.id),
        previous_value=old_val,
        new_value=new_val
    )
    
    # Check for media payloads in the session
    media_data = getattr(session, 'audit_media_payloads', None)
    
    # Guard Clause for critical actions (User requested)
    is_critical_action = False
    if model_name == "Sale" and action == "UPDATE" and new_val and new_val.get("status") == "Voided":
        is_critical_action = True
    if model_name == "StockMovement" and new_val and new_val.get("movement_type") == "VOID_SALE":
        is_critical_action = True
        
    if is_critical_action and not media_data:
        import logging
        logger = logging.getLogger(__name__)
        logger.error("Security Alert: Missing Media for Critical Action!")
        raise ValueError("Surveillance data required for audit compliance.")
        
    if media_data:
        log.media_urls = media_data
        log.severity = "Critical"
        
    if not hasattr(session, 'audit_logs_to_save'):
        session.audit_logs_to_save = []
    session.audit_logs_to_save.append(log)

@event.listens_for(Session, "before_flush")
def before_flush(session, flush_context, instances):
    for obj in session.new:
        if obj.__class__.__name__ in AUDITABLE_MODELS:
            create_audit_log(session, obj, "CREATE", new_val=model_to_dict(obj))

    from sqlalchemy.orm.attributes import get_history
    for obj in session.dirty:
        if obj.__class__.__name__ in AUDITABLE_MODELS:
            old_dict = {}
            new_dict = {}
            has_changes = False
            for attr in obj.__table__.columns.keys():
                hist = get_history(obj, attr)
                if hist.has_changes():
                    has_changes = True
                    old_dict[attr] = hist.deleted[0] if hist.deleted else None
                    new_dict[attr] = hist.added[0] if hist.added else None
            
            if has_changes:
                create_audit_log(session, obj, "UPDATE", old_val=jsonable_encoder(old_dict), new_val=jsonable_encoder(new_dict))

    for obj in session.deleted:
        if obj.__class__.__name__ in AUDITABLE_MODELS:
            create_audit_log(session, obj, "DELETE", old_val=model_to_dict(obj))
            
    # Add audit logs to session before flush actually executes
    if hasattr(session, 'audit_logs_to_save') and session.audit_logs_to_save:
        for log in session.audit_logs_to_save:
            session.add(log)
            # Store in session.info for after_commit
            if log.severity == "Critical" and log.media_urls:
                if 'pending_whatsapp_alerts' not in session.info:
                    session.info['pending_whatsapp_alerts'] = []
                session.info['pending_whatsapp_alerts'].append(log)
        session.audit_logs_to_save = []

@event.listens_for(Session, "after_commit")
def after_commit(session):
    alerts = session.info.pop('pending_whatsapp_alerts', [])
    if alerts:
        import threading
        import requests
        
        def send_alerts(logs):
            for log in logs:
                try:
                    # Construct message
                    msg = f"🚨 *SECURITY ALERT - NEPMS Pharmacy*\n*Action:* {log.action} ({log.entity_type} {log.entity_id})\n*Time:* {log.created_at or 'Just now'}\n*Severity:* {log.severity}"
                    
                    media = []
                    if log.media_urls:
                        if log.media_urls.get('webcam'):
                            media.append({
                                'mimetype': 'image/jpeg',
                                'base64': log.media_urls['webcam'].split(',')[-1] if ',' in log.media_urls['webcam'] else log.media_urls['webcam'],
                                'filename': 'webcam.jpg'
                            })
                        if log.media_urls.get('screenshot'):
                            media.append({
                                'mimetype': 'image/jpeg',
                                'base64': log.media_urls['screenshot'].split(',')[-1] if ',' in log.media_urls['screenshot'] else log.media_urls['screenshot'],
                                'filename': 'screenshot.jpg'
                            })
                    
                    # Target Phone (Hardcoded CEO/Admin for now)
                    target_phone = "923000000000"
                    
                    requests.post("http://localhost:3001/send", json={
                        "phone": target_phone,
                        "message": msg,
                        "media": media
                    }, timeout=5)
                    
                    # Ideally update log.whatsapp_alert_sent = True here (omitted for brevity)
                except Exception as e:
                    print(f"Failed to send WhatsApp alert: {e}")
                    
        # Run in background thread
        threading.Thread(target=send_alerts, args=(alerts,)).start()

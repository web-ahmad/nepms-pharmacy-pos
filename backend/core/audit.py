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
        session.audit_logs_to_save = []

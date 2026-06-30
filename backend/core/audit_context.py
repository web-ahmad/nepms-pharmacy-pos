import contextvars
from typing import Optional

# Context variables to hold user/tenant state during a request
current_user_id = contextvars.ContextVar("current_user_id", default=None)
current_tenant_id = contextvars.ContextVar("current_tenant_id", default=None)
current_branch_id = contextvars.ContextVar("current_branch_id", default=None)

def set_audit_context(user_id: Optional[str], tenant_id: Optional[str], branch_id: Optional[str]):
    current_user_id.set(user_id)
    current_tenant_id.set(tenant_id)
    current_branch_id.set(branch_id)

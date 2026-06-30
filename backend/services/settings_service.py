from sqlalchemy.orm import Session
from repositories.settings import SettingsRepository
from schemas.settings import TenantSettingsUpdate, SystemModuleUpdate
from models.audit import AuditLog

class SettingsService:
    def __init__(self, db: Session):
        self.repo = SettingsRepository(db)

    def get_settings(self, tenant_id: str):
        return self.repo.get_settings(tenant_id)

    def update_settings(self, tenant_id: str, obj_in: TenantSettingsUpdate):
        return self.repo.update_settings(tenant_id, obj_in)

    def get_invoice_settings(self, tenant_id: str):
        return self.repo.get_invoice_settings(tenant_id)

    def update_invoice_settings(self, tenant_id: str, obj_in):
        return self.repo.update_invoice_settings(tenant_id, obj_in)

    def get_modules(self, tenant_id: str):
        return self.repo.get_modules(tenant_id)

    def update_module(self, tenant_id: str, module_id: str, user_id: str, obj_in: SystemModuleUpdate):
        mod = self.repo.update_module(tenant_id, module_id, obj_in)
        if mod:
            action_str = "Enabled" if obj_in.is_enabled else "Disabled"
            # AuditLog must capture every Enable/Disable action.
            self.repo.db.add(AuditLog(
                tenant_id=tenant_id,
                user_id=user_id,
                action=f"{action_str} Module",
                entity_type="SystemModule",
                entity_id=mod.module_key,
                details=f"Module {mod.module_name} was {action_str.lower()}."
            ))
            self.repo.db.commit()
        return mod

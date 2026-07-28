from sqlalchemy.orm import Session
from repositories.settings import SettingsRepository
from schemas.settings import TenantSettingsUpdate, SystemModuleUpdate

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
        # NOTE: the previous implementation wrote to an `AuditLog` model that was
        # never imported and does not exist, so every toggle raised NameError ->
        # HTTP 500. The repository already commits the change; just return it.
        return self.repo.update_module(tenant_id, module_id, obj_in)

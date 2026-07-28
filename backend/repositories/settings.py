from sqlalchemy.orm import Session
from models.settings import TenantSettings, SystemModule
from schemas.settings import TenantSettingsUpdate, SystemModuleUpdate

class SettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_settings(self, tenant_id: str):
        settings = self.db.query(TenantSettings).filter(TenantSettings.tenant_id == tenant_id).first()
        if not settings:
            settings = TenantSettings(tenant_id=tenant_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update_settings(self, tenant_id: str, obj_in: TenantSettingsUpdate):
        settings = self.get_settings(tenant_id)
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(settings, key, value)
            
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def get_invoice_settings(self, tenant_id: str):
        from models.settings import InvoiceSettings
        settings = self.db.query(InvoiceSettings).filter(InvoiceSettings.tenant_id == tenant_id).first()
        if not settings:
            settings = InvoiceSettings(tenant_id=tenant_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update_invoice_settings(self, tenant_id: str, obj_in):
        settings = self.get_invoice_settings(tenant_id)
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(settings, key, value)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    # The canonical list of REAL, toggleable modules — these are exactly the
    # module keys the app's sidebar/routes actually gate on (see NAV_ITEMS
    # `moduleKey`). Anything not here (batches, grn, trial_balance, leaves, …)
    # was seeded historically but gates nothing, so it must never be shown.
    # (key, display name, category)
    CANONICAL_MODULES = [
        # One module per sidebar link, so each can be hidden independently.
        # (key, display name, category) — Settings is intentionally NOT here:
        # it stays always-visible so an admin can never lock themselves out.
        ("dashboard",      "Dashboard",        "Core"),
        ("reports",        "Reports",          "Core"),
        ("analytics",      "Analytics",        "Core"),
        ("pos",            "POS Terminal",     "Sales"),
        ("cashier",        "Cashier Portal",   "Sales"),
        ("sales",          "Sales History",    "Sales"),
        ("add_medicine",   "Add Medicine",     "Inventory"),
        ("inventory",      "Inventory Core",   "Inventory"),
        ("low_stock",      "Low Stock Alerts", "Inventory"),
        ("physical_audit", "Physical Audit",   "Inventory"),
        ("purchases",      "Purchases",        "Purchase"),
        ("expenses",       "Expenses",         "Finance"),
        ("accounting",     "Accounting",       "Finance"),
        ("customers",      "Customers",        "CRM"),
        ("marketing",      "Marketing",        "CRM"),
        ("prescriptions",  "Prescriptions",    "Clinical"),
        ("hr",             "HR & Payroll",     "HR"),
        ("compliance",     "Compliance",       "Compliance"),
        ("audit_center",   "Audit Center",     "Compliance"),
        ("notifications",  "Notifications",    "System"),
        ("users",          "Users & Roles",    "System"),
        ("roles",          "Roles",            "System"),
    ]

    def get_modules(self, tenant_id: str):
        """Reconcile the tenant's modules to the canonical set, then return only
        those (in canonical order). Self-heals every tenant: adds any missing
        real modules, fixes names/categories, and hides legacy sub-feature rows —
        without deleting data. Existing enable/disable state is preserved."""
        existing = {
            m.module_key: m
            for m in self.db.query(SystemModule).filter(SystemModule.tenant_id == tenant_id).all()
        }

        changed = False
        for key, name, category in self.CANONICAL_MODULES:
            mod = existing.get(key)
            if mod is None:
                self.db.add(SystemModule(
                    tenant_id=tenant_id, module_key=key,
                    module_name=name, category=category, is_enabled=True,
                ))
                changed = True
            elif mod.module_name != name or mod.category != category:
                mod.module_name = name
                mod.category = category
                changed = True
        if changed:
            self.db.commit()

        canonical_keys = [k for k, _, _ in self.CANONICAL_MODULES]
        order = {k: i for i, k in enumerate(canonical_keys)}
        rows = self.db.query(SystemModule).filter(
            SystemModule.tenant_id == tenant_id,
            SystemModule.module_key.in_(canonical_keys),
        ).all()
        rows.sort(key=lambda r: order.get(r.module_key, 999))
        return rows

    def update_module(self, tenant_id: str, module_id: str, obj_in: SystemModuleUpdate):
        mod = self.db.query(SystemModule).filter(SystemModule.tenant_id == tenant_id, SystemModule.id == module_id).first()
        if mod:
            mod.is_enabled = obj_in.is_enabled
            self.db.commit()
            self.db.refresh(mod)
        return mod

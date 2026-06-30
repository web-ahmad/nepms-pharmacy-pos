from sqlalchemy import Column, String, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import BaseModel

class Tenant(BaseModel):
    __tablename__ = "tenants"

    name = Column(String(255), nullable=False)
    subdomain = Column(String(100), unique=True, index=True)
    timezone = Column(String(50), default="UTC")
    is_active = Column(Boolean, default=True)
    
    branches = relationship("Branch", back_populates="tenant")
    users = relationship("User", back_populates="tenant")

class Branch(BaseModel):
    __tablename__ = "branches"

    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, index=True)
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(255))
    is_main = Column(Boolean, default=False)
    
    tenant_id = Column(String(36), ForeignKey("tenants.id"))
    tenant = relationship("Tenant", back_populates="branches")
    
    users = relationship("UserBranch", back_populates="branch")

class Permission(BaseModel):
    __tablename__ = "permissions"

    module = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    code = Column(String(200), unique=True, index=True, nullable=False)

    roles = relationship("RolePermission", back_populates="permission")

class RolePermission(BaseModel):
    __tablename__ = "role_permissions"

    role_id = Column(String(36), ForeignKey("roles.id"))
    permission_id = Column(String(36), ForeignKey("permissions.id"))

    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="roles")

class Role(BaseModel):
    __tablename__ = "roles"

    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_system_default = Column(Boolean, default=False)
    
    users = relationship("User", back_populates="role")
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")

class User(BaseModel):
    __tablename__ = "users"

    username = Column(String(150), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone = Column(String(50))
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)

    tenant_id = Column(String(36), ForeignKey("tenants.id"))
    tenant = relationship("Tenant", back_populates="users")

    role_id = Column(String(36), ForeignKey("roles.id"))
    role = relationship("Role", back_populates="users")

    branches = relationship("UserBranch", back_populates="user")

    @property
    def permissions(self):
        if self.is_super_admin:
            return ["*"]
        if self.role and self.role.role_permissions:
            return [rp.permission.code for rp in self.role.role_permissions if rp.permission]
        return []

class UserBranch(BaseModel):
    __tablename__ = "user_branches"
    
    user_id = Column(String(36), ForeignKey("users.id"))
    branch_id = Column(String(36), ForeignKey("branches.id"))
    
    user = relationship("User", back_populates="branches")
    branch = relationship("Branch", back_populates="users")

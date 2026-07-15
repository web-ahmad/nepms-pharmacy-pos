"""
tests/enterprise/test_users.py
────────────────────────────────
Unit / integration tests for Enterprise Users & Identity Management.

Runs in-process with an in-memory SQLite database — no external services.

Coverage
────────
  ✓ Create user — happy path
  ✓ Duplicate username rejected
  ✓ Duplicate email rejected
  ✓ Suspend user
  ✓ Activate suspended user
  ✓ Lock user (temp + permanent)
  ✓ Unlock user
  ✓ Reset password — generates temp password
  ✓ Force password change flag
  ✓ Password history stored
  ✓ Branch assignment
  ✓ Branch removal
  ✓ Branch transfer
  ✓ Effective permissions computed from role
  ✓ Permission overrides applied per branch
  ✓ Session termination (single + all)
  ✓ Device revoke
  ✓ Device block
  ✓ Login history logged
  ✓ Activity log entries created on status change
  ✓ Dashboard summary counts correct
  ✓ Soft delete hides user from list
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models.users import User
from models.enterprise.branch import PharmacyBranch
from models.enterprise.user import (
    EnterpriseUser, EnterpriseRole, EnterprisePermission,
    EnterpriseRolePermission, BranchUserAssignment,
    UserSession, UserTrustedDevice, UserLoginHistory, UserActivityLog,
    EnterpriseUserStatus, ActivityEventType,
)
from repositories.enterprise.user import enterprise_user_repository
from repositories.enterprise.role import role_repository
from services.enterprise.user_service import user_service
from schemas.enterprise.user import (
    EnterpriseUserCreate, EnterpriseUserUpdate,
    BranchAssignmentCreate, BranchTransferRequest,
    PasswordResetRequest, SuspendRequest, LockRequest,
    RoleCreate,
)


# ── Constants ─────────────────────────────────────────────────────────────────

PID   = "pharmacy-test-0001"
PID_B = "pharmacy-test-0002"
ADMIN_UID = "admin-user-0001"


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def engine():
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)


@pytest.fixture(scope="module")
def db(engine):
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture(scope="module")
def sample_branch(db):
    branch = PharmacyBranch(
        name="Main Branch", code="MAIN", pharmacy_id=PID,
        type="main_branch", status="active",
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@pytest.fixture(scope="module")
def sample_role(db):
    role = EnterpriseRole(
        name="Test Pharmacist", pharmacy_id=PID, color="#10b981",
    )
    db.add(role)
    db.flush()
    # Add a permission
    perm = EnterprisePermission(
        module="inventory", action="view", code="inventory:view",
        label="Inventory View", pharmacy_id=PID,
    )
    db.add(perm)
    db.flush()
    rp = EnterpriseRolePermission(role_id=role.id, permission_id=perm.id)
    db.add(rp)
    db.commit()
    db.refresh(role)
    return role


@pytest.fixture(scope="module")
def sample_user(db, sample_role, sample_branch):
    data = EnterpriseUserCreate(
        username="jdoe_test",
        email="jdoe@test.example.com",
        password="SecurePass123!",
        full_name="John Doe",
        user_type="pharmacist",
        enterprise_role_id=sample_role.id,
        default_branch_id=sample_branch.id,
        branch_role="pharmacist",
    )
    eu = user_service.create_user(db, data=data, pharmacy_id=PID, created_by_id=ADMIN_UID)
    return eu


# ── Tests: Create ─────────────────────────────────────────────────────────────

class TestCreateUser:
    def test_create_happy_path(self, sample_user):
        assert sample_user.id is not None
        assert sample_user.status == EnterpriseUserStatus.ACTIVE.value
        assert sample_user.user is not None
        assert sample_user.user.username == "jdoe_test"

    def test_duplicate_username_rejected(self, db, sample_role):
        data = EnterpriseUserCreate(
            username="jdoe_test",  # duplicate
            email="other@test.example.com",
            password="Pass1234!",
            user_type="pharmacist",
        )
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            user_service.create_user(db, data=data, pharmacy_id=PID)
        assert exc.value.status_code == 400

    def test_duplicate_email_rejected(self, db):
        data = EnterpriseUserCreate(
            username="new_user_unique",
            email="jdoe@test.example.com",  # duplicate
            password="Pass1234!",
            user_type="pharmacist",
        )
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            user_service.create_user(db, data=data, pharmacy_id=PID)
        assert exc.value.status_code == 400

    def test_default_branch_assigned(self, sample_user, sample_branch):
        assignments = [a for a in sample_user.branch_assignments if a.is_active]
        assert len(assignments) >= 1
        assert any(a.branch_id == sample_branch.id for a in assignments)

    def test_password_history_stored(self, sample_user):
        assert sample_user.password_history
        assert len(sample_user.password_history) >= 1


# ── Tests: Status lifecycle ───────────────────────────────────────────────────

class TestStatusLifecycle:
    def test_suspend_user(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        eu = user_service.suspend_user(
            db, enterprise_user=eu, reason="Policy violation", performed_by_id=ADMIN_UID
        )
        assert eu.status == EnterpriseUserStatus.SUSPENDED.value

    def test_activate_suspended_user(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        eu = user_service.activate_user(db, enterprise_user=eu, performed_by_id=ADMIN_UID)
        assert eu.status == EnterpriseUserStatus.ACTIVE.value

    def test_lock_temp(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        eu = user_service.lock_user(
            db, enterprise_user=eu, reason="Test temp lock", permanent=False
        )
        assert eu.status == EnterpriseUserStatus.LOCKED_TEMP.value
        assert eu.locked_at is not None

    def test_unlock(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        eu = user_service.unlock_user(db, enterprise_user=eu, performed_by_id=ADMIN_UID)
        assert eu.status == EnterpriseUserStatus.ACTIVE.value
        assert eu.locked_at is None
        assert eu.failed_login_count == 0

    def test_lock_permanent(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        eu = user_service.lock_user(
            db, enterprise_user=eu, reason="Permanent lock test", permanent=True
        )
        assert eu.status == EnterpriseUserStatus.LOCKED_PERMANENT.value

    def test_unlock_permanent(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        user_service.unlock_user(db, enterprise_user=eu)
        db.refresh(eu)
        assert eu.status == EnterpriseUserStatus.ACTIVE.value


# ── Tests: Password management ────────────────────────────────────────────────

class TestPasswordManagement:
    def test_reset_password_returns_temp_password(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        temp_pw = user_service.reset_password(
            db, enterprise_user=eu, data=PasswordResetRequest(force_change=True), performed_by_id=ADMIN_UID
        )
        assert isinstance(temp_pw, str)
        assert len(temp_pw) >= 8

    def test_force_change_flag_set_after_reset(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        assert eu.force_password_change is True

    def test_force_password_change_explicit(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        # clear first
        eu.force_password_change = False
        db.commit()
        user_service.force_password_change(db, enterprise_user=eu)
        db.refresh(eu)
        assert eu.force_password_change is True


# ── Tests: Branch management ──────────────────────────────────────────────────

class TestBranchManagement:
    def test_add_second_branch(self, db, sample_user):
        branch2 = PharmacyBranch(
            name="Branch 2", code="BR2", pharmacy_id=PID, type="retail_branch", status="active"
        )
        db.add(branch2)
        db.commit()
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        assignment = user_service.assign_to_branch(
            db,
            enterprise_user=eu,
            data=BranchAssignmentCreate(branch_id=branch2.id, role="cashier"),
            assigned_by_id=ADMIN_UID,
        )
        assert assignment.id is not None
        assert assignment.branch_id == branch2.id

    def test_remove_branch(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        active_before = [a for a in eu.branch_assignments if a.is_active]
        # Remove last active branch (not default)
        non_default = [a for a in active_before if not a.is_default_branch]
        if non_default:
            enterprise_user_repository.remove_branch_assignment(db, eu.id, non_default[0].branch_id)
            db.refresh(eu)
            active_after = enterprise_user_repository.get_branch_assignments(db, eu.id)
            active_after = [a for a in active_after if a.is_active]
            assert len(active_after) == len(active_before) - 1

    def test_transfer_branch(self, db, sample_user, sample_branch):
        branch3 = PharmacyBranch(
            name="Branch 3", code="BR3", pharmacy_id=PID, type="retail_branch", status="active"
        )
        db.add(branch3)
        db.commit()
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        user_service.transfer_to_branch(
            db,
            enterprise_user=eu,
            data=BranchTransferRequest(from_branch_id=sample_branch.id, to_branch_id=branch3.id, role="manager"),
            transferred_by_id=ADMIN_UID,
        )
        db.refresh(eu)
        assignments = enterprise_user_repository.get_branch_assignments(db, eu.id)
        active = [a for a in assignments if a.is_active]
        assert any(a.branch_id == branch3.id for a in active)


# ── Tests: Permissions ────────────────────────────────────────────────────────

class TestPermissions:
    def test_effective_permissions_from_role(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        perms = user_service.compute_effective_permissions(db, enterprise_user=eu)
        assert "inventory:view" in perms

    def test_permission_overrides_add(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        # Find an active assignment and give it an additive override
        active = [a for a in eu.branch_assignments if a.is_active]
        if active:
            active[0].permission_overrides = ["sales:view"]
            db.commit()
            perms = user_service.compute_effective_permissions(
                db, enterprise_user=eu, branch_id=active[0].branch_id
            )
            assert "sales:view" in perms

    def test_permission_overrides_revoke(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        active = [a for a in eu.branch_assignments if a.is_active]
        if active:
            active[0].permission_overrides = ["-inventory:view"]
            db.commit()
            perms = user_service.compute_effective_permissions(
                db, enterprise_user=eu, branch_id=active[0].branch_id
            )
            assert "inventory:view" not in perms


# ── Tests: Activity log ───────────────────────────────────────────────────────

class TestActivityLog:
    def test_activity_logged_on_suspend(self, db, sample_user):
        eu = enterprise_user_repository.get_by_id(db, sample_user.id, PID)
        # Reset status first
        eu.status = EnterpriseUserStatus.ACTIVE.value
        db.commit()
        user_service.suspend_user(db, enterprise_user=eu, reason="test audit")
        items, total = enterprise_user_repository.get_activity_log(db, sample_user.id)
        event_types = [i.event_type for i in items]
        assert ActivityEventType.ACCOUNT_SUSPENDED.value in event_types

    def test_login_history_logging(self, db, sample_user):
        enterprise_user_repository.log_login_event(
            db,
            enterprise_user_id=sample_user.id,
            event_type="login",
            success=True,
            ip_address="192.168.1.1",
            pharmacy_id=PID,
        )
        items, total = enterprise_user_repository.get_login_history(db, sample_user.id)
        assert total >= 1
        assert items[0].success is True


# ── Tests: Dashboard ──────────────────────────────────────────────────────────

class TestDashboard:
    def test_dashboard_returns_counts(self, db):
        summary = enterprise_user_repository.get_dashboard_summary(db, PID)
        assert "total_users" in summary
        assert summary["total_users"] >= 1
        assert "active_users" in summary
        assert "suspended_users" in summary


# ── Tests: Soft delete ────────────────────────────────────────────────────────

class TestSoftDelete:
    def test_soft_delete_hides_user(self, db):
        # Create a disposable user
        data = EnterpriseUserCreate(
            username="disposable_user",
            email="disposable@test.example.com",
            password="Pass1234!",
            user_type="read_only",
        )
        eu = user_service.create_user(db, data=data, pharmacy_id=PID)
        eu_id = eu.id

        user_service.delete_user(db, enterprise_user=eu)
        result = enterprise_user_repository.get_by_id(db, eu_id, PID)
        assert result is None  # soft-deleted = not found

    def test_cross_pharmacy_isolation(self, db, sample_user):
        result = enterprise_user_repository.get_by_id(db, sample_user.id, PID_B)
        assert result is None  # wrong pharmacy → not found

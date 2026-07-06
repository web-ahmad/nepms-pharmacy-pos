from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta

from models.hr import Department, Designation, Employee, Attendance, LeaveRequest, Shift, PayrollRun, PayrollLine
from schemas.hr import (
    DepartmentCreate, EmployeeCreate, EmployeeUpdate, AttendanceCreate, 
    LeaveRequestCreate, ShiftCreate, PayrollRunCreate
)

class HRRepository:
    def __init__(self, db: Session):
        self.db = db

    # Departments
    def get_departments(self, tenant_id: str):
        # Return departments with employee count
        depts = self.db.query(Department).filter(Department.tenant_id == tenant_id).all()
        result = []
        for d in depts:
            d_dict = {
                "id": d.id,
                "name": d.name,
                "description": d.description,
                "head_id": d.head_id,
                "is_active": d.is_active,
                "employee_count": len(d.employees)
            }
            result.append(d_dict)
        return result

    def get_department(self, tenant_id: str, dept_id: str):
        return self.db.query(Department).filter(Department.tenant_id == tenant_id, Department.id == dept_id).first()

    def create_department(self, tenant_id: str, obj_in: DepartmentCreate):
        db_obj = Department(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        # Needs to match Response model
        db_obj.employee_count = 0
        return db_obj

    def update_department(self, tenant_id: str, dept_id: str, obj_in):
        db_obj = self.get_department(tenant_id, dept_id)
        if not db_obj:
            return None
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
            
        self.db.commit()
        self.db.refresh(db_obj)
        db_obj.employee_count = len(db_obj.employees)
        return db_obj

    # Designations
    def get_designations(self, tenant_id: str):
        designations = self.db.query(Designation).filter(Designation.tenant_id == tenant_id).all()
        result = []
        for d in designations:
            result.append({
                "id": d.id,
                "name": d.name,
                "department_id": d.department_id,
                "description": d.description,
                "is_active": d.is_active,
                "employee_count": len(d.employees),
                "department_name": d.department.name if d.department else None
            })
        return result

    def get_designation(self, tenant_id: str, desig_id: str):
        return self.db.query(Designation).filter(Designation.tenant_id == tenant_id, Designation.id == desig_id).first()

    def create_designation(self, tenant_id: str, obj_in):
        db_obj = Designation(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        db_obj.employee_count = 0
        db_obj.department_name = db_obj.department.name if db_obj.department else None
        return db_obj

    def update_designation(self, tenant_id: str, desig_id: str, obj_in):
        db_obj = self.get_designation(tenant_id, desig_id)
        if not db_obj:
            return None
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
            
        self.db.commit()
        self.db.refresh(db_obj)
        db_obj.employee_count = len(db_obj.employees)
        db_obj.department_name = db_obj.department.name if db_obj.department else None
        return db_obj

    # Employees
    def get_employees(self, tenant_id: str):
        return self.db.query(Employee).filter(Employee.tenant_id == tenant_id).all()

    def get_employee(self, tenant_id: str, employee_id: str):
        return self.db.query(Employee).filter(Employee.tenant_id == tenant_id, Employee.id == employee_id).first()

    def create_employee(self, tenant_id: str, obj_in: EmployeeCreate):
        dump = obj_in.model_dump()
        if not dump.get('employee_id'):
            count = self.db.query(Employee).filter(Employee.tenant_id == tenant_id).count()
            dump['employee_id'] = f"EMP-{1001 + count}"
            
        db_obj = Employee(tenant_id=tenant_id, **dump)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_employee(self, tenant_id: str, employee_id: str, obj_in: EmployeeUpdate):
        db_obj = self.get_employee(tenant_id, employee_id)
        if not db_obj:
            return None
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
            
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete_employee(self, tenant_id: str, employee_id: str):
        db_obj = self.get_employee(tenant_id, employee_id)
        if not db_obj:
            return False
        
        db_obj.is_active = False
        self.db.commit()
        return True

    # Attendance
    def get_attendances(self, tenant_id: str, target_date: date = None):
        q = self.db.query(Attendance).filter(Attendance.tenant_id == tenant_id)
        if target_date:
            q = q.filter(Attendance.date == target_date)
        return q.all()

    def get_attendances_enriched(self, tenant_id: str, target_date: date = None):
        """Return attendance records with employee name, shift name, total_hours_worked."""
        q = self.db.query(Attendance).filter(Attendance.tenant_id == tenant_id)
        if target_date:
            q = q.filter(Attendance.date == target_date)
        records = q.order_by(Attendance.date.desc()).all()
        result = []
        for rec in records:
            emp = self.db.query(Employee).filter(Employee.id == rec.employee_id).first()
            shift = None
            if emp and emp.shift_id:
                shift = self.db.query(Shift).filter(Shift.id == emp.shift_id).first()
            total_hours = None
            if rec.clock_in and rec.clock_out:
                delta = rec.clock_out - rec.clock_in
                total_hours = round(delta.total_seconds() / 3600, 2)
            result.append({
                "id": rec.id,
                "employee_id": rec.employee_id,
                "date": rec.date,
                "clock_in": rec.clock_in,
                "clock_out": rec.clock_out,
                "status": rec.status,
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
                "shift_name": shift.name if shift else None,
                "total_hours_worked": total_hours,
            })
        return result

    def get_today_attendance(self, tenant_id: str, employee_id: str):
        today = date.today()
        return (
            self.db.query(Attendance)
            .filter(
                Attendance.tenant_id == tenant_id,
                Attendance.employee_id == employee_id,
                Attendance.date == today,
            )
            .first()
        )

    def clock_in(self, tenant_id: str, employee_id: str):
        """Create an attendance record with clock_in set to now.
        Determines 'Late' or 'Present' based on employee's shift.
        """
        emp = self.db.query(Employee).filter(
            Employee.tenant_id == tenant_id,
            Employee.id == employee_id
        ).first()
        if not emp:
            return None

        now = datetime.utcnow()
        today = now.date()
        status = "Present"

        if emp.shift_id:
            shift = self.db.query(Shift).filter(Shift.id == emp.shift_id).first()
            if shift:
                # Parse shift start_time "HH:MM" + grace_period minutes
                try:
                    sh, sm = [int(x) for x in shift.start_time.split(":")]
                    shift_start_dt = datetime(today.year, today.month, today.day, sh, sm)
                    grace_end_dt = shift_start_dt + timedelta(minutes=shift.grace_period or 0)
                    if now > grace_end_dt:
                        status = "Late"
                except Exception:
                    pass

        db_obj = Attendance(
            tenant_id=tenant_id,
            employee_id=employee_id,
            date=today,
            clock_in=now,
            status=status,
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def clock_out(self, tenant_id: str, attendance_id: str):
        """Set clock_out to now and calculate total hours."""
        rec = (
            self.db.query(Attendance)
            .filter(Attendance.tenant_id == tenant_id, Attendance.id == attendance_id)
            .first()
        )
        if not rec:
            return None
        rec.clock_out = datetime.utcnow()
        self.db.commit()
        self.db.refresh(rec)
        return rec

    def create_attendance(self, tenant_id: str, obj_in: AttendanceCreate):
        db_obj = Attendance(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_attendance(self, tenant_id: str, attendance_id: str, obj_in):
        """HR override: update times/status and recalculate total hours automatically."""
        rec = (
            self.db.query(Attendance)
            .filter(Attendance.tenant_id == tenant_id, Attendance.id == attendance_id)
            .first()
        )
        if not rec:
            return None

        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(rec, key, value)

        self.db.commit()
        self.db.refresh(rec)
        return rec

    def bulk_create_attendance(self, tenant_id: str, rows):
        """Process a list of BulkAttendanceRow dicts. Match by employee_id code (EMP-XXXX).
        Skips duplicates (same employee + date already exists).
        Returns (created, skipped, errors).
        """
        from schemas.hr import BulkAttendanceRow
        created = 0
        skipped = 0
        errors = []

        for row in rows:
            try:
                # Resolve employee by employee_id code
                emp = (
                    self.db.query(Employee)
                    .filter(
                        Employee.tenant_id == tenant_id,
                        Employee.employee_id == row.employee_id
                    )
                    .first()
                )
                if not emp:
                    errors.append(f"Row {row.employee_id} {row.date}: Employee not found")
                    continue

                # Duplicate check
                existing = (
                    self.db.query(Attendance)
                    .filter(
                        Attendance.tenant_id == tenant_id,
                        Attendance.employee_id == emp.id,
                        Attendance.date == row.date,
                    )
                    .first()
                )
                if existing:
                    skipped += 1
                    continue

                # Parse HH:MM strings into datetime
                clock_in_dt = None
                clock_out_dt = None
                if row.clock_in:
                    h, m = [int(x) for x in row.clock_in.split(":")]
                    clock_in_dt = datetime(row.date.year, row.date.month, row.date.day, h, m)
                if row.clock_out:
                    h, m = [int(x) for x in row.clock_out.split(":")]
                    clock_out_dt = datetime(row.date.year, row.date.month, row.date.day, h, m)

                # Determine status using shift logic
                status = "Present"
                if emp.shift_id and clock_in_dt:
                    shift = self.db.query(Shift).filter(Shift.id == emp.shift_id).first()
                    if shift:
                        try:
                            sh, sm = [int(x) for x in shift.start_time.split(":")]
                            shift_start = datetime(row.date.year, row.date.month, row.date.day, sh, sm)
                            grace_end = shift_start + timedelta(minutes=shift.grace_period or 0)
                            if clock_in_dt > grace_end:
                                status = "Late"
                        except Exception:
                            pass

                db_obj = Attendance(
                    tenant_id=tenant_id,
                    employee_id=emp.id,
                    date=row.date,
                    clock_in=clock_in_dt,
                    clock_out=clock_out_dt,
                    status=status,
                )
                self.db.add(db_obj)
                created += 1
            except Exception as ex:
                errors.append(f"Row {row.employee_id} {row.date}: {str(ex)}")

        self.db.commit()
        return created, skipped, errors

    def get_weekly_summary(self, tenant_id: str):
        """Return daily Present/Late/Absent counts for the last 7 days."""
        from datetime import timedelta
        today = date.today()
        result = []
        for i in range(6, -1, -1):  # 6 days ago … today
            day = today - timedelta(days=i)
            present = (
                self.db.query(Attendance)
                .filter(
                    Attendance.tenant_id == tenant_id,
                    Attendance.date == day,
                    Attendance.status == "Present",
                )
                .count()
            )
            late = (
                self.db.query(Attendance)
                .filter(
                    Attendance.tenant_id == tenant_id,
                    Attendance.date == day,
                    Attendance.status == "Late",
                )
                .count()
            )
            absent = (
                self.db.query(Attendance)
                .filter(
                    Attendance.tenant_id == tenant_id,
                    Attendance.date == day,
                    Attendance.status == "Absent",
                )
                .count()
            )
            result.append({
                "date": str(day),
                "label": day.strftime("%a"),
                "present": present,
                "late": late,
                "absent": absent,
            })
        return result

    # Leave Requests
    def get_leaves(self, tenant_id: str):
        return self.db.query(LeaveRequest).filter(LeaveRequest.tenant_id == tenant_id).all()

    def get_leave(self, tenant_id: str, leave_id: str):
        return self.db.query(LeaveRequest).filter(LeaveRequest.tenant_id == tenant_id, LeaveRequest.id == leave_id).first()

    def create_leave(self, tenant_id: str, obj_in: LeaveRequestCreate):
        db_obj = LeaveRequest(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_leave_status(self, db_obj: LeaveRequest, status: str, approved_by: str):
        db_obj.status = status
        db_obj.approved_by = approved_by
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Shifts
    def get_shifts(self, tenant_id: str):
        return self.db.query(Shift).filter(Shift.tenant_id == tenant_id).all()

    def get_shift(self, tenant_id: str, shift_id: str):
        return self.db.query(Shift).filter(Shift.tenant_id == tenant_id, Shift.id == shift_id).first()

    def create_shift(self, tenant_id: str, obj_in: ShiftCreate):
        db_obj = Shift(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_shift(self, tenant_id: str, shift_id: str, obj_in):
        db_obj = self.get_shift(tenant_id, shift_id)
        if not db_obj:
            return None
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
            
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Payroll
    def get_payroll_runs(self, tenant_id: str):
        return self.db.query(PayrollRun).filter(PayrollRun.tenant_id == tenant_id).all()

    def get_payroll_run(self, tenant_id: str, run_id: str):
        return self.db.query(PayrollRun).filter(PayrollRun.tenant_id == tenant_id, PayrollRun.id == run_id).first()

    def create_payroll_run(self, tenant_id: str, user_id: str, obj_in: PayrollRunCreate, employees: list):
        db_obj = PayrollRun(
            tenant_id=tenant_id,
            month=obj_in.month,
            year=obj_in.year,
            created_by=user_id
        )
        self.db.add(db_obj)
        self.db.flush()
        
        total_gross = 0.0
        total_net = 0.0
        
        for emp in employees:
            if not emp.is_active:
                continue
                
            base = emp.base_salary
            allowances = 0.0 # Placeholder for advanced logic
            deductions = 0.0 # Placeholder for advanced logic
            net = base + allowances - deductions
            
            line = PayrollLine(
                payroll_run_id=db_obj.id,
                employee_id=emp.id,
                base_salary=base,
                allowances=allowances,
                deductions=deductions,
                net_pay=net
            )
            self.db.add(line)
            total_gross += base + allowances
            total_net += net
            
        db_obj.total_gross = total_gross
        db_obj.total_deductions = total_gross - total_net
        db_obj.total_net = total_net
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Analytics
    def get_analytics(self, tenant_id: str):
        total_emp = self.db.query(Employee).filter(Employee.tenant_id == tenant_id).count()
        active_emp = self.db.query(Employee).filter(Employee.tenant_id == tenant_id, Employee.is_active == True).count()
        pending_leaves = self.db.query(LeaveRequest).filter(LeaveRequest.tenant_id == tenant_id, LeaveRequest.status == "Pending").count()
        
        # Simple attendance % approx
        total_att = self.db.query(Attendance).filter(Attendance.tenant_id == tenant_id).count()
        present_att = self.db.query(Attendance).filter(Attendance.tenant_id == tenant_id, Attendance.status == "Present").count()
        att_percent = (present_att / total_att * 100) if total_att > 0 else 0.0
        
        # Payroll Cost
        res = self.db.query(func.sum(Employee.base_salary)).filter(Employee.tenant_id == tenant_id, Employee.is_active == True).scalar()
        monthly_cost = res or 0.0
        
        return {
            "total_employees": total_emp,
            "active_employees": active_emp,
            "attendance_percent": round(att_percent, 2),
            "pending_leaves": pending_leaves,
            "monthly_payroll_cost": monthly_cost
        }

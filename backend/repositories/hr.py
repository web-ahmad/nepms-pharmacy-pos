from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta

from models.hr import (
    Department, Designation, Employee, Attendance, LeaveRequest, Shift, 
    PayrollRun, PayrollLine, AdvanceSalary, EmployeeDocument, 
    PerformanceReview, EmployeeTask, TrainingProgram, TrainingAttendance
)
from schemas.hr import (
    DepartmentCreate, EmployeeCreate, EmployeeUpdate, AttendanceCreate, 
    LeaveRequestCreate, ShiftCreate, PayrollRunCreate, AdvanceSalaryCreate
)

class HRRepository:
    def __init__(self, db: Session):
        self.db = db

    # Departments
    def get_departments(self, tenant_id: str, branch_id: str = None):
        # Return departments with employee count
        q = self.db.query(Department).filter(Department.tenant_id == tenant_id)
        if branch_id:
            q = q.filter(Department.branch_id == branch_id)
        depts = q.all()
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

    def create_department(self, tenant_id: str, obj_in: DepartmentCreate, branch_id: str = None):
        dump = obj_in.model_dump()
        if branch_id:
            dump['branch_id'] = branch_id
        db_obj = Department(tenant_id=tenant_id, **dump)
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

    def delete_department(self, tenant_id: str, dept_id: str):
        db_obj = self.db.query(Department).filter(
            Department.tenant_id == tenant_id,
            Department.id == dept_id
        ).first()
        if not db_obj:
            return False
            
        self.db.delete(db_obj)
        self.db.commit()
        return True

    # Designations
    def get_designations(self, tenant_id: str, branch_id: str = None):
        q = self.db.query(Designation).filter(Designation.tenant_id == tenant_id)
        if branch_id:
            q = q.filter(Designation.branch_id == branch_id)
        designations = q.all()
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

    def create_designation(self, tenant_id: str, obj_in, branch_id: str = None):
        dump = obj_in.model_dump()
        if branch_id:
            dump['branch_id'] = branch_id
        db_obj = Designation(tenant_id=tenant_id, **dump)
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
    def get_employees(self, tenant_id: str, branch_id: str = None):
        from sqlalchemy.orm import joinedload
        q = self.db.query(Employee).options(joinedload(Employee.department)).filter(Employee.tenant_id == tenant_id)
        if branch_id:
            q = q.filter(Employee.branch_id == branch_id)
        return q.all()

    def get_employee(self, tenant_id: str, employee_id: str):
        return self.db.query(Employee).filter(Employee.tenant_id == tenant_id, Employee.id == employee_id).first()

    def create_employee(self, tenant_id: str, obj_in: EmployeeCreate, branch_id: str = None):
        dump = obj_in.model_dump()
        dump.pop('system_access', None)
        dump.pop('password', None)
        dump.pop('role_id', None)
        
        if not dump.get('employee_id'):
            count = self.db.query(Employee).filter(Employee.tenant_id == tenant_id).count()
            dump['employee_id'] = f"EMP-{1001 + count}"
            
        if branch_id is not None:
            dump['branch_id'] = branch_id
            
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

    def get_attendances_enriched(
        self, tenant_id: str, target_date: date = None,
        employee_id: str = None, month: int = None, year: int = None,
        branch_id: str = None
    ):
        """Return attendance records with employee name, shift name, total_hours_worked."""
        q = self.db.query(Attendance).filter(Attendance.tenant_id == tenant_id)
        if branch_id:
            q = q.join(Employee).filter(Employee.branch_id == branch_id)
        if employee_id:
            q = q.filter(Attendance.employee_id == employee_id)
        if month and year:
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1)
            else:
                end_date = date(year, month + 1, 1)
            q = q.filter(Attendance.date >= start_date, Attendance.date < end_date)
        elif target_date:
            q = q.filter(Attendance.date == target_date)
        records = q.order_by(Attendance.date.desc()).all()
        result = []
        for rec in records:
            emp = self.db.query(Employee).filter(Employee.id == rec.employee_id).first()
            shift = None
            if emp and emp.shift_id:
                shift = self.db.query(Shift).filter(Shift.id == emp.shift_id).first()
            
            worked_hours = None
            break_time = None
            overtime = None

            if rec.clock_in and rec.clock_out:
                delta = rec.clock_out - rec.clock_in
                gross_hours = delta.total_seconds() / 3600

                emp_break_mins = emp.standard_break_time if emp and emp.standard_break_time is not None else 60
                break_time = round(emp_break_mins / 60, 2)

                worked_hours = gross_hours - break_time
                if worked_hours < 0:
                    worked_hours = 0
                worked_hours = round(worked_hours, 2)

                if hasattr(rec, 'overtime_minutes') and rec.overtime_minutes and rec.overtime_minutes > 0:
                    overtime = round(rec.overtime_minutes / 60, 2)

            approved_leave = self.db.query(LeaveRequest).filter(
                LeaveRequest.tenant_id == tenant_id,
                LeaveRequest.employee_id == rec.employee_id,
                LeaveRequest.status == "Approved",
                LeaveRequest.start_date <= rec.date,
                LeaveRequest.end_date >= rec.date
            ).first()

            if approved_leave:
                final_status = "Leave"
                final_clock_in = None
                final_clock_out = None
                worked_hours = 0.0
                leave_type = approved_leave.leave_type
            else:
                final_status = rec.status
                final_clock_in = rec.clock_in
                final_clock_out = rec.clock_out
                leave_type = None

            result.append({
                "id": rec.id,
                "employee_id": rec.employee_id,
                "date": rec.date,
                "clock_in": final_clock_in,
                "clock_out": final_clock_out,
                "status": final_status,
                "leave_type": leave_type,
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
                "shift_name": shift.name if shift else None,
                "total_hours_worked": worked_hours,
                "break_time": break_time if not approved_leave else 0,
                "overtime": overtime if not approved_leave else 0,
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

        now = datetime.now()
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

        # Calculate overtime/undertime
        if rec.clock_in and rec.clock_out:
            self._recalculate_ot(rec)

        self.db.commit()
        self.db.refresh(rec)
        return rec

    def _recalculate_ot(self, rec: Attendance):
        rec.overtime_minutes = 0
        rec.undertime_minutes = 0
        if not rec.clock_in or not rec.clock_out:
            return

        emp = self.db.query(Employee).filter(Employee.id == rec.employee_id).first()
        if not emp: return

        break_time = emp.standard_break_time if emp.standard_break_time is not None else 60

        standard_minutes = 480 # Default 8 hours
        if emp.shift_id:
            shift = self.db.query(Shift).filter(Shift.id == emp.shift_id).first()
            if shift and shift.start_time and shift.end_time:
                try:
                    sh, sm = map(int, shift.start_time.split(":"))
                    eh, em = map(int, shift.end_time.split(":"))
                    from datetime import timedelta
                    shift_start = datetime(2000, 1, 1, sh, sm)
                    shift_end = datetime(2000, 1, 1, eh, em)
                    if shift_end < shift_start:
                        shift_end += timedelta(days=1)
                    
                    gross_shift_minutes = int((shift_end - shift_start).total_seconds() / 60)
                    if gross_shift_minutes > break_time:
                        standard_minutes = gross_shift_minutes - break_time
                    else:
                        standard_minutes = gross_shift_minutes
                except Exception:
                    pass

        worked_minutes = int((rec.clock_out - rec.clock_in).total_seconds() / 60)
        
        # Don't subtract break if they worked very little
        if worked_minutes > break_time:
            worked_minutes -= break_time

        if worked_minutes > standard_minutes:
            rec.overtime_minutes = worked_minutes - standard_minutes
        elif worked_minutes < standard_minutes:
            # Add grace period for undertime? The requirement says "beyond Grace Period"
            grace = shift.grace_period if emp.shift_id and shift else 15
            if (standard_minutes - worked_minutes) > grace:
                rec.undertime_minutes = standard_minutes - worked_minutes

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
            # if frontend sends timezone-aware datetime, convert to naive utc
            if isinstance(value, datetime) and value.tzinfo is not None:
                value = value.replace(tzinfo=None)
            setattr(rec, key, value)
            
        self._recalculate_ot(rec)

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
                # Resolve employee by employee_id code or UUID
                emp = None
                if row.employee_id:
                    emp = self.db.query(Employee).filter(
                        Employee.tenant_id == tenant_id,
                        Employee.employee_id == row.employee_id
                    ).first()
                elif row.employeeId:
                    emp = self.db.query(Employee).filter(
                        Employee.tenant_id == tenant_id,
                        Employee.id == row.employeeId
                    ).first()

                if not emp:
                    identifier = row.employee_id or row.employeeId or "Unknown"
                    errors.append(f"Row {identifier} {row.date}: Employee not found")
                    continue

                # Parse HH:MM strings into datetime
                clock_in_str = row.checkInAt or row.clock_in
                clock_out_str = row.checkOutAt or row.clock_out

                clock_in_dt = None
                clock_out_dt = None
                if clock_in_str:
                    h, m = [int(x) for x in clock_in_str.split(":")]
                    clock_in_dt = datetime(row.date.year, row.date.month, row.date.day, h, m)
                if clock_out_str:
                    h, m = [int(x) for x in clock_out_str.split(":")]
                    clock_out_dt = datetime(row.date.year, row.date.month, row.date.day, h, m)

                # Determine status using shift logic if not provided explicitly by payload
                status = row.status or "Present"
                if not row.status:
                    day_name = row.date.strftime("%A")
                    is_holiday = self.db.query(Holiday).filter(Holiday.tenant_id == tenant_id, Holiday.date == row.date).first()
                    
                    if is_holiday:
                        status = "Holiday"
                    elif emp.weekend_days and day_name in emp.weekend_days:
                        status = "Weekend"
                    elif emp.shift_id and clock_in_dt:
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

                # Duplicate check / Upsert
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
                    # Update existing
                    existing.clock_in = clock_in_dt
                    existing.clock_out = clock_out_dt
                    existing.status = status
                    created += 1
                else:
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
        return {"created": created, "skipped": skipped, "errors": errors}

    def delete_monthly_attendance_batch(self, tenant_id: str, employee_id: str, month: int, year: int):
        import calendar
        from datetime import date
        
        _, last_day = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        deleted_count = self.db.query(Attendance).filter(
            Attendance.tenant_id == tenant_id,
            Attendance.employee_id == employee_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).delete(synchronize_session=False)
        self.db.commit()
        return {"deleted_count": deleted_count}

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
        leaves = self.db.query(LeaveRequest).filter(LeaveRequest.tenant_id == tenant_id).order_by(LeaveRequest.created_at.desc()).all()
        result = []
        for leave in leaves:
            emp = self.db.query(Employee).filter(Employee.id == leave.employee_id).first()
            if emp:
                leave.employee_name = f"{emp.first_name} {emp.last_name}"
            else:
                leave.employee_name = "Unknown"
            result.append(leave)
        return result

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
    def get_shifts(self, tenant_id: str, branch_id: str = None):
        q = self.db.query(Shift).filter(Shift.tenant_id == tenant_id)
        if branch_id:
            q = q.filter(Shift.branch_id == branch_id)
        return q.all()

    def get_shift(self, tenant_id: str, shift_id: str):
        return self.db.query(Shift).filter(Shift.tenant_id == tenant_id, Shift.id == shift_id).first()

    def create_shift(self, tenant_id: str, obj_in: ShiftCreate, branch_id: str = None):
        dump = obj_in.model_dump()
        if branch_id:
            dump['branch_id'] = branch_id
        db_obj = Shift(tenant_id=tenant_id, **dump)
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
        from sqlalchemy.orm import joinedload
        run = self.db.query(PayrollRun).options(
            joinedload(PayrollRun.lines).joinedload(PayrollLine.employee).joinedload(Employee.department)
        ).filter(PayrollRun.tenant_id == tenant_id, PayrollRun.id == run_id).first()
        
        if run:
            for line in run.lines:
                # Map department
                setattr(line, "department_name", line.employee.department.name if line.employee and line.employee.department else "Unassigned")
                
                # Map OT/UT
                ot_h = 0.0
                ut_h = 0.0
                if line.deductions_breakdown:
                    ot_h = line.deductions_breakdown.get("ot_hours", 0.0)
                    ut_h = line.deductions_breakdown.get("ut_hours", 0.0)
                setattr(line, "total_ot_hours", ot_h)
                setattr(line, "total_ut_hours", ut_h)
                
        return run

    def calculate_payroll_lines(self, tenant_id: str, month: int, year: int, department_id: str = None):
        """
        Optimized payroll calculation engine.
        - 3 bulk DB queries instead of N+1 per employee
        - Zero-attendance → Zero-pay (strict deduction formula)
        - Per-employee try/except: one bad record never crashes the batch
        """
        import calendar
        import logging
        logger = logging.getLogger(__name__)

        days_in_month = max(calendar.monthrange(year, month)[1], 1)  # Never 0
        start_date = date(year, month, 1)
        end_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)

        # ── BULK FETCH 1: Employees ─────────────────────────────────────────
        emp_query = self.db.query(Employee).filter(
            Employee.tenant_id == tenant_id,
            Employee.is_active == True
        )
        if department_id and department_id != "all":
            emp_query = emp_query.filter(Employee.department_id == department_id)
        employees = emp_query.all()

        if not employees:
            return []

        emp_ids = [e.id for e in employees]

        # ── BULK FETCH 2: All attendance records for the month ─────────────
        att_records = self.db.query(Attendance).filter(
            Attendance.tenant_id == tenant_id,
            Attendance.employee_id.in_(emp_ids),
            Attendance.date >= start_date,
            Attendance.date < end_date
        ).all()

        # Group attendance by employee_id in-memory
        att_by_emp: dict[str, list] = {eid: [] for eid in emp_ids}
        for rec in att_records:
            if rec.employee_id in att_by_emp:
                att_by_emp[rec.employee_id].append(rec)

        # ── BULK FETCH 3: Approved leaves for the month ────────────────────
        leave_records = self.db.query(LeaveRequest).filter(
            LeaveRequest.tenant_id == tenant_id,
            LeaveRequest.employee_id.in_(emp_ids),
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date < end_date,
            LeaveRequest.end_date >= start_date
        ).all()

        # Group leaves by employee_id in-memory
        leaves_by_emp: dict[str, list] = {eid: [] for eid in emp_ids}
        for lv in leave_records:
            if lv.employee_id in leaves_by_emp:
                leaves_by_emp[lv.employee_id].append(lv)

        shift_ids = list({e.shift_id for e in employees if e.shift_id})
        shifts_by_id: dict[str, Shift] = {}
        if shift_ids:
            shift_objs = self.db.query(Shift).filter(Shift.id.in_(shift_ids)).all()
            shifts_by_id = {s.id: s for s in shift_objs}

        # ── BULK FETCH 5: Advance Salaries for the month ──────────────────
        target_month_str = f"{month:02d}-{year}"
        advance_records = self.db.query(AdvanceSalary).filter(
            AdvanceSalary.tenant_id == tenant_id,
            AdvanceSalary.employee_id.in_(emp_ids),
            AdvanceSalary.deduction_month == target_month_str,
            AdvanceSalary.status == "Paid"
        ).all()
        advances_by_emp: dict[str, float] = {eid: 0.0 for eid in emp_ids}
        for adv in advance_records:
            advances_by_emp[adv.employee_id] += float(adv.amount or 0.0)

        # ── BULK FETCH 6: Payroll Settings ──────────────────────────────────────
        from models.hr import PayrollSetting
        settings_records = self.db.query(PayrollSetting).filter(
            PayrollSetting.tenant_id == tenant_id,
            PayrollSetting.employee_id.in_(emp_ids)
        ).all()
        settings_by_emp = {s.employee_id: s for s in settings_records}

        # ── CALCULATE PER EMPLOYEE ─────────────────────────────────────────
        lines = []
        for emp in employees:
            try:
                base = float(emp.base_salary or 0.0)
                if base <= 0:
                    logger.info(f"PAYROLL SKIP: {emp.first_name} {emp.last_name} - No salary set.")
                    continue

                salary_type = (emp.salary_type or "Monthly").strip()
                emp_att = att_by_emp.get(emp.id, [])
                emp_leaves = leaves_by_emp.get(emp.id, [])
                shift = shifts_by_id.get(emp.shift_id) if emp.shift_id else None

                # Count days from attendance records
                present_days = 0
                penalty_days = 0
                total_worked_hours = 0.0
                total_overtime = 0.0
                total_undertime = 0.0
                
                setting = settings_by_emp.get(emp.id)
                grace_period = setting.grace_period_mins if setting else 15

                # Build a set of approved leave dates for quick lookup
                leave_date_set: set[date] = set()
                for lv in emp_leaves:
                    if lv.leave_type != "Unpaid": # Only protect paid leaves
                        cur = lv.start_date
                        while cur <= lv.end_date:
                            leave_date_set.add(cur)
                            cur += timedelta(days=1)

                for rec in emp_att:
                    # Determine effective status
                    if rec.date in leave_date_set:
                        # Paid leave counts as a "paid day" — no deduction
                        # We continue past penalty check
                        pass
                    elif rec.status == "Absent" or rec.status == "Unpaid Leave":
                        penalty_days += 1

                    if rec.status in ("Present", "Late", "Half Day"):
                        present_days += 1

                    # Worked hours calculation
                    if rec.clock_in and rec.clock_out:
                        delta = rec.clock_out - rec.clock_in
                        gross_hours = delta.total_seconds() / 3600
                        break_hours = float(emp.standard_break_time or 60) / 60
                        worked_h = max(gross_hours - break_hours, 0.0)
                        total_worked_hours += worked_h

                        # Overtime & Undertime (Persisted DB Values)
                        if hasattr(rec, 'overtime_minutes') and rec.overtime_minutes:
                            total_overtime += rec.overtime_minutes / 60.0
                        if hasattr(rec, 'undertime_minutes') and rec.undertime_minutes:
                            total_undertime += rec.undertime_minutes / 60.0

                # ── STRICT DEDUCTION FORMULA ───────────────────────────────
                # Only deduct for explicit penalty statuses (Absent, Unpaid Leave)
                allowances = 0.0
                deductions = 0.0
                net = 0.0
                worked_units = ""

                if salary_type == "Hourly":
                    net = round(total_worked_hours * base, 2)
                    deductions = 0.0
                    allowances = 0.0
                    worked_units = f"{round(total_worked_hours, 2)} hrs"
                else:  # Monthly
                    per_day = base / days_in_month
                    deductions = round(penalty_days * per_day, 2)

                    # Settings applied to OT/UT/Bonus
                    hourly_equiv = base / (days_in_month * 8)
                    if setting:
                        if setting.ot_type == "PERCENTAGE":
                            allowances += round(total_overtime * hourly_equiv * (setting.ot_rate / 100.0), 2)
                        else:
                            allowances += round(total_overtime * setting.ot_rate, 2)
                            
                        if setting.ut_type == "PERCENTAGE":
                            deductions += round(total_undertime * hourly_equiv * (setting.ut_rate / 100.0), 2)
                        else:
                            deductions += round(total_undertime * setting.ut_rate, 2)
                            
                        allowances += float(setting.bonus_amount or 0.0)
                    else:
                        allowances += 0.0 # Default if no setting

                    worked_units = f"{present_days} / {days_in_month} days"

                # Add advance deductions
                emp_advance_deduction = advances_by_emp.get(emp.id, 0.0)
                absent_deductions = deductions
                deductions += emp_advance_deduction

                net = round(max(base - deductions + allowances, 0.0), 2)

                lines.append({
                    "id": f"preview-{emp.id}",
                    "employee_id": emp.id,
                    "employee_name": f"{emp.first_name} {emp.last_name}",
                    "department_name": emp.department.name if emp.department else "Unassigned",
                    "base_salary": round(base, 2),
                    "worked_units": worked_units,
                    "ot_hours": round(total_overtime, 2),
                    "ut_hours": round(total_undertime, 2),
                    "total_ot_hours": round(total_overtime, 2),
                    "total_ut_hours": round(total_undertime, 2),
                    "allowances": allowances,
                    "deductions": deductions,
                    "deductions_breakdown": {
                        "absent_amount": round(absent_deductions, 2),
                        "advance_recovery": round(emp_advance_deduction, 2),
                        "ot_hours": round(total_overtime, 2),
                        "ut_hours": round(total_undertime, 2)
                    },
                    "net_pay": net,
                })

            except Exception as e:
                # Isolated failure — log and continue with next employee
                logger.error(
                    f"PAYROLL ERROR for employee {emp.id} "
                    f"({emp.first_name} {emp.last_name}): {e}",
                    exc_info=True
                )
                continue

        return lines


    def create_payroll_run(self, tenant_id: str, user_id: str, obj_in: PayrollRunCreate, employees: list):
        db_obj = PayrollRun(
            tenant_id=tenant_id,
            month=obj_in.month,
            year=obj_in.year,
            created_by=user_id
        )
        self.db.add(db_obj)
        self.db.flush()
        
        calculated_lines = self.calculate_payroll_lines(tenant_id, obj_in.month, obj_in.year, obj_in.department_id)
        
        total_gross = 0.0
        total_net = 0.0
        
        for cl in calculated_lines:
            line = PayrollLine(
                payroll_run_id=db_obj.id,
                employee_id=cl["employee_id"],
                base_salary=cl["base_salary"],
                worked_units=cl["worked_units"],
                allowances=cl["allowances"],
                deductions=cl["deductions"],
                deductions_breakdown=cl.get("deductions_breakdown"),
                net_pay=cl["net_pay"]
            )
            self.db.add(line)
            total_gross += cl["base_salary"] + cl["allowances"]
            total_net += cl["net_pay"]
            
        db_obj.total_gross = total_gross
        db_obj.total_deductions = total_gross - total_net
        db_obj.total_net = total_net
        
        self.db.flush()
        return db_obj

    def finalize_payroll_run(self, tenant_id: str, run_id: str):
        db_obj = self.db.query(PayrollRun).filter(PayrollRun.tenant_id == tenant_id, PayrollRun.id == run_id).first()
        if not db_obj:
            raise Exception("Payroll run not found")
        db_obj.status = "Paid"
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def get_payroll_summary(self, tenant_id: str):
        import datetime
        now = datetime.datetime.now()
        
        runs_this_month = self.db.query(PayrollRun).filter(
            PayrollRun.tenant_id == tenant_id, 
            PayrollRun.month == now.month, 
            PayrollRun.year == now.year
        ).all()
        
        total_cost = sum(r.total_net for r in runs_this_month)
        
        pending_payouts = self.db.query(PayrollRun).filter(
            PayrollRun.tenant_id == tenant_id,
            PayrollRun.status == "Draft"
        ).count()
        
        # Overtime Burden = Sum of allowances (assuming allowances are mostly overtime)
        overtime_burden = 0.0
        for run in runs_this_month:
            for line in run.lines:
                overtime_burden += line.allowances
                
        return {
            "total_payroll_cost": total_cost,
            "pending_payouts": pending_payouts,
            "overtime_burden": overtime_burden
        }

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
        monthly_payroll_cost = res or 0.0
        
        return {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "attendance_percent": round(attendance_percent, 2),
            "pending_leaves": pending_leaves,
            "monthly_payroll_cost": monthly_payroll_cost
        }

    # Advance Salary
    def get_advances(self, tenant_id: str):
        advances = self.db.query(AdvanceSalary).filter(AdvanceSalary.tenant_id == tenant_id).order_by(AdvanceSalary.created_at.desc()).all()
        # manual join of employee_name
        for adv in advances:
            adv.employee_name = f"{adv.employee.first_name} {adv.employee.last_name}" if adv.employee else None
        return advances

    def get_advance(self, tenant_id: str, advance_id: str):
        return self.db.query(AdvanceSalary).filter(
            AdvanceSalary.tenant_id == tenant_id,
            AdvanceSalary.id == advance_id
        ).first()

    def create_advance(self, tenant_id: str, obj_in: AdvanceSalaryCreate):
        db_obj = AdvanceSalary(
            tenant_id=tenant_id,
            employee_id=obj_in.employee_id,
            amount=obj_in.amount,
            request_date=obj_in.request_date,
            deduction_month=obj_in.deduction_month,
            reason=obj_in.reason,
            status="Pending"
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # =====================================================================
    # Enterprise Phase 10: Missing Repository Methods
    # =====================================================================

    # Employee Documents
    def get_employee_documents(self, tenant_id: str, employee_id: str = None):
        q = self.db.query(EmployeeDocument).filter(EmployeeDocument.tenant_id == tenant_id)
        if employee_id:
            q = q.filter(EmployeeDocument.employee_id == employee_id)
        return q.all()

    def create_employee_document(self, tenant_id: str, user_id: str, obj_in):
        db_obj = EmployeeDocument(tenant_id=tenant_id, uploaded_by=user_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_employee_document(self, tenant_id: str, doc_id: str, obj_in):
        db_obj = self.db.query(EmployeeDocument).filter(EmployeeDocument.tenant_id == tenant_id, EmployeeDocument.id == doc_id).first()
        if not db_obj:
            return None
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete_employee_document(self, tenant_id: str, doc_id: str):
        db_obj = self.db.query(EmployeeDocument).filter(EmployeeDocument.tenant_id == tenant_id, EmployeeDocument.id == doc_id).first()
        if not db_obj:
            return False
        self.db.delete(db_obj)
        self.db.commit()
        return True

    # Performance Reviews
    def get_performance_reviews(self, tenant_id: str, employee_id: str = None):
        q = self.db.query(PerformanceReview).filter(PerformanceReview.tenant_id == tenant_id)
        if employee_id:
            q = q.filter(PerformanceReview.employee_id == employee_id)
        return q.all()

    def create_performance_review(self, tenant_id: str, obj_in):
        db_obj = PerformanceReview(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_performance_review(self, tenant_id: str, review_id: str, obj_in):
        db_obj = self.db.query(PerformanceReview).filter(PerformanceReview.tenant_id == tenant_id, PerformanceReview.id == review_id).first()
        if not db_obj:
            return None
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    # Employee Tasks
    def get_employee_tasks(self, tenant_id: str, employee_id: str = None):
        q = self.db.query(EmployeeTask).filter(EmployeeTask.tenant_id == tenant_id)
        if employee_id:
            q = q.filter(EmployeeTask.employee_id == employee_id)
        return q.all()

    def create_employee_task(self, tenant_id: str, user_id: str, obj_in):
        db_obj = EmployeeTask(tenant_id=tenant_id, assigned_by=user_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_employee_task(self, tenant_id: str, task_id: str, obj_in):
        db_obj = self.db.query(EmployeeTask).filter(EmployeeTask.tenant_id == tenant_id, EmployeeTask.id == task_id).first()
        if not db_obj:
            return None
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete_employee_task(self, tenant_id: str, task_id: str):
        db_obj = self.db.query(EmployeeTask).filter(EmployeeTask.tenant_id == tenant_id, EmployeeTask.id == task_id).first()
        if not db_obj:
            return False
        self.db.delete(db_obj)
        self.db.commit()
        return True

    # Training Programs
    def get_training_programs(self, tenant_id: str):
        return self.db.query(TrainingProgram).filter(TrainingProgram.tenant_id == tenant_id).all()

    def create_training_program(self, tenant_id: str, obj_in):
        db_obj = TrainingProgram(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_training_program(self, tenant_id: str, program_id: str, obj_in):
        db_obj = self.db.query(TrainingProgram).filter(TrainingProgram.tenant_id == tenant_id, TrainingProgram.id == program_id).first()
        if not db_obj:
            return None
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete_training_program(self, tenant_id: str, program_id: str):
        db_obj = self.db.query(TrainingProgram).filter(TrainingProgram.tenant_id == tenant_id, TrainingProgram.id == program_id).first()
        if not db_obj:
            return False
        self.db.delete(db_obj)
        self.db.commit()
        return True

    # Training Attendance
    def get_training_attendances(self, tenant_id: str, program_id: str):
        return self.db.query(TrainingAttendance).filter(TrainingAttendance.tenant_id == tenant_id, TrainingAttendance.program_id == program_id).all()

    def create_training_attendance(self, tenant_id: str, obj_in):
        db_obj = TrainingAttendance(tenant_id=tenant_id, **obj_in.model_dump())
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update_training_attendance(self, tenant_id: str, att_id: str, obj_in):
        db_obj = self.db.query(TrainingAttendance).filter(TrainingAttendance.tenant_id == tenant_id, TrainingAttendance.id == att_id).first()
        if not db_obj:
            return None
        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_obj, key, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete_training_attendance(self, tenant_id: str, att_id: str):
        db_obj = self.db.query(TrainingAttendance).filter(TrainingAttendance.tenant_id == tenant_id, TrainingAttendance.id == att_id).first()
        if not db_obj:
            return False
        self.db.delete(db_obj)
        self.db.commit()
        return True

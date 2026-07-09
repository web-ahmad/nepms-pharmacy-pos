from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.hr import PayrollSetting, Employee
from schemas.hr import PayrollSettingCreate, PayrollSettingUpdate, PayrollSettingResponse
from core.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[PayrollSettingResponse])
def get_payroll_settings(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id
    settings = db.query(PayrollSetting).filter(PayrollSetting.tenant_id == tenant_id).all()
    
    # We also need employee_name for UI
    employees = {e.id: f"{e.first_name} {e.last_name}" for e in db.query(Employee).filter(Employee.tenant_id == tenant_id).all()}
    
    result = []
    for s in settings:
        s.employee_name = employees.get(s.employee_id, "Unknown Employee")
        result.append(s)
        
    return result

@router.post("", response_model=PayrollSettingResponse)
def create_payroll_setting(
    obj_in: PayrollSettingCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id
    
    existing = db.query(PayrollSetting).filter(PayrollSetting.employee_id == obj_in.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payroll setting already exists for this employee")
        
    emp = db.query(Employee).filter(Employee.id == obj_in.employee_id, Employee.tenant_id == tenant_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    setting = PayrollSetting(
        tenant_id=tenant_id,
        **obj_in.dict()
    )
    db.add(setting)
    db.commit()
    db.refresh(setting)
    setting.employee_name = f"{emp.first_name} {emp.last_name}"
    return setting

@router.put("/{setting_id}", response_model=PayrollSettingResponse)
def update_payroll_setting(
    setting_id: str,
    obj_in: PayrollSettingUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id
    
    setting = db.query(PayrollSetting).filter(PayrollSetting.id == setting_id, PayrollSetting.tenant_id == tenant_id).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Payroll setting not found")
        
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setting, field, value)
        
    db.commit()
    db.refresh(setting)
    
    emp = db.query(Employee).filter(Employee.id == setting.employee_id).first()
    setting.employee_name = f"{emp.first_name} {emp.last_name}" if emp else "Unknown Employee"
    
    return setting

@router.delete("/{setting_id}")
def delete_payroll_setting(
    setting_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id
    
    setting = db.query(PayrollSetting).filter(PayrollSetting.id == setting_id, PayrollSetting.tenant_id == tenant_id).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Payroll setting not found")
        
    db.delete(setting)
    db.commit()
    return {"message": "Payroll setting deleted successfully"}

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import uuid
from database import get_db
from dependencies.auth import get_current_user
from schemas.expenses import ExpenseVoucherCreate, ExpenseVoucherResponse
from services.expense_service import ExpenseService
from models.users import User

router = APIRouter(tags=["Expenses"])

UPLOAD_DIR = "uploads/expenses"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=List[ExpenseVoucherResponse])
@router.get("/", response_model=List[ExpenseVoucherResponse])
def get_expenses(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    svc = ExpenseService(db)
    return svc.get_expenses(current_user.tenant_id, start_date, end_date, category_id)

@router.get("/{id}", response_model=ExpenseVoucherResponse)
def get_expense(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    svc = ExpenseService(db)
    voucher = svc.get_expense(current_user.tenant_id, id)
    if not voucher:
        raise HTTPException(status_code=404, detail="Expense not found")
    return voucher

@router.post("", response_model=ExpenseVoucherResponse)
@router.post("/", response_model=ExpenseVoucherResponse)
def create_expense(
    amount: float = Form(...),
    category_id: str = Form(...),
    payment_method: str = Form("Cash"),
    payee: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    svc = ExpenseService(db)
    
    attachment_url = None
    if file:
        ext = file.filename.split('.')[-1] if '.' in file.filename else ''
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        attachment_url = f"/uploads/expenses/{filename}"

    data = ExpenseVoucherCreate(
        amount=amount,
        category_id=category_id,
        payment_method=payment_method,
        payee=payee,
        description=description,
        date=None # Using default now
    )
    
    return svc.create_expense(current_user.tenant_id, current_user.id, data, attachment_url)

@router.post("/petty-cash", response_model=ExpenseVoucherResponse)
def create_petty_cash(
    amount: float = Form(...),
    petty_cash_category_id: str = Form(...),
    payee: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    date: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    svc = ExpenseService(db)
    
    attachment_url = None
    if file:
        ext = file.filename.split('.')[-1] if '.' in file.filename else ''
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        attachment_url = f"/uploads/expenses/{filename}"

    from datetime import datetime
    parsed_date = datetime.utcnow()
    if date:
        try:
            parsed_date = datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            parsed_date = datetime.utcnow()

    data = ExpenseVoucherCreate(
        amount=amount,
        petty_cash_category_id=petty_cash_category_id,
        category_id=None, # Will be set in service
        payment_method="Cash",
        payee=payee,
        description=description,
        date=parsed_date
    )
    
    return svc.create_petty_cash(current_user.tenant_id, current_user.id, data, attachment_url)

@router.post("/{id}/void")
def void_expense(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    svc = ExpenseService(db)
    success = svc.void_expense(current_user.tenant_id, current_user.id, id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not void expense")
    return {"message": "Expense voided successfully"}

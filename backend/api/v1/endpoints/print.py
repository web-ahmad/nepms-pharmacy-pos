from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from core.deps import get_db, get_current_user
from models.users import User
from services.printer_service import PrinterService
from services.settings_service import SettingsService

router = APIRouter()

@router.post("/receipt")
def print_receipt(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Expects a payload with "receipt_data"
    """
    receipt_data = payload.get("receipt_data")
    if not receipt_data:
        raise HTTPException(status_code=400, detail="receipt_data is required")
        
    settings = SettingsService(db).get_invoice_settings(current_user.tenant_id)
    
    # Convert settings ORM object to dict
    settings_dict = {
        "show_currency_symbol": settings.show_currency_symbol,
        "show_received_amount": settings.show_received_amount,
        "show_change_amount": settings.show_change_amount,
        "show_footer_text": settings.show_footer_text,
        "show_logo": settings.show_logo,
        "show_adjustments": settings.show_adjustments,
        "footer_text": settings.footer_text,
        "urdu_policy_text": settings.urdu_policy_text,
        "print_mode": settings.print_mode,
        "paper_size": settings.paper_size,
        "printer_interface": settings.printer_interface,
        "printer_ip": settings.printer_ip,
        "printer_usb_vendor": settings.printer_usb_vendor,
        "printer_usb_product": settings.printer_usb_product,
    }
    
    # If mode is not ESC_POS_RAW, maybe we don't print here
    if settings.print_mode != "ESC_POS_RAW":
        return {"status": "ignored", "message": "Print mode is not set to ESC_POS_RAW"}
        
    PrinterService.print_receipt(receipt_data, settings_dict)
    
    return {"status": "success", "message": "Receipt sent to printer"}

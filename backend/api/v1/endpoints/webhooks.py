from fastapi import APIRouter, Request, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from core.deps import get_db
from services.payment import get_payment_adapter
from services.billing_service import BillingService

router = APIRouter()

async def process_gateway_webhook(request: Request, gateway: str, signature: str, db: Session):
    payload_bytes = await request.body()
    payload_str = payload_bytes.decode('utf-8')
    
    # Can also be JSON based on gateway
    try:
        payload_dict = await request.json()
    except:
        payload_dict = {}

    adapter = get_payment_adapter(gateway)
    
    try:
        is_success, txn_id, raw_data = adapter.process_webhook(
            payload=payload_dict if payload_dict else {"raw": payload_str}, 
            signature=signature
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Realistically, gateways include metadata like pharmacy_id in the payload
    # For this mock, we assume the pharmacy_id is extracted from the metadata/raw_data
    pharmacy_id = raw_data.get("metadata", {}).get("pharmacy_id") 
    amount = float(raw_data.get("amount", 0)) / 100.0 # Assuming paisas/cents

    if not pharmacy_id:
        # Cannot map payment to a pharmacy without metadata
        return {"status": "ignored", "reason": "missing pharmacy_id metadata"}

    if is_success:
        BillingService.handle_successful_payment(
            db=db, 
            pharmacy_id=pharmacy_id, 
            amount=amount, 
            gateway=gateway, 
            gateway_txn_id=txn_id, 
            raw_response=raw_data
        )
    else:
        BillingService.handle_failed_payment(
            db=db,
            pharmacy_id=pharmacy_id,
            amount=amount,
            gateway=gateway,
            gateway_txn_id=txn_id,
            raw_response=raw_data
        )
        
    return {"status": "ok"}

@router.post("/stripe")
async def stripe_webhook(
    request: Request, 
    stripe_signature: str = Header(None), 
    db: Session = Depends(get_db)
):
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing signature")
    return await process_gateway_webhook(request, "stripe", stripe_signature, db)

@router.post("/jazzcash")
async def jazzcash_webhook(
    request: Request, 
    pp_SecureHash: str = Header(None), 
    db: Session = Depends(get_db)
):
    if not pp_SecureHash:
        # Sometimes jazzcash sends hash in body
        body = await request.json()
        pp_SecureHash = body.get("pp_SecureHash")
    return await process_gateway_webhook(request, "jazzcash", pp_SecureHash, db)

@router.post("/easypaisa")
async def easypaisa_webhook(
    request: Request, 
    db: Session = Depends(get_db)
):
    # Easypaisa passes signature differently, adjusting for mock
    body = await request.json()
    signature = body.get("hash")
    return await process_gateway_webhook(request, "easypaisa", signature, db)

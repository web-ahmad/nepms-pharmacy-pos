"""
api/v1/endpoints/super_admin_media.py
────────────────────────────────────────
Platform-level Media Library — upload/list/delete global media assets.
Files are written under storage/media/ and served via the existing
`/storage` static mount configured in main.py. Super-admin only.
"""

from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from api.v1.endpoints.super_admin import require_super_admin, _get_db
from models.platform import MediaAsset

router = APIRouter()

MEDIA_DIR = os.path.join(os.getcwd(), "storage", "media")
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB


def _asset_dict(a: MediaAsset) -> dict:
    return {
        "id": a.id,
        "filename": a.filename,
        "original_filename": a.original_filename,
        "url": a.url,
        "mime_type": a.mime_type,
        "size_bytes": a.size_bytes,
        "folder": a.folder,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# ── GET /super-admin/media ─────────────────────────────────────────────────────

@router.get("/media")
def list_media(
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    assets = (
        db.query(MediaAsset)
        .filter(MediaAsset.is_deleted == False)
        .order_by(MediaAsset.created_at.desc())
        .all()
    )
    return [_asset_dict(a) for a in assets]


# ── POST /super-admin/media/upload ─────────────────────────────────────────────

@router.post("/media/upload", status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    os.makedirs(MEDIA_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1][:20]
    filename = f"{uuid.uuid4()}{ext}"
    dest_path = os.path.join(MEDIA_DIR, filename)

    size_bytes = 0
    with open(dest_path, "wb") as out_file:
        while chunk := await file.read(1024 * 1024):
            size_bytes += len(chunk)
            if size_bytes > MAX_UPLOAD_BYTES:
                out_file.close()
                os.remove(dest_path)
                raise HTTPException(status_code=400, detail="File exceeds the 15 MB upload limit")
            out_file.write(chunk)

    asset = MediaAsset(
        filename=filename,
        original_filename=file.filename or filename,
        url=f"/storage/media/{filename}",
        mime_type=file.content_type,
        size_bytes=size_bytes,
        folder="general",
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _asset_dict(asset)


# ── DELETE /super-admin/media/:id ──────────────────────────────────────────────

@router.delete("/media/{asset_id}")
def delete_media(
    asset_id: str,
    db: Session = Depends(_get_db),
    _: str = Depends(require_super_admin),
):
    asset = db.query(MediaAsset).filter(
        MediaAsset.id == asset_id, MediaAsset.is_deleted == False
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")

    file_path = os.path.join(MEDIA_DIR, asset.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass  # DB record removal proceeds even if the file is already gone

    asset.is_deleted = True
    db.commit()
    return {"message": "Media asset deleted successfully"}

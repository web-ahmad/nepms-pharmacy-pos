import asyncio
import os
import uuid
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:8000")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "your_service_key")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# A mock registry to simulate querying a database for camera RTSP/ONVIF URLs.
# In production, this would query a `camera_config` table based on branch_id and camera_id.
CAMERA_REGISTRY = {
    "branch_1": {
        "POS_CAM_1": "rtsp://admin:password@192.168.1.100:554/stream1"
    }
}

async def capture_snapshot(branch_id: str, camera_id: str, timestamp: str) -> str | None:
    """
    Connects to an IP camera via RTSP, captures a single frame, 
    uploads to Supabase Storage, and returns the public URL.
    Returns None if it fails, allowing the caller to degrade gracefully.
    """
    try:
        # 1. Capture Frame using OpenCV synchronously but wrapped in thread
        def capture_webcam():
            import cv2
            cap = cv2.VideoCapture(0) # 0 is the default laptop camera
            if not cap.isOpened():
                return None
            # Allow camera to warm up
            import time
            time.sleep(0.5)
            ret, frame = cap.read()
            cap.release()
            
            if ret:
                success, buffer = cv2.imencode('.jpg', frame)
                if success:
                    return buffer.tobytes()
            return None

        image_data = await asyncio.to_thread(capture_webcam)
        
        if not image_data:
            logger.error(f"Camera failure: Could not capture image from laptop webcam.")
            return None
        
        # 3. Upload to Supabase Storage
        # Sanitize timestamp for file path (remove colons, etc)
        safe_timestamp = timestamp.replace(":", "-").replace("T", "_").split(".")[0]
        file_name = f"{branch_id}/{camera_id}/{safe_timestamp}_{uuid.uuid4().hex[:8]}.jpg"
        bucket_name = "audit_snapshots"
        
        # The Supabase Python client's storage upload is synchronous. 
        # We wrap it in asyncio.to_thread so it doesn't block the event loop.
        def upload_to_supabase():
            return supabase.storage.from_(bucket_name).upload(
                file=image_data, 
                path=file_name, 
                file_options={"content-type": "image/jpeg"}
            )
            
        await asyncio.to_thread(upload_to_supabase)
        
        # 4. Generate and return the Public/Signed URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
        logger.info(f"Successfully captured and uploaded snapshot: {public_url}")
        
        return public_url
        
    except Exception as e:
        logger.error(f"Camera failure: Unexpected error capturing snapshot for {branch_id}/{camera_id}: {e}", exc_info=True)
        return None

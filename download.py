from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from celery_config import celery_app
import os, glob

router = APIRouter()

OUTPUT_DIR = "/tmp/fileconverter/outputs"

@router.get("/{job_id}")
async def download_file(job_id: str):
    result = celery_app.AsyncResult(job_id)

    if result.state != "SUCCESS":
        raise HTTPException(status_code=404, detail="Job not complete or not found")

    info = result.info
    if not isinstance(info, dict) or "output_path" not in info:
        raise HTTPException(status_code=500, detail="Output path missing")

    output_path = info["output_path"]

    # Handle zip (multi-file PDF→images)
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Output file not found")

    filename = os.path.basename(output_path)
    return FileResponse(
        path=output_path,
        filename=filename,
        media_type="application/octet-stream",
    )

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from celery_config import celery_app

router = APIRouter()

@router.get("/{job_id}")
async def get_status(job_id: str):
    result = celery_app.AsyncResult(job_id)

    state = result.state
    info = result.info

    if state == "PENDING":
        return JSONResponse({"job_id": job_id, "status": "pending"})
    elif state == "STARTED":
        return JSONResponse({"job_id": job_id, "status": "processing"})
    elif state == "SUCCESS":
        return JSONResponse({
            "job_id": job_id,
            "status": "done",
            "download_url": f"/download/{job_id}",
            "output_format": info.get("output_format") if isinstance(info, dict) else None,
        })
    elif state == "FAILURE":
        return JSONResponse({
            "job_id": job_id,
            "status": "failed",
            "error": str(info) if info else "Unknown error",
        }, status_code=500)
    else:
        return JSONResponse({"job_id": job_id, "status": state.lower()})

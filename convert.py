from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import uuid, os, shutil

from utils.validation import validate_conversion, get_file_extension
from tasks.convert_task import run_conversion

router = APIRouter()

UPLOAD_DIR = "/tmp/fileconverter/uploads"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

ALLOWED_CONVERSIONS = {
    "png": ["jpg", "webp"],
    "jpg": ["png", "webp"],
    "jpeg": ["png", "webp"],
    "webp": ["png", "jpg"],
    "pdf": ["png", "jpg"],
    "mp4": ["mp3", "gif", "wav"],
    "mp3": ["wav", "mp4"],
    "wav": ["mp3", "mp4"],
    "gif": ["mp4", "png"],
    "docx": ["pdf"],
    "pptx": ["pdf"],
    "xlsx": ["pdf"],
}

@router.post("/")
async def convert_file(
    file: UploadFile = File(...),
    output_format: str = Form(...),
):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 50MB limit")

    ext = get_file_extension(file.filename)
    output_format = output_format.lower().strip(".")

    error = validate_conversion(ext, output_format, ALLOWED_CONVERSIONS)
    if error:
        raise HTTPException(status_code=400, detail=error)

    job_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{job_id}.{ext}")

    with open(input_path, "wb") as f:
        f.write(content)

    run_conversion.apply_async(
        args=[job_id, input_path, ext, output_format],
        task_id=job_id,
    )

    return JSONResponse({
        "job_id": job_id,
        "status": "queued",
        "input_format": ext,
        "output_format": output_format,
    })

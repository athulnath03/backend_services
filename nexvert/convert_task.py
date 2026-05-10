from celery_config import celery_app
from services.converter import (
    convert_image,
    convert_pdf_to_images,
    convert_media,
    convert_document,
)

IMAGE_EXTS = {"png", "jpg", "jpeg", "webp"}
MEDIA_EXTS = {"mp4", "mp3", "wav", "gif"}
DOC_EXTS = {"docx", "pptx", "xlsx"}

@celery_app.task(bind=True)
def run_conversion(self, job_id: str, input_path: str, input_ext: str, output_format: str):
    self.update_state(state="STARTED", meta={"status": "processing"})

    try:
        ext = input_ext.lower()

        if ext in IMAGE_EXTS:
            output_path = convert_image(input_path, output_format, job_id)
        elif ext == "pdf":
            output_path = convert_pdf_to_images(input_path, output_format, job_id)
        elif ext in MEDIA_EXTS:
            output_path = convert_media(input_path, ext, output_format, job_id)
        elif ext in DOC_EXTS:
            output_path = convert_document(input_path, output_format, job_id)
        else:
            raise ValueError(f"Unsupported input format: {ext}")

        return {"output_path": output_path, "output_format": output_format}

    except Exception as exc:
        self.update_state(state="FAILURE", meta={"error": str(exc)})
        raise

import os
import subprocess
import zipfile
import glob
from PIL import Image

OUTPUT_DIR = "/tmp/fileconverter/outputs"


def convert_image(input_path: str, output_format: str, job_id: str) -> str:
    output_path = os.path.join(OUTPUT_DIR, f"{job_id}.{output_format}")
    with Image.open(input_path) as img:
        if output_format in ("jpg", "jpeg") and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(output_path, format=output_format.upper().replace("JPG", "JPEG"))
    return output_path


def convert_pdf_to_images(input_path: str, output_format: str, job_id: str) -> str:
    out_dir = os.path.join(OUTPUT_DIR, job_id)
    os.makedirs(out_dir, exist_ok=True)

    fmt_flag = "png" if output_format == "png" else "jpeg"
    cmd = [
        "pdftoppm",
        f"-{fmt_flag}",
        "-r", "150",
        input_path,
        os.path.join(out_dir, "page"),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"pdftoppm failed: {result.stderr}")

    pages = sorted(glob.glob(os.path.join(out_dir, f"page-*.{fmt_flag if fmt_flag == 'png' else 'jpg'}")))
    if not pages:
        pages = sorted(glob.glob(os.path.join(out_dir, "*")))

    zip_path = os.path.join(OUTPUT_DIR, f"{job_id}.zip")
    with zipfile.ZipFile(zip_path, "w") as zf:
        for p in pages:
            zf.write(p, os.path.basename(p))

    return zip_path


def convert_media(input_path: str, input_ext: str, output_format: str, job_id: str) -> str:
    output_path = os.path.join(OUTPUT_DIR, f"{job_id}.{output_format}")

    if input_ext == "gif" and output_format == "mp4":
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-movflags", "faststart",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            output_path,
        ]
    elif input_ext == "gif" and output_format == "png":
        output_path = os.path.join(OUTPUT_DIR, f"{job_id}.png")
        cmd = ["ffmpeg", "-y", "-i", input_path, "-vframes", "1", output_path]
    elif output_format == "gif":
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vf", "fps=10,scale=480:-1:flags=lanczos",
            "-loop", "0",
            output_path,
        ]
    elif output_format == "mp3":
        cmd = ["ffmpeg", "-y", "-i", input_path, "-q:a", "2", output_path]
    elif output_format == "wav":
        cmd = ["ffmpeg", "-y", "-i", input_path, output_path]
    elif output_format == "mp4":
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vn" if input_ext in ("mp3", "wav") else "-c:v", 
            "libx264" if input_ext not in ("mp3", "wav") else "-an",
            output_path,
        ]
    else:
        cmd = ["ffmpeg", "-y", "-i", input_path, output_path]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr[-500:]}")

    return output_path


def convert_document(input_path: str, output_format: str, job_id: str) -> str:
    out_dir = os.path.join(OUTPUT_DIR, job_id)
    os.makedirs(out_dir, exist_ok=True)

    cmd = [
        "libreoffice", "--headless", "--convert-to", output_format,
        "--outdir", out_dir, input_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice failed: {result.stderr}")

    files = glob.glob(os.path.join(out_dir, f"*.{output_format}"))
    if not files:
        raise RuntimeError("LibreOffice produced no output file")

    final_path = os.path.join(OUTPUT_DIR, f"{job_id}.{output_format}")
    os.rename(files[0], final_path)
    return final_path

import os
import time
import threading
import shutil

UPLOAD_DIR = "/tmp/fileconverter/uploads"
OUTPUT_DIR = "/tmp/fileconverter/outputs"
MAX_AGE_SECONDS = 3600  # 1 hour


def cleanup_old_files():
    now = time.time()
    for directory in [UPLOAD_DIR, OUTPUT_DIR]:
        if not os.path.exists(directory):
            continue
        for entry in os.listdir(directory):
            path = os.path.join(directory, entry)
            try:
                mtime = os.path.getmtime(path)
                if now - mtime > MAX_AGE_SECONDS:
                    if os.path.isdir(path):
                        shutil.rmtree(path, ignore_errors=True)
                    else:
                        os.remove(path)
            except Exception:
                pass


def _run_scheduler():
    while True:
        time.sleep(600)  # every 10 minutes
        cleanup_old_files()


def start_cleanup_scheduler():
    t = threading.Thread(target=_run_scheduler, daemon=True)
    t.start()

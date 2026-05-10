from celery import Celery

celery_app = Celery(
    "fileconverter",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    include=["tasks.convert_task"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    result_expires=3600,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

from celery import Celery
from celery.schedules import crontab


celery = Celery(

    "tasks",

    broker="redis://localhost:6379/0",

    backend="redis://localhost:6379/0",

    include=["app.tasks"]

)


celery.conf.beat_schedule = {

    "weekly-report-task": {

        "task": "app.tasks.send_weekly_report",

        "schedule": 30.0 , 

        #"schedule": crontab(hour=9, minute=0, day_of_week=1)

    }

}


celery.conf.timezone = "Asia/Kolkata"
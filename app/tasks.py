from app.celery_worker import celery

from app.utils.email_utils import send_email

from app.config.database import localSession

from app.models.models import Patient, Doctor




@celery.task
def send_weekly_report():

    db = localSession()

    total_patients = db.query(Patient).count()

    total_doctors = db.query(Doctor).count()

    html_body = f"""

    <html>

    <body style="font-family: Arial;">

        <h1 style="color: blue;">

            Weekly Hospital Report

        </h1>

        <br>

        <table border="1" cellspacing="0" cellpadding="10" width="50%">

            <tr style="background-color:#f2f2f2;">

                <th>Metric</th>

                <th>Count</th>

            </tr>

            <tr>

                <td>Total Patients</td>

                <td>{total_patients}</td>

            </tr>

            <tr>

                <td>Total Doctors</td>

                <td>{total_doctors}</td>

            </tr>

        </table>

        <br>

        <p>

            This is an automated weekly report generated using FastAPI + Celery.

        </p>

    </body>

    </html>

    """

    send_email(

        to_email="ritwikk1777@gmail.com",

        subject="Weekly Hospital Report",

        body=html_body

    )

    print("Weekly report email sent")
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_email(

    to_email: str,

    subject: str,

    body: str

):

    sender_email = "kumarritwik1234@gmail.com"

    sender_password = "dkvu iyjs emur cpzm"

    message = MIMEMultipart()

    message["From"] = sender_email
    message["To"] = to_email
    message["Subject"] = subject

    message.attach(

        MIMEText(body, "html")

    )

    try:

        server = smtplib.SMTP(

            "smtp.gmail.com",

            587

        )

        server.starttls()

        server.login(

            sender_email,

            sender_password

        )

        server.sendmail(

            sender_email,

            to_email,

            message.as_string()

        )

        server.quit()

        print("Email sent successfully")

    except Exception as e:

        print("Email sending failed:", e)
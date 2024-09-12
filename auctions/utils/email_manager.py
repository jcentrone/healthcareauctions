from django.core.mail import send_mail
from django.conf import settings


def send_welcome_email_html(to_email):
    subject = 'Welcome to Healthcare Auctions!'
    message = 'Thank you for signing up with Healthcare Auctions. We are excited to have you onboard.'
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [to_email]
    html_message = """
    <h1>Welcome to Healthcare Auctions!</h1>
    <p>Thank you for signing up. We are excited to have you onboard.</p>
    """

    send_mail(subject, message, from_email, recipient_list, html_message=html_message)

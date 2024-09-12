from django.conf import settings
from django.core.mail import send_mail


def generate_welcome_email(username):
    welcome_message_text = (
        f"Dear {username},\n\n"
        "Thank you for signing up with Healthcare Auctions, your trusted partner for healthcare devices and supplies. "
        "We're thrilled to have you join our community where buyers and sellers connect in a seamless, trustworthy marketplace dedicated to medical devices and products.\n\n"
        "How We Work\n"
        "Our platform bridges the gap between buyers and sellers, providing a marketplace where quality and satisfaction are our top priorities. "
        "Sellers, often with excess inventory or products nearing expiration, list their items with ease, and we ensure they reach the right audience. "
        "As a buyer, you’ll have access to a wide selection of trusted products, with the assurance of worry-free returns and personalized assistance whenever needed.\n\n"
        "Your Dashboard\n"
        "Your dashboard is your command center, where you can view and track orders, manage your account details, and more. "
        "Simply log in to get started and take full advantage of the features we’ve designed to make your experience with Healthcare Auctions smooth and efficient.\n\n"
        "Have Questions?\n"
        "We’re here to help! If you have any questions or need assistance, please don’t hesitate to reach out to our customer service team at "
        "customerservice@healthcareauctions.com. We’re always ready to support you.\n\n"
        "Thank you once again for choosing Healthcare Auctions. We look forward to serving you and ensuring your experience with us is nothing short of excellent.\n\n"
        "Best regards,\n"
        "The Healthcare Auctions Team"
    )

    welcome_message_html = (
        "<html>"
        "<body style='font-family: Arial, sans-serif; color: #333333;'>"
        f"<p style='font-size: 16px;'>Dear {username},</p>"

        "<p style='font-size: 16px;'>"
        "Thank you for signing up with <strong>Healthcare Auctions</strong>, your trusted partner for healthcare devices and supplies. "
        "We're thrilled to have you join our community where buyers and sellers connect in a seamless, trustworthy marketplace dedicated to medical devices and products."
        "</p>"

        "<h3 style='font-size: 18px; color: #131C31;'>How We Work</h3>"
        "<p style='font-size: 16px;'>"
        "Our platform bridges the gap between buyers and sellers, providing a marketplace where quality and satisfaction are our top priorities. "
        "Sellers, often with excess inventory or products nearing expiration, list their items with ease, and we ensure they reach the right audience. "
        "As a buyer, you’ll have access to a wide selection of trusted products, with the assurance of worry-free returns and personalized assistance whenever needed."
        "<a href='www.healtcareauctions.com/auction/active' style='color: #00B2FF;'>View Listings</a>"

        "</p>"

        "<h3 style='font-size: 18px; color: #131C31;'>Your Dashboard</h3>"
        "<p style='font-size: 16px;'>"
        "Your dashboard is your command center, where you can view and track orders, manage your account details, and more. "
        "Simply log in to get started and take full advantage of the features we’ve designed to make your experience with Healthcare Auctions smooth and efficient. "
        "<a href='www.healtcareauctions.com/dashboard' style='color: #00B2FF;'>View My Dashboard</a>"
        "</p>"

        "<h3 style='font-size: 18px; color: #131C31;'>Have Questions?</h3>"
        "<p style='font-size: 16px;'>"
        "We’re here to help! If you have any questions or need assistance, please don’t hesitate to reach out to our customer service team at "
        "<a href='mailto:customerservice@healthcareauctions.com' style='color: #00B2FF;'>customerservice@healthcareauctions.com</a>. We’re always ready to support you."
        "</p>"

        "<p style='font-size: 16px;'>"
        "Thank you once again for choosing Healthcare Auctions. We look forward to serving you and ensuring your experience with us is nothing short of excellent."
        "</p>"

        "<p style='font-size: 16px;'>"
        "Best regards,<br>"
        "The Healthcare Auctions Team"
        "</p>"
        "</body>"
        "</html>"
    )
    return welcome_message_text, welcome_message_html


def send_welcome_email_html(to_email, user_first_Name):
    welcome_message_text, welcome_message_html = generate_welcome_email(user_first_Name)

    subject = 'Welcome to Healthcare Auctions!'
    message = welcome_message_text
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [to_email]
    html_message = welcome_message_html

    send_mail(subject, message, from_email, recipient_list, html_message=html_message)

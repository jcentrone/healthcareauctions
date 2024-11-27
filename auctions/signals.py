# orders/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import Order, User, Address
from decimal import Decimal

from .utils.zoho_integration import create_or_update_zoho_account_and_contact


@receiver(post_save, sender=Order)
def send_order_notification(sender, instance, created, **kwargs):
    if created:
        # Compose the email subject and message
        subject = f"New Order #{instance.id} from {instance.user.username}"
        message = (
            f"A new order has been placed on Healthcare Auctions.\n\n"
            f"Order Details:\n"
            f"Order ID: {instance.id}\n"
            f"User: {instance.user.username}\n"
            f"Total Amount: ${instance.total_amount or Decimal('0.00'):.2f}\n"
            f"Created At: {instance.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            f"Please log in to the admin panel to view more details."
        )
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = ['orders@healthcareauctions.com']

        # Send the email
        send_mail(subject, message, from_email, recipient_list)


@receiver(post_save, sender=User)
def sync_user_to_zoho(sender, instance, **kwargs):
    create_or_update_zoho_account_and_contact(instance)

@receiver(post_save, sender=Address)
def sync_address_to_zoho(sender, instance, **kwargs):
    create_or_update_zoho_account_and_contact(instance.user)
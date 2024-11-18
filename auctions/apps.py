from django.apps import AppConfig
from django.db.models.signals import post_migrate
from django.core.management import call_command


class AuctionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'auctions'

    def ready(self):

        def start_scheduler(sender, **kwargs):
            call_command('start_scheduler')

        post_migrate.connect(start_scheduler, sender=self)


class OrdersConfig(AppConfig):
    name = 'orders'  # Replace with your app name if different

    def ready(self):
        import auctions.signals  # Import signals to connect them
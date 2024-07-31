from django.apps import AppConfig
from django.db.models.signals import post_migrate


class AuctionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'auctions'

    def ready(self):
        from . import scheduler
        from django.core.management import call_command

        def start_scheduler(sender, **kwargs):
            call_command('start_scheduler')

        post_migrate.connect(start_scheduler, sender=self)
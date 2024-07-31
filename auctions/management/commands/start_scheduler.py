from django.core.management.base import BaseCommand

from auctions import scheduler


class Command(BaseCommand):
    help = 'Starts the APScheduler.'

    def handle(self, *args, **kwargs):
        scheduler.start()
        self.stdout.write(self.style.SUCCESS('APScheduler started.'))

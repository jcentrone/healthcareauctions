import logging

from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
from django_apscheduler.jobstores import DjangoJobStore, register_events

from .models import Auction

logger = logging.getLogger(__name__)


def deactivate_expired_auctions():
    now = timezone.now()
    expired_auctions = Auction.objects.filter(active=True, expiration_date__lt=now)
    count = expired_auctions.update(active=False)
    logger.info(f'Deactivated {count} expired auctions')


def start():
    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")

    scheduler.add_job(
        deactivate_expired_auctions,
        trigger='interval',
        minutes=1,
        id='deactivate_expired_auctions',
        replace_existing=True
    )

    register_events(scheduler)
    scheduler.start()
    logger.info("Scheduler started")

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
from django_apscheduler.jobstores import DjangoJobStore, register_events

from .models import Auction

logger = logging.getLogger(__name__)


def deactivate_expired_auctions():
    now = timezone.now()
    expired_auctions = Auction.objects.filter(active=True, auction_type='Auction',
                                              date_created__lte=now - timezone.timedelta(days=7))

    for auction in expired_auctions:
        auction.active = False
        auction.save()
        logger.info(f'Auction "{auction.title}" has been deactivated.')

    logger.info('Expired auctions check complete.')


def start():
    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")

    scheduler.add_job(
        deactivate_expired_auctions,
        trigger='interval',
        minutes=5,
        id='deactivate_expired_auctions',
        replace_existing=True
    )

    register_events(scheduler)
    scheduler.start()
    logger.info("Scheduler started")

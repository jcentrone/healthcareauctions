import logging

from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
from django_apscheduler.jobstores import DjangoJobStore, register_events

from .models import Auction

logger = logging.getLogger(__name__)


def deactivate_expired_auctions():
    now = timezone.now()
    expired_auctions = Auction.objects.filter(
        active=True,
        auction_type='Auction',
        auction_ending_date__lte=now
    )

    expired_auctions.update(active=False)
    for auction in expired_auctions:
        logger.info(f'Auction "{auction.title}" has been deactivated.')

    # logger.info('Expired auctions check complete.')
    # print('Expired auctions check complete.')

    # now = timezone.now()
    # sample_auctions = Auction.objects.filter(active=True, auction_type='Auction')
    #
    # for auction in sample_auctions:
    #     print(f"Auction ID: {auction.id}, Ending Date: {auction.auction_ending_date}, Now: {now}")


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

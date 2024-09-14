import logging
from django.utils import timezone
from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore, register_events
from django.db import transaction
from .models import Auction, Bid, Cart, CartItem

logger = logging.getLogger(__name__)


def deactivate_expired_auctions():
    with transaction.atomic():
        now = timezone.now()
        expired_auctions = Auction.objects.filter(
            active=True,
            auction_type='Auction',
            auction_ending_date__lte=now
        )

        for auction in expired_auctions:
            # Get all bids for the auction
            bids = Bid.objects.filter(auction=auction)

            if bids.exists():
                # Find the highest bid
                highest_bid = bids.order_by('-amount').first()
                highest_bid_amount = highest_bid.amount

                # Check if reserve price is met (if applicable)
                reserve_price = auction.reserve_bid
                if reserve_price is None or highest_bid_amount >= reserve_price:
                    # Add the auction item to the highest bidder's cart
                    user_cart, created = Cart.objects.get_or_create(user=highest_bid.user)

                    # Check if the item is already in the cart
                    cart_item, item_created = CartItem.objects.get_or_create(
                        cart=user_cart,
                        auction=auction,
                        defaults={
                            'quantity': 1,
                            'price_each': highest_bid_amount
                        }
                    )
                    if not item_created:
                        # If item already in cart, update quantity and price
                        cart_item.quantity += 1
                        cart_item.price_each = highest_bid_amount
                        cart_item.save()
                    auction.auction_end_reason = 'sold'
                    logger.info(
                        f'Auction "{auction.title}" won by {highest_bid.user.username} at ${highest_bid_amount}. Item added to cart.')
                else:
                    # Reserve price not met; auction ends without a winner
                    auction.auction_end_reason = 'reserve_not_met'
                    logger.info(f'Auction "{auction.title}" expired. Reserve price not met. No winner.')
            else:
                # No bids were placed on the auction
                auction.auction_end_reason = 'expired'
                logger.info(f'Auction "{auction.title}" expired with no bids.')


            # Deactivate the auction
            auction.active = False
            auction.save()

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

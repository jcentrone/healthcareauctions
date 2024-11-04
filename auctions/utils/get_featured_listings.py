import random
from ..models import Auction  # Adjust the import based on your project structure

def get_featured_listings(num_listings=4):
    """
    Retrieves up to `num_listings` featured listings. If there aren't enough featured listings,
    fills the remaining slots with random active listings.
    """
    # Get IDs of featured active listings
    featured_active_listing_ids = list(
        Auction.objects.filter(active=True, featured_listing=True).values_list('id', flat=True)
    )

    # Sample up to `num_listings` featured listings
    featured_listing_ids = random.sample(
        featured_active_listing_ids, min(len(featured_active_listing_ids), num_listings)
    )

    # Calculate the number of additional listings needed
    num_needed = num_listings - len(featured_listing_ids)

    if num_needed > 0:
        # Get IDs of other active listings not already selected
        other_active_listing_ids = list(
            Auction.objects.filter(active=True).exclude(id__in=featured_listing_ids).values_list('id', flat=True)
        )
        # Sample additional listings to fill the remaining slots
        additional_listing_ids = random.sample(
            other_active_listing_ids, min(len(other_active_listing_ids), num_needed)
        )
        # Combine featured and additional listing IDs
        featured_listing_ids += additional_listing_ids

    # Retrieve the combined list of listings
    featured_listings = Auction.objects.filter(id__in=featured_listing_ids)

    return featured_listings

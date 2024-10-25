from django.db.models import Count, Q

from .models import Category, Message, Cart, MedicalSpecialty, Auction


def header_data(request):
    context = {}

    # Fetch Manufacturers
    manufacturers_with_auctions = Auction.get_active_manufacturers()

    # Fetch categories
    categories_with_auctions = Category.objects.filter(auction_category__isnull=False).distinct().order_by(
        'category_name')

    context['categories'] = categories_with_auctions
    context['manufacturers_with_auctions'] = manufacturers_with_auctions

    specialties_with_auctions = MedicalSpecialty.objects.annotate(
        count_active_auctions=Count(
            'categories__auction_category',
            filter=Q(
                categories__auction_category__active=True,
                categories__auction_category__hold_for_import=False
            ),
            distinct=True
        )
    ).order_by('description')

    context['specialties'] = specialties_with_auctions

    if request.user.is_authenticated:

        def add_images_to_auctions(auctions):
            for auction in auctions:
                auction.image = auction.get_image()
            return auctions

        # Get the watchlist
        watchlist = request.user.watchlist.all()
        watchlist = add_images_to_auctions(watchlist)

        # Get unread message count
        unread_message_count = Message.unread_count(request.user)

        # Get cart count
        cart = Cart.objects.filter(user=request.user).first()
        cart_count = cart.item_count() if cart else 0

        # Add variables to context
        context.update({
            'watchlist': watchlist,
            'unread_message_count': unread_message_count,
            'cart_count': cart_count,
        })

    return context

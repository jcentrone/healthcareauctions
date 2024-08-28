from .models import Category, Message


def header_data(request):
    context = {}

    categories_with_auctions = Category.objects.filter(auction_category__isnull=False).distinct().order_by(
        'category_name')

    if request.user.is_authenticated:

        def add_images_to_auctions(auctions):
            for auction in auctions:
                auction.image = auction.get_image()
            return auctions

        watchlist = request.user.watchlist.all()
        watchlist = add_images_to_auctions(watchlist)

        unread_message_count = Message.unread_count(request.user)

        # Add your variables
        context['categories'] = categories_with_auctions
        context['watchlist'] = watchlist
        context['unread_message_count'] = unread_message_count
    else:
        context['categories'] = categories_with_auctions

    return context

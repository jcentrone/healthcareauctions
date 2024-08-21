from django import template
from django.shortcuts import get_object_or_404
from auctions.models import Category, Message, Cart

register = template.Library()


@register.inclusion_tag('header_new.html', takes_context=True)
def render_header(context):
    request = context['request']

    categories = []
    watchlist = []
    unread_message_count = 0
    cart_count = 0  # Initialize cart_count to avoid any NameError

    if request.user.is_authenticated:
        def add_images_to_auctions(auctions):
            for auction in auctions:
                auction.image = auction.get_image()
            return auctions

        # Get the watchlist
        watchlist = request.user.watchlist.all()
        watchlist = add_images_to_auctions(watchlist)

        # Get categories
        categories = Category.objects.filter(auction_category__isnull=False).distinct().order_by('category_name')

        # Get unread message count
        unread_message_count = Message.unread_count(request.user)

        # Get cart count
        cart = Cart.objects.filter(user=request.user).first()
        if cart:
            cart_count = cart.item_count()

    return {
        'user': request.user,  # Explicitly pass the user to the template
        'categories': categories,
        'watchlist': watchlist,
        'unread_message_count': unread_message_count,
        'cart_count': cart_count,
    }

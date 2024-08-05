import json
import logging
import random
from datetime import timedelta
from decimal import Decimal

from django import forms
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.files.storage import get_storage_class
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db import IntegrityError
from django.db.models import Count, Q
from django.http import HttpResponseRedirect, JsonResponse, FileResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .forms import AuctionForm, ImageForm, CommentForm, BidForm, AddToCartForm
from .models import Auction, Bid, Category, Image, User, Address, CartItem, Cart
from .utils.helpers import update_categories_from_fda

# Set up logging
logger = logging.getLogger(__name__)


def index(request):
    """
    The default route which renders a Dashboard page
    """
    # Filter categories to include only those with at least one auction
    categories_with_auctions = Category.objects.filter(auction_category__isnull=False).distinct().order_by(
        'category_name')
    category_count = categories_with_auctions.count()

    if category_count < 2:
        # Ensure there are at least 2 categories
        return render(request, 'index.html', {
            'error': 'Not enough categories with auctions available to display.',
        })

    # Select two random categories
    random_category1 = random.choice(categories_with_auctions)

    # Select the second random category, ensuring it's different from the first
    remaining_categories = categories_with_auctions.exclude(id=random_category1.id)
    random_category2 = random.choice(remaining_categories)

    # Get up to 8 auctions from each of the random categories
    auctions_cat1 = Auction.objects.filter(category=random_category1)[:8]
    auctions_cat2 = Auction.objects.filter(category=random_category2)[:8]

    # Determine if the user is watching each auction
    if request.user.is_authenticated:
        watchlist = request.user.watchlist.all()
        for auction in watchlist:
            auction.image = auction.get_images.first()
    else:
        watchlist = Auction.objects.none()

    for auction in auctions_cat1:
        auction.image = auction.get_images.first()
        auction.is_watched = auction in watchlist

    for auction in auctions_cat2:
        auction.image = auction.get_images.first()
        auction.is_watched = auction in watchlist

    # Paginate if you still want to show auctions with pagination
    page = request.GET.get('page', 1)
    paginator_cat1 = Paginator(auctions_cat1, 8)
    paginator_cat2 = Paginator(auctions_cat2, 8)

    try:
        pages_cat1 = paginator_cat1.page(page)
        pages_cat2 = paginator_cat2.page(page)
    except PageNotAnInteger:
        pages_cat1 = paginator_cat1.page(1)
        pages_cat2 = paginator_cat2.page(1)
    except EmptyPage:
        pages_cat1 = paginator_cat1.page(paginator_cat1.num_pages)
        pages_cat2 = paginator_cat2.page(paginator_cat2.num_pages)

    return render(request, 'index.html', {
        'categories': categories_with_auctions,
        'auctions_cat1': auctions_cat1,
        'auctions_cat2': auctions_cat2,
        'expensive_auctions': Auction.objects.order_by('-starting_bid')[:4],
        'auctions_count': Auction.objects.all().count(),
        'bids_count': Bid.objects.all().count(),
        'categories_count': category_count,
        'users_count': User.objects.all().count(),
        'pages_cat1': pages_cat1,
        'pages_cat2': pages_cat2,
        'title': 'Home',
        'random_category1': random_category1,
        'random_category2': random_category2,
        'watchlist': watchlist,
    })


def header(request):
    """
    The default route which renders a Dashboard page
    """
    auctions = Auction.objects.all()

    expensive_auctions = Auction.objects.order_by('-starting_bid')[:4]

    for auction in auctions:
        auction.image = auction.get_images.first()

    # Show 5 auctions per page
    page = request.GET.get('page', 1)
    paginator = Paginator(auctions, 5)

    try:
        pages = paginator.page(page)
    except PageNotAnInteger:
        pages = paginator.page(1)
    except EmptyPage:
        pages = paginator.page(paginator.num_pages)

    return render(request, 'header_new.html', {
        'categories': Category.objects.all(),
        'auctions': auctions,
        'expensive_auctions': expensive_auctions,
        'auctions_count': Auction.objects.all().count(),
        'bids_count': Bid.objects.all().count(),
        'categories_count': Category.objects.all().count(),
        'users_count': User.objects.all().count(),
        'pages': pages,
        'title': 'Dashboard',
    })


def dashboard(request):
    """
    The default route which renders a Dashboard page
    """
    auctions = Auction.objects.all()

    expensive_auctions = Auction.objects.order_by('-starting_bid')[:4]

    for auction in auctions:
        auction.image = auction.get_images.first()

    # Show 5 auctions per page
    page = request.GET.get('page', 1)
    paginator = Paginator(auctions, 5)

    try:
        pages = paginator.page(page)
    except PageNotAnInteger:
        pages = paginator.page(1)
    except EmptyPage:
        pages = paginator.page(paginator.num_pages)

    return render(request, 'dashboard.html', {
        'categories': Category.objects.all(),
        'auctions': auctions,
        'expensive_auctions': expensive_auctions,
        'auctions_count': Auction.objects.all().count(),
        'bids_count': Bid.objects.all().count(),
        'categories_count': Category.objects.all().count(),
        'users_count': User.objects.all().count(),
        'pages': pages,
        'title': 'Dashboard',
    })


def register(request):
    if request.method == 'POST':
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']
        confirmation = request.POST['confirmation']
        company_name = request.POST['company_name']
        phone_number = request.POST['phone_number']

        # Billing Address
        billing_street = request.POST['billing_street']
        billing_city = request.POST['billing_city']
        billing_state = request.POST['billing_state']
        billing_zip = request.POST['billing_zip']
        billing_country = request.POST['billing_country']

        # Shipping Address
        shipping_street = request.POST['shipping_street']
        shipping_city = request.POST['shipping_city']
        shipping_state = request.POST['shipping_state']
        shipping_zip = request.POST['shipping_zip']
        shipping_country = request.POST['shipping_country']

        # Handle profile image and company logo
        profile_image = request.FILES.get('profile_image')
        company_logo = request.FILES.get('company_logo')

        if password != confirmation:
            return render(request, 'register.html', {
                'message': 'Passwords must match.',
                'title': 'Register',
                'categories': Category.objects.all()
            })

        try:
            user = User.objects.create_user(username, email, password)
            user.company_name = company_name
            user.phone_number = phone_number
            if profile_image:
                profile_image_storage = get_storage_class('myapp.custom_storage_backend.ProfileImageStorage')()
                user.profile_image = profile_image_storage.save(profile_image.name, profile_image)

            if company_logo:
                company_logo_storage = get_storage_class('myapp.custom_storage_backend.CompanyLogoStorage')()
                user.company_logo = company_logo_storage.save(company_logo.name, company_logo)

            # Save billing address
            Address.objects.create(
                user=user,
                address_type='billing',
                street=billing_street,
                city=billing_city,
                state=billing_state,
                zip_code=billing_zip,
                country=billing_country
            )

            # Save shipping address
            Address.objects.create(
                user=user,
                address_type='shipping',
                street=shipping_street,
                city=shipping_city,
                state=shipping_state,
                zip_code=shipping_zip,
                country=shipping_country
            )
        except IntegrityError:
            return render(request, 'register.html', {
                'message': 'Username already taken.',
                'title': 'Register',
                'categories': Category.objects.all()
            })

        login(request, user)
        return redirect(reverse('index'))
    else:
        return render(request, 'register.html', {
            'title': 'Register',
            'categories': Category.objects.all()
        })


def login_view(request):
    if request.method == 'POST':

        # Attempt to sign user in
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse('index'))
        else:
            return render(request, 'login.html', {
                'message': 'Invalid username and/or password.',
                'title': 'Log in',
                'categories': Category.objects.all()
            })
    else:
        return render(request, 'login.html', {
            'title': 'Log in',
            'categories': Category.objects.all()
        })


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse('index'))


@login_required
def auction_create(request):
    ImageFormSet = forms.modelformset_factory(Image, form=ImageForm, extra=5)

    if request.method == 'POST':
        auction_form = AuctionForm(request.POST, request.FILES)
        image_formset = ImageFormSet(request.POST, request.FILES, queryset=Image.objects.none())

        if auction_form.is_valid() and image_formset.is_valid():
            new_auction = auction_form.save(commit=False)
            new_auction.creator = request.user
            new_auction.date_created = timezone.now()
            new_auction.save()

            for form in image_formset.cleaned_data:
                if form:
                    image = form['image']
                    new_image = Image(auction=new_auction, image=image)
                    new_image.save()

            return JsonResponse({'success': True})
        else:
            errors = []
            if not auction_form.is_valid():
                for field, error in auction_form.errors.items():
                    errors.append({'field': field, 'message': error[0]})
                logger.error(f'Auction form errors: {auction_form.errors}')
            if not image_formset.is_valid():
                for form in image_formset.forms:
                    for field, error in form.errors.items():
                        errors.append({'field': f'{form.prefix}-{field}', 'message': error[0]})
                logger.error(f'Image form errors: {image_formset.errors}')
            return JsonResponse({'success': False, 'errors': errors})
    else:
        auction_form = AuctionForm()
        image_formset = ImageFormSet(queryset=Image.objects.none())

    return render(request, 'auction_create.html', {
        'categories': Category.objects.all(),
        'auction_form': auction_form,
        'image_form': image_formset,
        'title': 'Create Auction',
    })



@login_required
@csrf_exempt
def import_excel(request):
    ImageFormSet = forms.modelformset_factory(Image, form=ImageForm, extra=5)

    if request.method == 'POST':
        auction_data = json.loads(request.POST['auction_data'])
        images_data = request.FILES

        for row_index, row in enumerate(auction_data):
            auction_form = AuctionForm(row)
            if auction_form.is_valid():
                new_auction = auction_form.save(commit=False)
                new_auction.creator = request.user
                new_auction.active = True
                new_auction.save()

                # Save images
                for i in range(1, 6):  # Assuming up to 5 images per auction item
                    image_key = f'images_{row_index}_{i}'
                    if image_key in images_data:
                        new_image = Image(auction=new_auction, image=images_data[image_key])
                        new_image.save()

        return JsonResponse({'status': 'success'})

    return render(request, 'import.html', {
        'categories': Category.objects.all(),
        'title': 'Create Auction',
    })


@login_required
def active_auctions_view(request):
    """
    It renders a page that displays all of
    the currently active auction listings
    Active auctions are paginated: 10 per page
    """
    category_name = request.GET.get('category_name', None)
    time_filter = request.GET.get('time_filter', None)
    sort_by = request.GET.get('sort_by', None)
    manufacturer_filter = request.GET.get('mfg_filter', None)
    my_auctions = request.GET.get('my_auctions', None)
    search_query = request.GET.get('search_query', None)
    title = 'Active Auctions'

    now = timezone.now()

    auctions = Auction.objects.filter(active=True)

    if my_auctions:
        auctions = auctions.filter(creator=request.user)
        title = 'My Auctions'

    if category_name:
        auctions = auctions.filter(category__category_name=category_name)

    if time_filter:
        if time_filter == 'today':
            end_date = now + timedelta(days=1)
            auctions = auctions.filter(date_created__lte=end_date)
        elif time_filter == 'tomorrow':
            start_date = now + timedelta(days=1)
            end_date = now + timedelta(days=2)
            auctions = auctions.filter(date_created__range=(start_date, end_date))
        elif time_filter == 'next_3_days':
            end_date = now + timedelta(days=3)
            auctions = auctions.filter(date_created__lte=end_date)
        title = 'Ending: ' + time_filter

    if sort_by:
        if sort_by == 'ending_soonest':
            auctions = auctions.order_by('expiration_date')
        elif sort_by == 'newly_listed':
            auctions = auctions.order_by('-date_created')
        elif sort_by == 'price_highest':
            auctions = auctions.order_by('-starting_bid')
        elif sort_by == 'price_lowest':
            auctions = auctions.order_by('starting_bid')
        elif sort_by == 'fewest_bids':
            auctions = auctions.annotate(bid_count=Count('bid')).order_by('bid_count')
        elif sort_by == 'most_bids':
            auctions = auctions.annotate(bid_count=Count('bid')).order_by('-bid_count')
        title = 'Sorted By: ' + sort_by

    manufacturers = [str(auction.manufacturer) for auction in auctions]
    unique_manufacturers = sorted(set(manufacturers))

    if manufacturer_filter:
        auctions = auctions.filter(manufacturer=manufacturer_filter)
        title = manufacturer_filter

    if search_query:
        auctions = auctions.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(product_name__icontains=search_query) |
            Q(reference_number__icontains=search_query) |
            Q(lot_number__icontains=search_query)
        )
        title = search_query

    for auction in auctions:
        auction.image = auction.get_images.first()
        auction.is_watched = request.user in auction.watchers.all()

    # Show 10 active auctions per page
    page = request.GET.get('page', 1)
    paginator = Paginator(auctions, 10)
    try:
        pages = paginator.page(page)
    except PageNotAnInteger:
        pages = paginator.page(1)
    except EmptyPage:
        pages = paginator.page(paginator.num_pages)

    return render(request, 'auctions_active.html', {
        'categories': Category.objects.all(),
        'auctions': pages,
        'bid_form': BidForm(),
        'auctions_count': auctions.count(),
        'pages': pages,
        'title': title.replace("_", " "),
        'unique_manufacturers': unique_manufacturers,
        'time_filter': time_filter,
        'sort_by': sort_by,
        'manufacturer_filter': manufacturer_filter,
    })


@login_required
def get_auction_images(request, auction_id):
    auction = get_object_or_404(Auction, id=auction_id)
    images = auction.get_images.all()
    image_urls = [image.image.url for image in images]
    return JsonResponse({'image_urls': image_urls})


@login_required
def watchlist_view(request):
    """
    It renders a page that displays all of
    the listings that a user has added to their watchlist
    Auctions are paginated: 3 per page
    """
    auctions = request.user.watchlist.all()

    for auction in auctions:
        auction.image = auction.get_images.first()

        if request.user in auction.watchers.all():
            auction.is_watched = True
        else:
            auction.is_watched = False

    # Show 3 active auctions per page
    page = request.GET.get('page', 1)
    paginator = Paginator(auctions, 3)
    try:
        pages = paginator.page(page)
    except PageNotAnInteger:
        pages = paginator.page(1)
    except EmptyPage:
        pages = paginator.page(paginator.num_pages)

    return render(request, 'auctions_active.html', {
        'categories': Category.objects.all(),
        'auctions': auctions,
        'auctions_count': auctions.count(),
        'pages': pages,
        'title': 'Watchlist'
    })


@login_required
def watchlist_edit(request, auction_id, reverse_method):
    """
    It allows the users to edit the watchlist -
    add and remove items from the Watchlist
    """
    auction = Auction.objects.get(id=auction_id)

    if request.user in auction.watchers.all():
        auction.watchers.remove(request.user)
    else:
        auction.watchers.add(request.user)

    if reverse_method == 'auction_details_view':
        return auction_details_view(request, auction_id)
    else:
        return HttpResponseRedirect(reverse(reverse_method))


def auction_details_view(request, auction_id):
    """
    It renders a page that displays the details of a selected auction
    """
    if not request.user.is_authenticated:
        return HttpResponseRedirect(reverse('login'))

    auction = Auction.objects.get(id=auction_id)

    if request.user in auction.watchers.all():
        auction.is_watched = True
    else:
        auction.is_watched = False

    return render(request, 'auction.html', {
        'categories': Category.objects.all(),
        'auction': auction,
        'images': auction.get_images.all(),
        'bid_form': BidForm(),
        'buy_it_now_form': AddToCartForm(),
        'comments': auction.get_comments.all(),
        'comment_form': CommentForm(),
        'title': 'Auction'
    })


def privacy_policy(request):
    return render(request, 'privacy_policy.html', {
        'categories': Category.objects.all(),
        'title': 'Privacy Policy'
    })


@login_required
def auction_bid(request, auction_id):
    """
    It allows the signed in users to bid on the item
    """
    auction = Auction.objects.get(id=auction_id)
    amount = Decimal(request.POST['amount'])
    print('bid')

    if amount >= auction.starting_bid and (auction.current_bid is None or amount > auction.current_bid):
        auction.current_bid = amount
        form = BidForm(request.POST)
        new_bid = form.save(commit=False)
        new_bid.auction = auction
        new_bid.user = request.user
        new_bid.save()
        auction.save()

        return HttpResponseRedirect(reverse('auction_details_view', args=[auction_id]))
    else:
        return render(request, 'auction.html', {
            'categories': Category.objects.all(),
            'auction': auction,
            'images': auction.get_images.all(),
            'form': BidForm(),
            'error_min_value': True,
            'title': 'Auction'
        })


def auction_close(request, auction_id):
    """
    It allows the signed in user who created the listing
    to “close” the auction, which makes the highest bidder
    the winner of the auction and makes the listing no longer active
    """
    auction = Auction.objects.get(id=auction_id)

    if request.user == auction.creator:
        auction.active = False
        auction.buyer = Bid.objects.filter(auction=auction).last().user
        auction.save()

        return HttpResponseRedirect(reverse('auction_details_view', args=[auction_id]))
    else:
        auction.watchers.add(request.user)

        return HttpResponseRedirect(reverse('watchlist_view'))


def auction_comment(request, auction_id):
    """
    It allows the signed in users to add comments to the listing page
    """
    auction = Auction.objects.get(id=auction_id)
    form = CommentForm(request.POST)
    new_comment = form.save(commit=False)
    new_comment.user = request.user
    new_comment.auction = auction
    new_comment.save()
    return HttpResponseRedirect(reverse('auction_details_view', args=[auction_id]))


def category_details_view(request, category_name):
    """
    Clicking on the name of any category takes the user to a page that
    displays all of the active listings in that category
    Auctions are paginated: 3 per page
    """
    category = Category.objects.get(category_name=category_name)
    auctions = Auction.objects.filter(category=category)

    for auction in auctions:
        auction.image = auction.get_images.first()

    # Show 3 active auctions per page
    page = request.GET.get('page', 1)
    paginator = Paginator(auctions, 3)
    try:
        pages = paginator.page(page)
    except PageNotAnInteger:
        pages = paginator.page(1)
    except EmptyPage:
        pages = paginator.page(paginator.num_pages)

    return render(request, 'auctions_category.html', {
        'categories': Category.objects.all(),
        'auctions': auctions,
        'auctions_count': auctions.count(),
        'pages': pages,
        'title': category.category_name
    })


def barcode_scanner(request):
    return render(request, 'barcode_scanner.html')


@csrf_exempt
def classify_device_view(request):
    # device_data = json.loads(request.body)  # Parse the JSON body
    # print(request)
    if request.method == 'POST':
        try:
            device_data = json.loads(request.body)  # Parse the JSON body
            print(device_data)
            category = update_categories_from_fda(device_data)
            return JsonResponse({'category': category}, status=201)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required()
def download_excel(request):
    filepath = 'static/downloads/sample.xlsx'
    response = FileResponse(open(filepath, 'rb'), as_attachment=True, filename='sample.xlsx')
    return response


def add_to_cart(request, auction_id):
    auction = get_object_or_404(Auction, id=auction_id)
    cart, created = Cart.objects.get_or_create(user=request.user)
    form = AddToCartForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        quantity = form.cleaned_data['quantity']
        cart_item, created = CartItem.objects.get_or_create(cart=cart, auction=auction)
        cart_item.quantity += quantity
        cart_item.save()
        return redirect('view_cart')

    return render(request, 'add_to_cart.html', {'auction': auction, 'form': form})


def view_cart(request):
    cart = get_object_or_404(Cart, user=request.user)
    return render(request, 'view_cart.html', {'cart': cart})


def remove_from_cart(request, item_id):
    cart_item = get_object_or_404(CartItem, id=item_id)
    cart_item.delete()
    return redirect('view_cart')

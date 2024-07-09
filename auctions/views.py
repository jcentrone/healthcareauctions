import json
from decimal import Decimal
from datetime import timedelta

import random

from django import forms
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db import IntegrityError
from django.db.models import Count
from django.http import HttpResponseRedirect, JsonResponse, FileResponse
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .forms import AuctionForm, ImageForm, CommentForm, BidForm
from .models import Auction, Bid, Category, Image, User
from .utils.helpers import update_categories_from_fda


def index(request):
    """
    The default route which renders a Dashboard page
    """
    # Filter categories to include only those with at least one auction
    categories_with_auctions = Category.objects.filter(auction_category__isnull=False).distinct().order_by('category_name')
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

        # Ensure password matches confirmation
        password = request.POST['password']
        confirmation = request.POST['confirmation']
        if password != confirmation:
            return render(request, 'register.html', {
                'message': 'Passwords must match.',
                'title': 'Register',
                'categories': Category.objects.all()
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, 'register.html', {
                'message': 'Username already taken.',
                'title': 'Register',
                'categories': Category.objects.all()
            })
        login(request, user)
        return HttpResponseRedirect(reverse('index'))
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
        image_form = ImageFormSet(request.POST, request.FILES, queryset=Image.objects.none())

        if auction_form.is_valid() and image_form.is_valid():
            new_auction = auction_form.save(commit=False)
            new_auction.creator = request.user
            new_auction.save()

            for form in image_form.cleaned_data:
                if form:
                    image = form['image']
                    new_image = Image(auction=new_auction, image=image)
                    new_image.save()

            return redirect('active_auctions_view')

    else:
        auction_form = AuctionForm()
        image_form = ImageFormSet(queryset=Image.objects.none())

    return render(request, 'auction_create.html', {
        'categories': Category.objects.all(),
        'auction_form': auction_form,
        'image_form': image_form,
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


def active_auctions_view(request):
    """
    It renders a page that displays all of
    the currently active auction listings
    Active auctions are paginated: 10 per page
    """
    category_name = request.GET.get('category_name', None)
    time_filter = request.GET.get('time_filter', None)
    sort_by = request.GET.get('sort_by', None)

    auctions = Auction.objects.filter(active=True)

    if category_name is not None:
        auctions = auctions.filter(category__category_name=category_name)

    if time_filter:
        now = timezone.now()
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

    if sort_by:
        if sort_by == 'ending_soonest':
            auctions = auctions.order_by('date_created')
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
        'auctions': auctions,
        'bid_form': BidForm(),
        'auctions_count': auctions.count(),
        'pages': pages,
        'title': 'Active Auctions'
    })


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
        'comments': auction.get_comments.all(),
        'comment_form': CommentForm(),
        'title': 'Auction'
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

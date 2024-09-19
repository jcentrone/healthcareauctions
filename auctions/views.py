import io
import json
import logging
import random
import re
from datetime import timedelta, datetime
from decimal import Decimal

import openpyxl
from django import forms
from django.contrib import messages
from django.contrib.auth import authenticate, logout, login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth.views import PasswordChangeView
from django.contrib.messages import get_messages
from django.core.exceptions import ValidationError
from django.core.mail import EmailMessage
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db import IntegrityError, transaction
from django.db.models import Q, Case, When, BooleanField, DecimalField, Max, F, OuterRef, Subquery
from django.forms import model_to_dict
from django.http import FileResponse, HttpResponse, JsonResponse, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404, redirect
from django.template.loader import render_to_string
from django.urls import reverse_lazy, reverse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from xhtml2pdf import pisa

from config.storage_backends import W9Storage, ResellerCertificateStorage
from .forms import AuctionForm, ImageForm, CommentForm, BidForm, AddToCartForm, MessageForm, \
    ShippingMethodForm, ShippingAddressForm, BillingAddressForm, CreditCardForm, ACHForm, ZelleForm, VenmoForm, \
    PayPalForm, CashAppForm, CustomUserChangeForm, UserAddressForm, OrderNoteForm, EditAuctionForm, \
    EditProductDetailFormSet, ShippingAccountsForm, RegistrationForm, ProductDetailForm
from .models import Bid, Category, Image, CartItem, Cart, ProductDetail, Order, Payment, \
    OrderItem, Parcel, ProductImage, ShippingAccounts, Address, Message, User, MedicalSpecialty
from .utils.calculate_tax import get_sales_tax
from .utils.email_manager import send_welcome_email_html, order_confirmation_message
from .utils.get_base64_logo import get_logo_base64
from .utils.helpers import update_categories_from_fda
from .utils.openai import get_chat_completion_request
from .utils.scrape import scrape_images
from .utils.ups import track_parcel

# Set up logging
logger = logging.getLogger(__name__)

from django.db.models import Count
from .models import Auction, AuctionView


class CustomPasswordChangeView(PasswordChangeView):
    template_name = 'registration/password_change_form.html'
    success_url = reverse_lazy('dashboard')

    def get_success_url(self):
        messages.success(self.request, 'Your password has been successfully changed.')
        return f"{reverse_lazy('dashboard')}?active_tab=settings&sub_nav=password"


def index(request):
    """
    The default route which renders the home page
    """
    watchlist, cart_count = None, None

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
    remaining_categories = categories_with_auctions.exclude(id=random_category1.id)
    random_category2 = random.choice(remaining_categories)

    # Get up to 8 auctions from each of the random categories
    auctions_cat1 = Auction.objects.filter(category=random_category1, active=True)[:8]
    auctions_cat2 = Auction.objects.filter(category=random_category2, active=True)[:8]

    recent_views = Auction.objects.none()

    def add_images_to_auctions(auctions):
        for auction in auctions:
            auction.image = auction.get_image()
        return auctions

    # Determine if the user is watching each auction
    if request.user.is_authenticated:
        watchlist = request.user.watchlist.all()
        watchlist = add_images_to_auctions(watchlist)
        watchlist_ids = watchlist.values_list('id', flat=True)
        recent_views = AuctionView.objects.filter(user=request.user, auction__active=True).order_by('auction__id',
                                                                                                    '-viewed_at').distinct(
            'auction__id')[:8]

        auctions_cat1 = auctions_cat1.annotate(
            is_watched=Case(
                When(id__in=watchlist_ids, then=True),
                default=False,
                output_field=BooleanField()
            )
        )

        auctions_cat2 = auctions_cat2.annotate(
            is_watched=Case(
                When(id__in=watchlist_ids, then=True),
                default=False,
                output_field=BooleanField()
            )
        )

        recent_views = recent_views.annotate(
            is_watched=Case(
                When(auction__id__in=watchlist_ids, then=True),
                default=False,
                output_field=BooleanField()
            )
        )

        auctions_cat1 = add_images_to_auctions(auctions_cat1)
        auctions_cat2 = add_images_to_auctions(auctions_cat2)
    else:
        auctions_cat1 = add_images_to_auctions(auctions_cat1)
        auctions_cat2 = add_images_to_auctions(auctions_cat2)
        categories_with_auctions = categories_with_auctions
        print(categories_with_auctions)

    return render(request, 'index.html', {
        'categories': categories_with_auctions,
        'auctions_cat1': auctions_cat1,
        'auctions_cat1_name': random_category1,
        'auctions_cat2': auctions_cat2,
        'auctions_cat2_name': random_category2,
        'title': 'Home',
        'watchlist': watchlist,
        'recent_views': recent_views,
    })


@require_POST
@login_required
def save_all_forms(request):
    user = request.user

    # Initialize all forms
    settings_form = CustomUserChangeForm(request.POST, request.FILES, instance=user)
    billing_data = {
        'billing-street': request.POST.getlist('street')[0],
        'billing-suite': request.POST.getlist('suite')[0],
        'billing-city': request.POST.getlist('city')[0],
        'billing-state': request.POST.getlist('state')[0],
        'billing-zip_code': request.POST.getlist('zip_code')[0],
        'billing-country': request.POST.getlist('country')[0],
        'billing-address_type': 'billing',
    }
    billing_form = UserAddressForm(billing_data, prefix='billing',
                                   instance=user.addresses.filter(address_type='billing').first())

    shipping_data = {
        'shipping-street': request.POST.getlist('street')[1],
        'shipping-suite': request.POST.getlist('suite')[1],
        'shipping-city': request.POST.getlist('city')[1],
        'shipping-state': request.POST.getlist('state')[1],
        'shipping-zip_code': request.POST.getlist('zip_code')[1],
        'shipping-country': request.POST.getlist('country')[1],
        'shipping-address_type': 'shipping',
    }
    shipping_form = UserAddressForm(shipping_data, prefix='shipping',
                                    instance=user.addresses.filter(address_type='shipping').first())

    shipping_account_instance = ShippingAccounts.objects.filter(user=user).first()
    shipping_account_form = ShippingAccountsForm(request.POST, instance=shipping_account_instance)

    # Validate all forms
    user_forms = {
        'settings_form': settings_form,
        'billing_form': billing_form,
        'shipping_form': shipping_form,
        'shipping_account_form': shipping_account_form,
    }
    errors = {}

    for form_name, form in user_forms.items():
        if not form.is_valid():
            errors[form_name] = form.errors

    if errors:
        return JsonResponse({'status': 'error', 'errors': errors})

    # Save all forms if they are valid
    settings_form.save()
    billing_form.save()
    shipping_form.save()
    shipping_account = shipping_account_form.save(commit=False)
    shipping_account.user = user
    shipping_account.save()

    return JsonResponse({'status': 'success', 'message': 'Your preferences have been updated.'})


@login_required
def dashboard(request):
    """
    The default route which renders a Dashboard page
    """

    # Variables
    auction_durations = [1, 3, 5, 7, 10]

    user = request.user
    # Initialize the filters dictionary
    listing_filters = Q(creator=user)
    order_filters = Q(user=user)
    sales_filters = Q(user=user)
    # bid_filters = Q(creator=user)

    # Get filtering parameters for each tab
    order_status_filter = request.GET.get('order_status')
    order_date_filter = request.GET.get('order_date')
    sales_status_filter = request.GET.get('sales_status')
    sales_date_filter = request.GET.get('sales_date')
    listing_status_filter = request.GET.get('listing_status')
    listing_type_filter = request.GET.get('listing_type')
    listing_date_filter = request.GET.get('listing_date')
    bid_status_filter = request.GET.get('bid_status')
    hold_for_import = request.GET.get('hold_for_import', 'False').lower() == 'true'
    active_tab = request.GET.get('active_tab', 'orders')

    # Listings Filter, add filters to the dictionary based on the parameters
    if listing_status_filter:
        listing_filters &= Q(active=(listing_status_filter == 'active'))

    if listing_type_filter:
        listing_filters &= Q(auction_type=listing_type_filter)

    if listing_date_filter:
        listing_filters &= Q(date_created__date=listing_date_filter)

    if hold_for_import:
        listing_filters &= Q(hold_for_import=True)

    # Apply the filters in one query
    listings = Auction.objects.filter(listing_filters).order_by('-date_created')

    # Add  edit forms to the listings
    for listing in listings:
        listing.edit_form = EditAuctionForm(instance=listing)
        listing.edit_form.product_detail = EditProductDetailFormSet(instance=listing)

    # Listing Count
    listing_count = listings.count()

    # Orders Filter, add filters to the dictionary based on the parameters
    if order_status_filter:
        order_filters &= Q(status=order_status_filter)
        order_status = order_status_filter
    else:
        order_status = 'All'

    if order_date_filter:
        order_filters &= Q(created_at__date=order_date_filter)

    # Apply the filters in one query
    orders = Order.objects.filter(order_filters).order_by('-created_at')

    # Sales Filter, add filters to the dictionary based on the parameters
    if sales_status_filter:
        sales_filters &= Q(status=sales_status_filter)
        sales_status = sales_status_filter
    else:
        sales_status = 'All'
    if sales_date_filter:
        sales_filters = Q(created_at__date=sales_date_filter)

    # Apply the filters in one query
    sales = Order.objects.filter(sales_filters).order_by('-created_at')

    # Bids Filter, add filters to the dictionary based on the parameters
    # Get the auctions with user bids
    bids = Bid.objects.filter(user=user)
    auctions_with_user_bids = Auction.objects.filter(
        bid__user=request.user,
        active=True
    ).annotate(
        highest_bid=Max('bid__amount'),
        user_highest_bid=Max(Case(
            When(bid__user=request.user, then='bid__amount'),
            output_field=DecimalField()
        )),
        user_is_highest_bidder=Case(
            When(user_highest_bid=F('highest_bid'), then=True),
            default=False,
            output_field=BooleanField()
        )
    ).distinct()

    if bid_status_filter:
        bid_status = bid_status_filter
        if bid_status_filter == 'highest':
            auctions_with_user_bids = auctions_with_user_bids.filter(user_is_highest_bidder=True)

        elif bid_status_filter == 'outbid':
            auctions_with_user_bids = auctions_with_user_bids.filter(user_is_highest_bidder=False)
    else:
        bid_status = 'All'

    # Count of all auctions the user has bid on
    total_auctions_with_user_bids_count = auctions_with_user_bids.count()

    # Get watchlist items
    watchlist = request.user.watchlist.all() if request.user.is_authenticated else Auction.objects.none()

    # Paginate each result set individually
    auction_page = request.GET.get('auction_page', 1)
    orders_page = request.GET.get('order_page', 1)
    sales_page = request.GET.get('sales_page', 1)
    listings_page = request.GET.get('listings_page', 1)

    auction_paginator = Paginator(auctions_with_user_bids, 5)
    orders_paginator = Paginator(orders, 5)
    sales_paginator = Paginator(sales, 5)
    listings_paginator = Paginator(listings, 5)

    try:
        auctions_with_user_bids = auction_paginator.page(auction_page)
    except PageNotAnInteger:
        auctions_with_user_bids = auction_paginator.page(1)
    except EmptyPage:
        auctions_with_user_bids = auction_paginator.page(auction_paginator.num_pages)

    try:
        orders = orders_paginator.page(orders_page)
    except PageNotAnInteger:
        orders = orders_paginator.page(1)
    except EmptyPage:
        orders = orders_paginator.page(orders_paginator.num_pages)

    try:
        sales = sales_paginator.page(sales_page)
    except PageNotAnInteger:
        sales = sales_paginator.page(1)
    except EmptyPage:
        sales = sales_paginator.page(sales_paginator.num_pages)

    try:
        listings = listings_paginator.page(listings_page)
    except PageNotAnInteger:
        listings = listings_paginator.page(1)
    except EmptyPage:
        listings = listings_paginator.page(listings_paginator.num_pages)

    # Handle loading the existing order notes and form
    note_forms = {}

    for order in orders:
        note_forms[order.id] = OrderNoteForm(initial={'order_note': order.order_note})
        order.auction.message_form = MessageForm(initial={'subject': f'Question about {order.auction.title}'})

    shipping_account_instance = ShippingAccounts.objects.filter(user=user).first()
    # shipping_account_form = ShippingAccountsForm(request.POST or None, instance=shipping_account_instance)

    billing_form = UserAddressForm(instance=user.addresses.filter(address_type='billing').first(),
                                   prefix='billing')
    shipping_form = UserAddressForm(instance=user.addresses.filter(address_type='shipping').first(),
                                    prefix='shipping')

    settings_form = CustomUserChangeForm(instance=request.user)
    password_form = PasswordChangeForm(user)
    shipping_account_form = ShippingAccountsForm(instance=shipping_account_instance)

    for field in password_form.fields.values():
        field.widget.attrs.update({'class': 'form-control'})

    return render(request, 'dashboard.html', {
        'categories': Category.objects.all(),
        'listings': listings,
        'listings_count': listing_count,
        'listing_status': listing_type_filter,
        'listing_type': listing_type_filter,
        'listing_date_filter': listing_date_filter,
        'auctions': auctions_with_user_bids,
        'auction_count': total_auctions_with_user_bids_count,
        'watchlist_count': watchlist.count(),
        'bids_count': bids.count(),
        'bid_status': bid_status,
        'orders': orders,
        'orders_count': orders_paginator.count,
        'order_status': order_status,
        'sales': sales,
        'sales_count': sales_paginator.count,
        'sales_status': sales_status,
        'active_tab': active_tab,
        'title': 'Dashboard',
        'settings_form': settings_form,
        'billing_form': billing_form,
        'shipping_form': shipping_form,
        'shipping_account_form': shipping_account_form,
        'password_form': password_form,
        'note_forms': note_forms,
        'sub_nav': 'user_details',
        'hold_for_import': hold_for_import,
        'auction_durations': auction_durations,

    })


@login_required
def edit_auction(request, auction_id):
    auction = get_object_or_404(Auction, id=auction_id)
    errors, formset_errors = None, None

    if request.method == 'POST':
        form = EditAuctionForm(request.POST, instance=auction)
        product_detail_formset = EditProductDetailFormSet(request.POST or None, instance=auction)

        if form.is_valid() and product_detail_formset.is_valid():
            form.save()
            product_detail_formset.save()
            messages.success(request, 'Auction and product details updated successfully.')
            success = True
        else:
            errors = form.errors.as_json()  # Convert form errors to JSON
            formset_errors = product_detail_formset.errors  # Get formset errors
            messages.error(request, 'Please correct the errors below.')
            messages.error(request, errors)
            messages.error(request, formset_errors)
            success = False

        # Collect Django messages to include in the JSON response
        storage = get_messages(request)
        response_messages = []
        for message in storage:
            response_messages.append({
                'message': message.message,
                'level': message.level,
                'tags': message.tags,
            })

        return JsonResponse({
            'success': success,
            'messages': response_messages,
            'form_errors': errors if not success else None,
            'formset_errors': formset_errors if not success else None,
        })

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


@login_required
def post_listing(request, auction_id):
    auction = get_object_or_404(Auction, id=auction_id)

    if request.method == 'POST':
        form = EditAuctionForm(request.POST, instance=auction)
        if form.is_valid():
            form.save()
            auction.hold_for_import = False
            auction.active = True
            auction.save()
            return JsonResponse({'success': True, 'message': 'Auction updated successfully.'})
        else:
            print(form.errors)
            return JsonResponse({'success': False, 'message': 'Please correct the errors below.'})

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})


def register(request):
    if request.method == 'POST':
        form = RegistrationForm(request.POST, request.FILES)

        if form.is_valid():
            username = form.cleaned_data['username']
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            company_name = form.cleaned_data['company_name']
            first_name = form.cleaned_data['first_name']
            last_name = form.cleaned_data['last_name']
            phone_number = form.cleaned_data['phone']

            billing_street = form.cleaned_data['billing_street']
            billing_street_2 = form.cleaned_data['billing_street_2']
            billing_city = form.cleaned_data['billing_city']
            billing_state = form.cleaned_data['billing_state']
            billing_zip = form.cleaned_data['billing_zip']
            billing_country = form.cleaned_data['billing_country']

            shipping_street = form.cleaned_data['shipping_street']
            shipping_street_2 = form.cleaned_data['shipping_street_2']
            shipping_city = form.cleaned_data['shipping_city']
            shipping_state = form.cleaned_data['shipping_state']
            shipping_zip = form.cleaned_data['shipping_zip']
            shipping_country = form.cleaned_data['shipping_country']

            company_w9 = form.cleaned_data['company_w9']
            reseller_certificate = form.cleaned_data['reseller_certificate']

            try:
                user = User.objects.create_user(username, email, password)
                user.company_name = company_name
                user.first_name = first_name
                user.last_name = last_name
                user.phone_number = phone_number

                if company_w9:
                    user.company_w9 = W9Storage().save(company_w9.name, company_w9)

                if reseller_certificate:
                    user.reseller_cert = ResellerCertificateStorage().save(reseller_certificate.name,
                                                                           reseller_certificate)

                # Save the user object to persist changes
                user.save()

                # Save billing address
                Address.objects.create(
                    user=user,
                    address_type='billing',
                    street=billing_street,
                    suite=shipping_street_2,
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
                    suite=billing_street_2,
                    city=shipping_city,
                    state=shipping_state,
                    zip_code=shipping_zip,
                    country=shipping_country
                )

                # Message Center Info
                Message.objects.create(
                    message_type='info',
                    subject='Message Center Guidelines',
                    body='Welcome to our message center, where you can communicate securely with other users and our customer service team. '
                         'Please keep in mind that our auctions are blind, so avoid sharing personal or company information during communication.',
                    sender=User.objects.get(username='CustomerService'),
                    recipient=user,
                )

                # Welcome Message
                Message.objects.create(
                    message_type='welcome',
                    subject='Welcome to Healthcare Auctions',
                    body=f'We’re thrilled to have you as part of our community! At Healthcare Auctions, we aim to make your experience as rewarding and enjoyable as possible. Whether you’re here to browse, bid, or sell, we’re here to support you every step of the way. '
                         f'\n\nDon’t hesitate to reach out to our team if you have any questions or need assistance getting started. Happy auctioning!',
                    sender=User.objects.get(username='CustomerService'),  # Assuming a system user
                    recipient=user,
                )

                # Welcome Email
                send_welcome_email_html(user.email, first_name)

            except IntegrityError:
                return render(request, 'register.html', {
                    'form': form,
                    'message': 'Username already taken.',
                    'title': 'Register',
                })

            login(request, user)
            return redirect(reverse('index'))
        else:
            print(form.errors)
            return render(request, 'register.html', {
                'form': form,
                'title': 'Register',
            })
    else:
        form = RegistrationForm()
        return render(request, 'register.html', {
            'form': form,
            'title': 'Register',
        })


def login_view(request):
    next_url = request.GET.get('next') or request.POST.get('next') or reverse('index')

    if request.method == 'POST':
        # Attempt to sign user in
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return redirect(next_url)
        else:
            return render(request, 'registration/login.html', {
                'message': 'Invalid username and/or password.',
                'title': 'Log in',
                'next': next_url,
            })
    else:
        return render(request, 'registration/login.html', {
            'title': 'Log in',
            'next': request.GET.get('next', ''),
        })


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse('index'))


@login_required
def auction_create(request):
    image_form_set = forms.modelformset_factory(Image, form=ImageForm, extra=5)
    product_detail_form_set = forms.modelformset_factory(ProductDetail, form=ProductDetailForm,
                                                         extra=1)  # Ensure this is defined

    if request.method == 'POST':
        auction_form = AuctionForm(request.POST, request.FILES)
        image_formset = image_form_set(request.POST, request.FILES, queryset=Image.objects.none(), prefix='images')
        product_detail_formset = product_detail_form_set(request.POST, request.FILES,
                                                         queryset=ProductDetail.objects.none(),
                                                         prefix='product_details')

        print("Product Detail Form Data: %s", product_detail_formset.data)
        print("Product Detail Formset Errors: %s", product_detail_formset.errors)

        if auction_form.is_valid() and image_formset.is_valid() and product_detail_formset.is_valid():
            new_auction = auction_form.save(commit=False)
            new_auction.creator = request.user
            new_auction.date_created = timezone.now()
            new_auction.active = True
            new_auction.save()

            print("Product Detail Form Data: %s", product_detail_formset.data)
            print("Product Detail Formset Errors: %s", product_detail_formset.errors)

            for form in image_formset.cleaned_data:
                if form:
                    image = form['image']
                    new_image = Image(auction=new_auction, image=image)
                    new_image.save()

            for form in product_detail_formset.forms:
                if form.cleaned_data.get('sku'):  # Ensure the SKU field is filled
                    product_detail = form.save(commit=False)
                    product_detail.auction = new_auction
                    product_detail.save()

            # Redirect URL
            redirect_url = reverse('active_auctions_with_id', kwargs={'auction_id': new_auction.id})
            return JsonResponse({'success': True, 'auction_id': new_auction.id, 'redirect_url': redirect_url})
        else:
            print("Auction Form Errors: %s", auction_form.errors)
            print("Image Formset Errors: %s", image_formset.errors)
            print("Product Detail Formset Errors: %s", product_detail_formset.errors)
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
            if not product_detail_formset.is_valid():
                for form in product_detail_formset.forms:
                    if form.errors:
                        for field, error in form.errors.items():
                            errors.append({'field': f'{form.prefix}-{field}', 'message': error[0]})
                logger.error(f'Product detail form errors: {product_detail_formset.errors}')
            return JsonResponse({'success': False, 'errors': errors})
    else:
        auction_form = AuctionForm()
        image_formset = image_form_set(queryset=Image.objects.none(), prefix='images')
        product_detail_formset = product_detail_form_set(queryset=ProductDetail.objects.none(),
                                                         prefix='product_details')

    return render(request, 'auction_create.html', {
        'auction_form': auction_form,
        'image_formset': image_formset,
        'product_detail_formset': product_detail_formset,
        'title': 'Create Listing',
    })



@login_required
@csrf_exempt
def import_excel(request):
    if request.method == 'POST':
        print(request.POST)
        try:
            with transaction.atomic():
                auction_data_raw = request.POST.get('auction_data', '[]')
                auction_data = json.loads(auction_data_raw)

                for index, auction_info in enumerate(auction_data):
                    logger.debug(f"Processing auction {index + 1}: {auction_info}")

                    # Convert auction_duration from string to integer
                    try:
                        auction_duration = int(auction_info['auction_duration'])
                        logger.debug(f"Auction duration for auction {index + 1}: {auction_duration} days")
                    except ValueError:
                        return JsonResponse({
                            'status': 'error',
                            'message': f"Invalid auction_duration value: {auction_info['auction_duration']}"
                        })

                    # Convert other numerical fields
                    try:
                        quantity_available = int(auction_info.get('quantity_available', 1)) if auction_info.get('quantity_available') else 1
                    except ValueError:
                        return JsonResponse({
                            'status': 'error',
                            'message': f"Invalid quantity_available value: {auction_info.get('quantity_available')}"
                        })

                    try:
                        starting_bid = float(auction_info['starting_bid']) if auction_info.get('starting_bid') else None
                    except ValueError:
                        return JsonResponse({
                            'status': 'error',
                            'message': f"Invalid starting_bid value: {auction_info.get('starting_bid')}"
                        })

                    try:
                        reserve_bid = float(auction_info['reserve_bid']) if auction_info.get('reserve_bid') else None
                    except ValueError:
                        return JsonResponse({
                            'status': 'error',
                            'message': f"Invalid reserve_bid value: {auction_info.get('reserve_bid')}"
                        })

                    try:
                        buy_it_now_price = float(auction_info['buyItNowPrice']) if auction_info.get('buyItNowPrice') else None
                    except ValueError:
                        return JsonResponse({
                            'status': 'error',
                            'message': f"Invalid buyItNowPrice value: {auction_info.get('buyItNowPrice')}"
                        })

                    device_data = {
                        'medical_specialty_description': auction_info.get('medicalSpecialtyDescription'),
                        'medical_specialty_code': auction_info.get('medicalSpecialtyCode'),
                        'device_name': auction_info.get('deviceName'),
                    }

                    category = update_categories_from_fda(device_data)
                    category_obj = Category.objects.get(id=category['value'])


                    # Create the Auction object
                    auction = Auction.objects.create(
                        title=auction_info['title'],
                        description=auction_info['description'],
                        creator=request.user,
                        category=category_obj,
                        quantity_available=quantity_available,
                        starting_bid=starting_bid,
                        reserve_bid=reserve_bid,
                        buyItNowPrice=buy_it_now_price,
                        manufacturer=auction_info['manufacturer'],
                        auction_type=auction_info['auction_type'],
                        implantable=auction_info['implantable'],
                        deviceSterile=auction_info['deviceSterile'],
                        package_type=auction_info['package_type'],
                        auction_duration=auction_duration,
                        hold_for_import=True,  # Mark as held for import
                        active=False,

                    )

                    # Save the auction to trigger the save method (sets auction_ending_date)
                    auction.save()

                    # Clean the reference number by removing leading zeros
                    auction_reference_number = auction_info.get('reference_number', '').lstrip('0')

                    # Parse production_date and expiration_date
                    def parse_date(date_str, field_name):
                        if date_str:
                            try:
                                return datetime.strptime(date_str, '%Y-%m-%d').date()
                            except ValueError:
                                raise ValueError(f"Invalid {field_name} format: {date_str}. Expected YYYY-MM-DD.")
                        return None

                    production_date_str = auction_info.get('production_date', '').strip()
                    expiration_date_str = auction_info.get('expiration_date', '').strip()

                    try:
                        production_date = parse_date(production_date_str, 'production_date') if production_date_str else None
                        expiration_date = parse_date(expiration_date_str, 'expiration_date') if expiration_date_str else None
                    except ValueError as ve:
                        return JsonResponse({
                            'status': 'error',
                            'message': str(ve)
                        })

                    # Create product details with parsed dates
                    ProductDetail.objects.create(
                        auction=auction,
                        sku=auction_info.get('sku'),
                        reference_number=auction_reference_number,
                        lot_number=auction_info.get('lot_number'),
                        production_date=production_date,       # Use parsed date
                        expiration_date=expiration_date        # Use parsed date
                    )

                    # Check if there is an image with the matching reference number
                    if auction_reference_number:
                        try:
                            # Look for a product image with the matching reference number
                            product_image = ProductImage.objects.get(reference_number__iexact=auction_reference_number)
                            # Create an image associated with the auction
                            Image.objects.create(auction=auction, image=product_image.image)
                        except ProductImage.DoesNotExist:
                            # No matching product image found, do nothing
                            pass

                    # Handle the uploaded images
                    for key in request.FILES:
                        logger.debug(f"Processing file key: {key}")
                        match = re.match(r'images_(\d+)_\d+', key)
                        if match:
                            row_index = int(match.group(1))
                            current_auction_info = auction_data[row_index]

                            # Save the image
                            Image.objects.create(auction=auction, image=request.FILES[key])

                # After processing all auctions, return success
                return JsonResponse({'status': 'success'})

        except Exception as e:
            # Handle exceptions
            logger.exception("An error occurred during import_excel")
            return JsonResponse({'status': 'error', 'message': str(e)})

    # If not a POST request, render the import form
    return render(request, 'import.html', {
        'categories': Category.objects.all(),
        'title': 'Create Auction',
    })


def active_auctions_view(request, auction_id=None):
    """
    Renders a page that displays all the currently active auction listings.
    Active auctions are paginated: 10 per page.
    """

    # Get request parameters
    category_name = request.GET.get('category_name')
    time_filter = request.GET.get('time_filter')
    sort_by = request.GET.get('sort_by')
    manufacturer_filter = request.GET.get('mfg_filter')
    expired_filter = request.GET.get('expired_filter')
    my_auctions = request.GET.get('my_auctions')
    search_query = request.GET.get('search_query')
    auction_type = request.GET.get('auction_type')
    watchlist_filter = request.GET.get('watchlist')
    recent_views_filter = request.GET.get('recent_views')
    page = request.GET.get('page', 1)
    specialty = request.GET.get('specialty')  # **New parameter**

    # Base QuerySet
    auctions = Auction.objects.filter(active=True)

    # Handle specific auction display
    specific_auction = None
    if auction_id:
        try:
            specific_auction = Auction.objects.get(id=auction_id, active=True)
            specific_auction.image = specific_auction.get_images.first()
            if request.user.is_authenticated:
                specific_auction.is_watched = request.user in specific_auction.watchers.all()
            auctions = auctions.exclude(id=auction_id)  # Exclude the specific auction from the queryset
        except Auction.DoesNotExist:
            pass

    # Apply filters
    if auction_type:
        auctions = auctions.filter(auction_type=auction_type)

    if recent_views_filter and request.user.is_authenticated:
        recent_views = AuctionView.objects.filter(user=request.user).order_by('-viewed_at').values_list('auction', flat=True)
        auctions = auctions.filter(id__in=recent_views)

    if my_auctions and request.user.is_authenticated:
        auctions = auctions.filter(creator=request.user)

    if watchlist_filter and request.user.is_authenticated:
        auctions = request.user.watchlist.all()

    if category_name:
        auctions = auctions.filter(category__category_name=category_name)

    if expired_filter:
        today = timezone.now().date()
        if expired_filter == 'expired':
            auctions = auctions.filter(product_details__expiration_date__lt=today)
        elif expired_filter == 'not_expired':
            auctions = auctions.filter(product_details__expiration_date__gte=today)

    # **Apply specialty filter**
    if specialty:
        # Strip any leading/trailing whitespace
        specialty = specialty.strip()
        # Filter auctions where the category's medical specialty description matches the given specialty
        auctions = auctions.filter(
            category__medical_specialty__description__iexact=specialty
        )

    # Apply time filters using a dictionary mapping
    time_deltas = {
        'today': timedelta(days=1),
        'tomorrow': timedelta(days=2),
        'next_3_days': timedelta(days=3),
        'next_5_days': timedelta(days=5),
        'next_7_days': timedelta(days=7),
        'next_10_days': timedelta(days=10),
    }
    if time_filter in time_deltas:
        end_date = timezone.now() + time_deltas[time_filter]
        auctions = auctions.filter(date_created__lte=end_date)

    # Apply sort options
    sort_options = {
        'ending_soonest': 'auction_ending_date',
        'newly_listed': '-date_created',
        'price_highest': '-starting_bid',
        'price_lowest': 'starting_bid',
        'fewest_bids': 'bid_count',
        'most_bids': '-bid_count',
    }
    if sort_by in sort_options:
        if 'bids' in sort_by:
            auctions = auctions.annotate(bid_count=Count('bid')).order_by(sort_options[sort_by])
        else:
            auctions = auctions.order_by(sort_options[sort_by])

    if manufacturer_filter:
        auctions = auctions.filter(manufacturer=manufacturer_filter)

    if search_query:
        auctions = auctions.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(product_name__icontains=search_query) |
            Q(gmdnPTDefinition__icontains=search_query) |
            Q(manufacturer__icontains=search_query) |
            Q(product_details__reference_number__icontains=search_query) |
            Q(product_details__sku__icontains=search_query) |
            Q(product_details__lot_number__icontains=search_query)
        )

    # Annotate auctions with highest bid amount and highest bidder ID
    highest_bid_subquery = Bid.objects.filter(
        auction=OuterRef('pk')
    ).order_by('-amount')

    auctions = auctions.annotate(
        highest_bid_amount=Subquery(highest_bid_subquery.values('amount')[:1]),
        highest_bid_bidder_id=Subquery(highest_bid_subquery.values('user_id')[:1])
    )


    # Add additional fields to auctions
    for auction in auctions:
        auction.image = auction.get_images.first()
        if request.user.is_authenticated:
            auction.is_watched = request.user in auction.watchers.all()
            auction.message_form = MessageForm(initial={'subject': f'Question about {auction.title}'})
            auction.is_user_highest_bidder = (auction.highest_bid_bidder_id == request.user.id)

    # Pagination
    paginator = Paginator(auctions, 10)
    try:
        pages = paginator.page(page)
    except PageNotAnInteger:
        pages = paginator.page(1)
    except EmptyPage:
        pages = paginator.page(paginator.num_pages)

    # If on the first page, prepend the specific auction
    auctions_list = list(pages.object_list)
    if specific_auction:
        auctions_list = [specific_auction] + auctions_list

    # Context for the template
    context = {
        'auctions': auctions_list,
        'search_query': search_query,
        'bid_form': BidForm(),
        'add_to_cart_form': AddToCartForm(),
        'auctions_count': auctions.count(),
        'category_name': category_name,
        'pages': pages,
        'title': 'Active Auctions',
        'unique_manufacturers': sorted(set(auctions.values_list('manufacturer', flat=True))),
        'time_filter': time_filter,
        'sort_by': sort_by,
        'manufacturer_filter': manufacturer_filter,
        'my_auctions': my_auctions,
        'expired_filter': expired_filter,
        'auction_type': auction_type,
        'specialty': specialty,  # **Add specialty to context**
        'recent_views': recent_views_filter,
    }

    # Add authenticated-specific context
    if request.user.is_authenticated:
        context['has_active_auctions'] = Auction.objects.filter(creator=request.user, active=True).exists()

    return render(request, 'auctions_active.html', context)


def get_auction_images(request, auction_id):
    auction = get_object_or_404(Auction, id=auction_id)
    images = auction.get_images.all()
    image_urls = [image.image.url for image in images]
    return JsonResponse({'image_urls': image_urls})


@login_required
def get_default_image(request):
    reference_number = request.GET.get('reference_number')

    if reference_number:
        try:
            # Look for a product image with the matching reference number
            product_image = ProductImage.objects.get(reference_number__iexact=reference_number)
            image_url = product_image.image.url  # Get the URL of the image
            return JsonResponse({'image_url': image_url})
        except ProductImage.DoesNotExist:
            # No matching product image found
            return JsonResponse({'image_url': None})
    return JsonResponse({'image_url': None})


@login_required
def get_default_image_blob(request):
    reference_number = request.GET.get('reference_number')

    if reference_number:
        try:
            # Retrieve the product image with case-insensitive matching
            product_image = get_object_or_404(ProductImage, reference_number__iexact=reference_number)

            # Open the image file
            with product_image.image.open('rb') as img_file:
                # Return the image as a binary blob
                return HttpResponse(img_file.read(), content_type="image/jpeg")

        except ProductImage.DoesNotExist:
            # No matching product image found
            return HttpResponse(status=404)

    # If reference_number is not provided or image not found
    return HttpResponse(status=400)


def get_auction_product_details(request, auction_id):
    auction = get_object_or_404(Auction, id=auction_id)
    product_details = auction.product_details.all()

    # Convert product details to a list of dictionaries
    product_details_list = list(product_details.values())

    return JsonResponse({
        'product_details': product_details_list,
        'contains_expired_items': auction.contains_expired_items(),
    })


@login_required
def watchlist_view(request):
    """
    It renders a page that displays all
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


# Should be able to remove
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

    if reverse_method == 'active_auctions_with_id':
        return HttpResponseRedirect(reverse('active_auctions_with_id', kwargs={'auction_id': auction_id}))
    else:
        return HttpResponseRedirect(reverse(reverse_method))


def privacy_policy(request):
    return render(request, 'privacy_policy.html', {
        'categories': Category.objects.all(),
        'title': 'Privacy Policy'
    })


def terms_and_conditions(request):
    return render(request, 'terms_and_conditions.html', {
        'categories': Category.objects.all(),
        'title': 'Terms and Conditions'
    })


@login_required
def auction_bid(request, auction_id):
    """
    It allows the signed-in users to bid on the item.
    """
    auction = get_object_or_404(Auction, id=auction_id)
    amount = Decimal(request.POST['amount'])

    if amount >= auction.starting_bid and (auction.current_bid is None or amount > auction.current_bid):
        auction.current_bid = amount
        form = BidForm(request.POST)
        new_bid = form.save(commit=False)
        new_bid.auction = auction
        new_bid.user = request.user
        new_bid.save()
        auction.save()

        # Add a success message
        messages.success(request, 'Your bid was placed successfully!')

        return HttpResponseRedirect(reverse('active_auctions_view'))
    else:
        # Add an error message
        messages.error(request, 'Your bid must be higher than the current bid and starting bid.')

        return redirect('active_auctions_view')


@login_required
def auction_close(request, auction_id):
    """
    It allows the signed-in user who created the listing
    to “close” the auction, and makes the listing no longer active
    """
    auction = Auction.objects.get(id=auction_id)

    if request.user == auction.creator:
        auction.active = False
        auction.save()

        messages.success(request, 'Auction successfully closed. The highest bidder is now the winner.')
        return HttpResponseRedirect(f"{reverse('dashboard')}?active_tab=listings")


@login_required
def auction_relist(request, auction_id):
    # Get the existing auction object
    original_auction = get_object_or_404(Auction, id=auction_id)

    # Ensure the user is the creator of the auction
    if request.user != original_auction.creator:
        messages.error(request, "You are not authorized to relist this auction.")
        return redirect('dashboard')  # Redirect to dashboard or another appropriate view

    # Duplicate the auction object
    new_auction = Auction.objects.create(
        title=original_auction.title,
        description=original_auction.description,
        creator=original_auction.creator,
        category=original_auction.category,
        quantity_available=original_auction.quantity_available,
        starting_bid=original_auction.starting_bid,
        reserve_bid=original_auction.reserve_bid,
        buyItNowPrice=original_auction.buyItNowPrice,
        product_name=original_auction.product_name,
        package_quantity=original_auction.package_quantity,
        partial_quantity=original_auction.partial_quantity,
        manufacturer=original_auction.manufacturer,
        auction_type=original_auction.auction_type,
        gmdnPTDefinition=original_auction.gmdnPTDefinition,
        implantable=original_auction.implantable,
        deviceSterile=original_auction.deviceSterile,
        sterilizationPriorToUse=original_auction.sterilizationPriorToUse,
        package_type=original_auction.package_type,
        sell_full_lot=original_auction.sell_full_lot,
        auction_duration=original_auction.auction_duration,
        fullPackage=original_auction.fullPackage,
        active=True,  # Set the new auction as active
    )

    # Duplicate associated product details
    for product_detail in original_auction.product_details.all():
        ProductDetail.objects.create(
            auction=new_auction,
            sku=product_detail.sku,
            reference_number=product_detail.reference_number,
            lot_number=product_detail.lot_number,
            production_date=product_detail.production_date,
            expiration_date=product_detail.expiration_date,
        )

    # Duplicate associated images
    for image in original_auction.get_images.all():
        Image.objects.create(
            auction=new_auction,
            image=image.image,
        )

    messages.success(request, "Auction has been successfully relisted.")

    # Redirect to the new auction's details page or another appropriate view
    return redirect('dashboard')


@login_required
def auction_comment(request, auction_id):
    """
    It allows the signed-in users to add comments to the listing page
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
    displays all the active listings in that category
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
            # print(device_data)
            category = update_categories_from_fda(device_data)
            print(category)
            return JsonResponse({'category': category}, status=201)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
def download_excel(request):
    filepath = 'static/downloads/sample.xlsx'
    response = FileResponse(open(filepath, 'rb'), as_attachment=True, filename='sample.xlsx')
    return response


@login_required
def scrape(request):
    scrape_images('https://xs-supply.com/collections/all-surgical-products?view=boost-pfs-original')
    scrape_images('https://xs-supply.com/collections/all-surgical-products?page=2&view=boost-pfs-original')
    scrape_images('https://xs-supply.com/collections/all-surgical-products?page=3&view=boost-pfs-original')
    scrape_images('https://xs-supply.com/collections/all-surgical-products?page=4&view=boost-pfs-original')
    scrape_images('https://xs-supply.com/collections/all-surgical-products?page=5&view=boost-pfs-original')
    scrape_images('https://xs-supply.com/collections/all-surgical-products?page=6&view=boost-pfs-original')
    scrape_images('https://xs-supply.com/collections/all-surgical-products?page=7&view=boost-pfs-original')
    scrape_images('https://xs-supply.com/collections/all-surgical-products?page=8&view=boost-pfs-original')
    scrape_images('https://xs-supply.com/collections/all-surgical-products?page=9&view=boost-pfs-original')
    scrape_images('https://xs-supply.com/collections/all-surgical-products?page=10&view=boost-pfs-original')
    scrape_images('https://xs-supply.com/collections/all-surgical-products?page=11&view=boost-pfs-original')

    messages.success(request, 'Scraping process completed successfully!')
    return redirect('index')


@login_required
def export_listings_to_excel(request):
    # Query for the listings that match the criteria
    listings = Auction.objects.filter(
        active=True,
        hold_for_import=False,
    )

    # Create an in-memory workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Active Listings"

    # Create the header row
    headers = [
        'Title', 'Description', 'Category', 'Quantity Available',
        'Starting Bid', 'Reserve Bid', 'Buy It Now Price', 'Manufacturer',
        'Auction Type', 'Implantable', 'Device Sterile', 'Package Type',
        'SKU', 'Reference Number', 'Lot Number', 'Production Date', 'Expiration Date'
    ]
    ws.append(headers)

    # Populate the rows with listing data
    for listing in listings:
        product_details = listing.product_details.all()
        for detail in product_details:
            row = [
                listing.title,
                listing.description,
                listing.category.category_name,
                listing.quantity_available,
                listing.starting_bid,
                listing.reserve_bid,
                listing.buyItNowPrice,
                listing.manufacturer,
                listing.auction_type,
                'Yes' if listing.implantable else 'No',
                'Yes' if listing.deviceSterile else 'No',
                listing.package_type,
                detail.sku,
                detail.reference_number,
                detail.lot_number,
                detail.production_date,
                detail.expiration_date
            ]
            ws.append(row)

    # Set the response headers for file download
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=active_listings.xlsx'

    # Save the workbook to the response
    wb.save(response)
    return response


# ORDER MANAGEMENT
@login_required
def checkout(request):
    cart = request.user.cart

    # Populate initial data from the user profile
    initial_data = {
        'email': request.user.email,
        'phone_number': request.user.phone_number,
    }

    # Retrieve default addresses
    default_shipping_address = request.user.addresses.filter(address_type='shipping').first()
    default_billing_address = request.user.addresses.filter(address_type='billing').first()

    if default_shipping_address:
        initial_data.update({
            'shipping_full_name': f"{request.user.first_name} {request.user.last_name}",
            'shipping_company_name': request.user.company_name,
            'shipping_street_address': default_shipping_address.street,
            'shipping_apartment_suite': default_shipping_address.suite,
            'shipping_city': default_shipping_address.city,
            'shipping_state': default_shipping_address.state,
            'shipping_zip_code': default_shipping_address.zip_code,
            'shipping_country': default_shipping_address.country,  # Made dynamic
        })

    if default_billing_address:
        initial_data.update({
            'billing_full_name': f"{request.user.first_name} {request.user.last_name}",
            'billing_company_name': request.user.company_name,
            'billing_street_address': default_billing_address.street,
            'billing_apartment_suite': default_billing_address.suite,
            'billing_city': default_billing_address.city,
            'billing_state': default_billing_address.state,
            'billing_zip_code': default_billing_address.zip_code,
            'billing_country': default_billing_address.country,  # Made dynamic
        })

    # Calculate Taxes
    if default_shipping_address:
        zip_code = default_shipping_address.zip_code
        state = default_shipping_address.state
        city = default_shipping_address.city
    else:
        zip_code = ''
        state = ''
        city = ''

    tax_info = get_sales_tax(zip_code, state, city)

    combined_sales_tax_rate = Decimal('0.00')
    sales_tax_no_shipping = Decimal('0.00')
    total_no_shipping = Decimal('0.00')
    if "error" not in tax_info:
        combined_sales_tax_rate = (
                Decimal(tax_info.get('stateSalesTax', 0)) +
                Decimal(tax_info.get('countySalesTax', 0)) +
                Decimal(tax_info.get('citySalesTax', 0)) +
                Decimal(tax_info.get('districtSalesTax', 0))
        )
        sales_tax_no_shipping = (combined_sales_tax_rate * cart.total_cost()).quantize(Decimal('0.01'))
        total_no_shipping = (cart.total_cost() + sales_tax_no_shipping).quantize(Decimal('0.01'))
        logger.debug(f"Sales Tax Calculated: {sales_tax_no_shipping}")
    else:
        logger.error(f"Tax Calculation Error: {tax_info.get('error')}")

    # Check if user is tax-exempt
    tax_exempt = request.user.is_tax_exempt()

    # Initialize forms
    credit_card_form = CreditCardForm(request.POST or None)
    ach_form = ACHForm(request.POST or None)
    zelle_form = ZelleForm(request.POST or None)
    venmo_form = VenmoForm(request.POST or None)
    paypal_form = PayPalForm(request.POST or None)
    cashapp_form = CashAppForm(request.POST or None)

    # Retrieve the default shipping account
    default_shipping_account = request.user.get_default_shipping_account()
    shipping_accounts_form = ShippingAccountsForm(request.POST or None, instance=default_shipping_account)
    shipping_method_form = ShippingMethodForm(request.POST or None, initial=initial_data)

    if request.method == 'POST':
        with transaction.atomic():
            # Lock the cart and related auction items
            cart = (
                Cart.objects
                .select_related('user')  # Adjust based on your actual relations
                .prefetch_related(
                    'items__auction')  # Use prefetch_related for ManyToMany or reverse ForeignKey relations
                .select_for_update()
                .get(user=request.user)
            )

            # Pre-fetch all auctions to minimize database hits
            auction_ids = cart.items.values_list('auction_id', flat=True)
            auctions = Auction.objects.select_for_update().filter(id__in=auction_ids)
            auction_map = {auction.id: auction for auction in auctions}

            # Check availability for each item
            for item in cart.items.all():
                auction = auction_map.get(item.auction_id)
                if not auction:
                    logger.warning(f"Auction with ID {item.auction_id} not found.")
                    return JsonResponse({
                        'status': 'error',
                        'message': f'Item "{item.auction.title}" not found.'
                    })

                if auction.auction_type != 'Sale':
                    continue  # Only check for 'Sale' type auctions

                if auction.quantity_available < item.quantity:
                    logger.info(
                        f'Insufficient stock for Auction "{auction.title}". '
                        f'Available: {auction.quantity_available}, Requested: {item.quantity}'
                    )
                    return JsonResponse({
                        'status': 'error',
                        'message': f'Item "{auction.title}" is only available in {auction.quantity_available} units.'
                    })

            # Initialize address forms with POST data
            shipping_form = ShippingAddressForm(request.POST)
            billing_form = BillingAddressForm(request.POST)

            # Validate all forms
            if (
                    shipping_method_form.is_valid() and
                    shipping_form.is_valid() and
                    billing_form.is_valid() and
                    shipping_accounts_form.is_valid()
            ):
                shipping_method = shipping_method_form.cleaned_data.get('shipping_method')
                special_instructions = shipping_method_form.cleaned_data.get('special_instructions')

                # Determine shipping_amount and tax_amount
                if default_shipping_account and default_shipping_account.use_as_default_shipping_method:
                    shipping_amount = Decimal('0.00')
                else:
                    shipping_amount = Decimal('')  # Example shipping fee; consider making this dynamic

                tax_amount = Decimal('0.00') if tax_exempt else sales_tax_no_shipping

                # Create Order
                order = Order.objects.create(
                    user=request.user,
                    cart=cart,
                    auction=auction,
                    total_amount=cart.total_cost(),
                    shipping_method=shipping_method,
                    special_instructions=special_instructions,
                    tax_exempt=tax_exempt,
                    combined_sales_tax_rate=combined_sales_tax_rate,
                    sales_tax_no_shipping=sales_tax_no_shipping,
                    total_no_shipping=total_no_shipping,
                    tax_amount=tax_amount,
                    shipping_amount=shipping_amount,
                )

                # Create OrderItems and update auctions
                order_items = []
                for item in cart.items.all():
                    auction = auction_map.get(item.auction_id)
                    order_item = OrderItem(
                        order=order,
                        auction=auction,
                        quantity=item.quantity,
                        total_price=item.total_price(),
                        price_each=item.price_each,
                    )
                    order_items.append(order_item)

                    # Update auction quantities using F expressions for atomicity
                    Auction.objects.filter(id=auction.id).update(
                        quantity_available=F('quantity_available') - item.quantity
                    )

                    # Refresh the auction instance to get updated quantity
                    auction.refresh_from_db()
                    if auction.quantity_available <= 0:
                        auction.active = False
                        auction.save()

                        # Clear the auction's watchlist
                        auction.watchers.clear()

                OrderItem.objects.bulk_create(order_items)

                # Save shipping and billing addresses
                shipping_address = shipping_form.save(commit=False)
                shipping_address.order = order
                shipping_address.save()

                billing_address = billing_form.save(commit=False)
                billing_address.order = order
                billing_address.save()

                # Save shipping account
                shipping_account = shipping_accounts_form.save(commit=False)
                shipping_account.user = request.user
                shipping_account.order = order
                shipping_account.save()

                # Process payment
                payment_method = request.POST.get('payment_method')

                if not payment_method:
                    logger.warning(f'Payment method not selected by user {request.user.id}.')
                    return JsonResponse({'status': 'error', 'message': 'Please select a payment method.'})

                payment = Payment.objects.create(order=order, payment_method=payment_method)

                # Handle payment details based on method
                try:
                    if payment_method == 'credit-card':
                        if credit_card_form.is_valid():
                            payment.set_card_number(credit_card_form.cleaned_data.get('card_number'))
                            payment.set_expiration_date(credit_card_form.cleaned_data.get('expiration_date'))
                            payment.set_cvv_number(credit_card_form.cleaned_data.get('cvv'))
                        else:
                            raise ValidationError('Invalid credit card details.')
                    elif payment_method == 'zelle':
                        if zelle_form.is_valid():
                            payment.payer_email = zelle_form.cleaned_data.get('email')
                        else:
                            raise ValidationError('Invalid Zelle details.')
                    elif payment_method == 'venmo':
                        if venmo_form.is_valid():
                            payment.payer_email = venmo_form.cleaned_data.get('venmo_username')
                        else:
                            raise ValidationError('Invalid Venmo details.')
                    elif payment_method == 'paypal':
                        if paypal_form.is_valid():
                            payment.payer_email = paypal_form.cleaned_data.get('paypal_email')
                        else:
                            raise ValidationError('Invalid PayPal details.')
                    elif payment_method == 'cashapp':
                        if cashapp_form.is_valid():
                            payment.payer_email = cashapp_form.cleaned_data.get('cashapp_username')
                        else:
                            raise ValidationError('Invalid CashApp details.')
                    elif payment_method == 'ach':
                        payment.payer_email = request.user.email
                    else:
                        raise ValidationError('Unsupported payment method.')

                    # Here, integrate with your payment gateway to process the payment
                    # For example:
                    # payment_gateway.process(payment)
                    # if not payment.success:
                    #     raise ValidationError('Payment processing failed.')

                    payment.save()
                except ValidationError as ve:
                    logger.error(f'Payment processing error for Order {order.id}: {ve}')
                    transaction.set_rollback(True)
                    return JsonResponse({'status': 'error', 'message': str(ve)})

                except Exception as e:
                    logger.exception(f'Unexpected error during payment processing for Order {order.id}: {e}')
                    transaction.set_rollback(True)
                    return JsonResponse(
                        {'status': 'error', 'message': 'An unexpected error occurred during payment processing.'})

                # Empty the cart
                cart.items.all().delete()

                # Prepare order data for response
                order_data = model_to_dict(order)
                order_data['items'] = [
                    {
                        'id': item.id,
                        'auction_title': item.auction.title,
                        'quantity': item.quantity,
                        'total_price': str(item.total_price),
                        'price_each': str(item.price_each),
                    }
                    for item in order.items.all()
                ]
                order_data['shipping_address'] = model_to_dict(shipping_address)
                order_data['billing_address'] = model_to_dict(billing_address)
                order_data['email'] = request.user.email

                # Calculate the total amount including tax and shipping
                total_amount_with_tax_and_shipping = (
                        (order.total_amount or Decimal('0.00')) +
                        (order.tax_amount or Decimal('0.00')) +
                        (order.shipping_amount or Decimal('0.00'))
                ).quantize(Decimal('0.01'))

                # Generate Order PDF for Email
                try:
                    logo_base64 = get_logo_base64()

                    html_string = render_to_string('email_templates/order_confirmation_pdf.html', {
                        'order': order,
                        'shipping_address': shipping_address,
                        'shipping_street': order.shipping_address.shipping_street_address,
                        'billing_address': billing_address,
                        'total_amount_with_tax_and_shipping': total_amount_with_tax_and_shipping,
                        'shipping_account': shipping_account,
                        'logo_base64': logo_base64,

                    })

                    result = io.BytesIO()
                    pdf = pisa.pisaDocument(io.BytesIO(html_string.encode('UTF-8')), result)
                    if not pdf.err:
                        # Send the email with the PDF attached
                        subject = f'Order Confirmation - Order #{order.id}'
                        # order_dict = model_to_dict(order)  # Convert the order object to a dictionary
                        # message = render_to_string('email_templates/message_bodies/order_confirmation_message.html', order_dict)
                        message = order_confirmation_message(order, logo_base64)
                        email = EmailMessage(subject, message, to=[request.user.email])
                        email.content_subtype = 'html'
                        email.attach(f'order_{order.id}.pdf', result.getvalue(), 'application/pdf')
                        email.send()
                    else:
                        logger.error(f'PDF generation failed for Order {order.id}.')
                except Exception as e:
                    logger.exception(f'Error generating or sending PDF for Order {order.id}: {e}')

                return JsonResponse({'status': 'success', 'order': order_data})

            else:
                # Collect form errors
                errors = {
                    'shipping_method_form': shipping_method_form.errors,
                    'shipping_form': shipping_form.errors,
                    'billing_form': billing_form.errors,
                    'shipping_accounts_form': shipping_accounts_form.errors,
                }
                logger.info(f'Form validation failed for user {request.user.id}: {errors}')
                return JsonResponse({'status': 'error', 'message': 'Form validation failed.', 'errors': errors})

    # Handling GET request - rendering checkout page
    shipping_form = ShippingAddressForm(initial=initial_data)
    billing_form = BillingAddressForm(initial=initial_data)

    context = {
        'shipping_accounts_form': shipping_accounts_form,
        'shipping_method_form': shipping_method_form,
        'shipping_form': shipping_form,
        'billing_form': billing_form,
        'credit_card_form': credit_card_form,
        'ach_form': ach_form,
        'zelle_form': zelle_form,
        'venmo_form': venmo_form,
        'paypal_form': paypal_form,
        'cashapp_form': cashapp_form,
        'cart': cart,
        'combined_sales_tax_rate': combined_sales_tax_rate,
        'sales_tax_no_shipping': sales_tax_no_shipping,
        'total_no_shipping': total_no_shipping,
    }

    return render(request, 'checkout.html', context)


@login_required
def order_confirmation(request, order_id):
    order = get_object_or_404(Order, id=order_id, user=request.user)
    return render(request, 'order_confirmation.html', {'order': order})


@login_required
def add_to_cart(request, auction_id):
    auction = get_object_or_404(Auction, id=auction_id)

    # Get or create a cart for the current user
    cart, created = Cart.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        form = AddToCartForm(request.POST, auction=auction)
        if form.is_valid():
            cart_item = form.save(commit=False)
            cart_item.cart = cart  # Associate the cart with the cart item
            cart_item.save()  # Now save the cart item
            messages.success(request, f'Added {cart_item.quantity} "{auction.title}" to your cart.')
            return redirect('active_auctions_view')
        else:
            # Collect all form errors and add as error messages
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, error)
            return redirect('active_auctions_view', auction_id=auction.id)

    return redirect('active_auctions_view')


@login_required
def view_cart(request):
    cart = get_object_or_404(Cart, user=request.user)

    return render(request, 'view_cart.html', {
        'cart': cart,
    })


@login_required
def remove_from_cart(request, item_id):
    cart_item = get_object_or_404(CartItem, id=item_id)
    cart_item.delete()
    return redirect('view_cart')


@method_decorator(csrf_exempt, name='dispatch')
def track_auction_view(request):
    if request.method == 'POST':
        if request.user.is_authenticated:
            data = json.loads(request.body)
            auction_id = data.get('auction_id')
            auction = Auction.objects.get(id=auction_id)
            AuctionView.objects.create(user=request.user, auction=auction)
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'fail'}, status=400)


# MESSAGING
@login_required
def inbox(request):
    threads = Message.objects.filter(
        parent__isnull=True, archived=False
    ).filter(
        Q(recipient=request.user) | Q(sender=request.user)
    ).order_by('-date_sent')
    unread_message_count = Message.unread_count(request.user)

    def add_images_to_auctions(auctions):
        for auction in auctions:
            auction.image = auction.get_image()
        return auctions

    watchlist = Auction.objects.none()

    if request.user.is_authenticated:
        watchlist = request.user.watchlist.all()
        watchlist = add_images_to_auctions(watchlist)

    return render(request, 'inbox.html', {
        'threads': threads,
        'unread_message_count': unread_message_count,
        'watchlist': watchlist,
    })


@login_required
def message_detail(request, message_id):
    message = get_object_or_404(Message, id=message_id, recipient=request.user)
    message.read = True
    message.save()
    return render(request, 'message_detail.html', {'message': message})


@login_required
def send_message(request, auction_id):
    if request.method == 'POST':
        form = MessageForm(request.POST)
        if form.is_valid():
            auction = Auction.objects.get(id=auction_id)
            auction_creator = auction.creator
            message = form.save(commit=False)
            message.sender = request.user
            message.recipient = auction_creator
            message.listing_id = auction_id
            message.message_type = 'question'
            message.save()
            return redirect('inbox')
    else:
        form = MessageForm()
    return render(request, 'send_message.html', {'form': form})


@login_required
@require_POST
def mark_messages_as_read(request, thread_id):
    # Retrieve the thread by ID and mark all messages as read
    thread = Message.objects.filter(id=thread_id).first()
    if thread:
        thread.get_thread().update(read=True, date_read=timezone.now())
    return JsonResponse({'status': 'success'})


@login_required
def send_reply(request, message_id):
    parent_message = get_object_or_404(Message, id=message_id)
    if request.method == 'POST':
        reply_body = request.POST.get('reply')
        if reply_body:
            Message.objects.create(
                sender=request.user,
                recipient=parent_message.sender if parent_message.sender != request.user else parent_message.recipient,
                subject=f"Re: {parent_message.subject}",
                body=reply_body,
                parent=parent_message,
                message_type='reply'
            )
    return redirect('inbox')


@login_required
def validate_message(request, message):
    gpt_messages = [
        {
            'role': 'system',
            'content': 'You are a helpful assistant that is adept at determining if a message contains personally identifiable information.'
        },
        {
            'role': 'user',
            'content': f'In the following message, wrap all personally identifiable information (Pii) in the following schema: '
                       f'Wrap first names in double exclamation point symbols and last '
                       f'names as well as any other Pii in double hash tag symbols in your json response. '
                       f'Here is the message: {message}.'
        }
    ]

    try:
        response = get_chat_completion_request(messages=gpt_messages, tools=None, tool_choice=None)
        response_content = response.choices[0].message.content
        parsed_content = json.loads(response_content)
        processed_message = parsed_content.get('message', '')

        contains_pii = "##" in processed_message in processed_message
        print(processed_message)

        return JsonResponse({'validated_message': processed_message, 'contains_pii': contains_pii})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def send_customer_service_message(request):
    if request.method == 'POST':
        message_body = request.POST.get('message') if request.POST.get('message') else request.POST.get('body')
        customer_service_user = User.objects.get(username='CustomerService')  # Replace with actual username or ID

        Message.objects.create(
            sender=request.user,
            recipient=customer_service_user,
            message_type='cs',
            subject='Customer Service Inquiry',
            body=message_body
        )
        return redirect('inbox')


@login_required
def archive_message(request, message_id):
    message = Message.objects.get(id=message_id)
    message.archived = True
    message.save()
    return JsonResponse({'status': 'success'})


def track_parcel_view(request, parcel_id):
    parcel = get_object_or_404(Parcel, id=parcel_id)

    try:
        tracking_info = track_parcel(parcel)
        return JsonResponse({
            'status': 'success',
            'tracking_info': tracking_info,
        })
    except ValueError as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e),
        })


@login_required
def add_order_note(request, order_id):
    order = get_object_or_404(Order, id=order_id, user=request.user)

    if request.method == 'POST':
        form = OrderNoteForm(request.POST, instance=order)
        if form.is_valid():
            form.save()
            messages.success(request, 'Your note has been added.')
        else:
            messages.error(request, 'There was an error adding your note.')

    return redirect('dashboard')


def how_we_work(request):
    return render(request, 'how_we_work.html')

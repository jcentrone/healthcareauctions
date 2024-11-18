import os
from datetime import timedelta
from decimal import Decimal

from cryptography.fernet import Fernet
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.urls import reverse
from django.utils import timezone
from google.shopping.merchant_products_v1beta import ProductWeight, ShippingWeight
from google.shopping.merchant_products_v1beta.services.product_inputs_service import ProductInputsServiceClient
from google.shopping.merchant_products_v1beta.types import ProductInput, InsertProductInputRequest
from google.shopping.merchant_products_v1beta.types import products_common
from google.shopping.type.types import types, Price
from imagekit.models import ProcessedImageField, ImageSpecField
from imagekit.processors import ResizeToFill
from tenacity import retry, wait_random_exponential, stop_after_attempt


from config.storage_backends import ProfileImageStorage, CompanyLogoStorage, W9Storage, ResellerCertificateStorage, \
    GenericImageStorage

STATE_CHOICES = (
    ('AL', 'AL'),
    ('AK', 'AK'),
    ('AZ', 'AZ'),
    ('AR', 'AR'),
    ('CA', 'CA'),
    ('CO', 'CO'),
    ('CT', 'CT'),
    ('DE', 'DE'),
    ('FL', 'FL'),
    ('GA', 'GA'),
    ('HI', 'HI'),
    ('ID', 'ID'),
    ('IL', 'IL'),
    ('IN', 'IN'),
    ('IA', 'IA'),
    ('KS', 'KS'),
    ('KY', 'KY'),
    ('LA', 'LA'),
    ('ME', 'ME'),
    ('MD', 'MD'),
    ('MA', 'MA'),
    ('MI', 'MI'),
    ('MN', 'MN'),
    ('MS', 'MS'),
    ('MO', 'MO'),
    ('MT', 'MT'),
    ('NE', 'NE'),
    ('NV', 'NV'),
    ('NH', 'NH'),
    ('NJ', 'NJ'),
    ('NM', 'NM'),
    ('NY', 'NY'),
    ('NC', 'NC'),
    ('ND', 'ND'),
    ('OH', 'OH'),
    ('OK', 'OK'),
    ('OR', 'OR'),
    ('PA', 'PA'),
    ('RI', 'RI'),
    ('SC', 'SC'),
    ('SD', 'SD'),
    ('TN', 'TN'),
    ('TX', 'TX'),
    ('UT', 'UT'),
    ('VT', 'VT'),
    ('VA', 'VA'),
    ('WA', 'WA'),
    ('WV', 'WV'),
    ('WI', 'WI'),
    ('WY', 'WY'),
)
CARRIER_CHOICES = (
    ('ups', 'UPS'),
    ('fedex', 'FedEx'),
    ('dhl', 'DHL'),
)
DURATION_CHOICES = [
    (1, '1 day'),
    (3, '3 days'),
    (5, '5 days'),
    (7, '7 days'),
    (10, '10 days')
]
PACKAGE_TYPE_CHOICES = [
    ('BAG', 'Bag'),
    ('BOT', 'Bottle'),
    ('BOX', 'Box'),
    ('CAR', 'Cartridge'),
    ('CA', 'Case'),
    ('CTN', 'Carton'),
    ('DRM', 'Drum'),
    ('JAR', 'Jar'),
    ('PKG', 'Package'),
    ('PKT', 'Packet'),
    ('ROL', 'Roll'),
    ('SAK', 'Sack'),
    ('SET', 'Set'),
    ('TRY', 'Tray'),
    ('TUB', 'Tub'),
    ('VIAL', 'Vial'),
    ('OTHER', 'Other'),
]

AUCTION_CLOSED_REASONS = (
    ('expired', 'expired'),
    ('sold', 'sold'),
    ('reserve_not_met', 'reserve_not_met'),
)

MAX_ATTEMPTS = 6

GOOGLE_MERCHANT_CENTER_ID = os.environ.get("GOOGLE_MERCHANT_CENTER_ID")
# Initialize the Merchant API service
# client = merchant_products.ProductInputsServiceAsyncClient(credentials=settings.GS_CREDENTIALS)


class User(AbstractUser):
    company_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
    profile_image = models.ImageField(storage=ProfileImageStorage(), blank=True, null=True)
    company_logo = models.ImageField(storage=CompanyLogoStorage(), blank=True, null=True)
    company_w9 = models.FileField(storage=W9Storage(), blank=True, null=True)
    reseller_cert = models.FileField(storage=ResellerCertificateStorage(), blank=True, null=True)
    tax_exempt = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)

    def __str__(self):
        return self.username

    def is_tax_exempt(self):
        """Check if the user is tax exempt based on the presence of a reseller certificate."""
        return bool(self.reseller_cert)

    def get_default_shipping_account(self):
        return self.shipping_accounts.filter(use_as_default_shipping_method=True).first()


class ShippingAccounts(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='shipping_accounts')
    order = models.ForeignKey('Order', on_delete=models.CASCADE, related_name='shipping_accounts', null=True,
                              blank=True)
    carrier_name = models.CharField(max_length=10, choices=CARRIER_CHOICES)
    use_as_default_shipping_method = models.BooleanField(default=True, null=True, blank=True)
    carrier_account_number = models.CharField(max_length=15, blank=True)


class Address(models.Model):
    ADDRESS_TYPE_CHOICES = [
        ('billing', 'Billing'),
        ('shipping', 'Shipping'),
        ('other', 'Other'),
    ]
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='addresses')
    address_type = models.CharField(max_length=10, choices=ADDRESS_TYPE_CHOICES)
    street = models.CharField(max_length=255)
    suite = models.CharField(null=True, blank=True, max_length=255)
    city = models.CharField(max_length=255)
    state = models.CharField(max_length=50, choices=STATE_CHOICES)
    # state = models.CharField(max_length=255)
    zip_code = models.CharField(max_length=10)
    country = models.CharField(max_length=255, default='USA')
    use_as_default_shipping_method_address = models.BooleanField(default=True, null=True, blank=True)

    def __str__(self):
        return f'{self.address_type} address for {self.user.username}'


class MedicalSpecialty(models.Model):
    code = models.CharField(max_length=2, null=True, blank=True, unique=True)  # Enforce unique constraint
    description = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.code} - {self.description}"

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.upper()  # Normalize to uppercase
        super().save(*args, **kwargs)


class Category(models.Model):
    category_name = models.CharField(max_length=500)
    medical_specialty = models.ForeignKey(
        MedicalSpecialty,
        on_delete=models.CASCADE,
        related_name='categories',
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        unique_together = ('medical_specialty', 'category_name')  # Prevent duplicate categories under the same parent

    def __str__(self):
        return f'{self.category_name}'

    @property
    def count_active_auctions(self):
        return self.auction_category.count()


class Auction(models.Model):
    title = models.CharField('Title', max_length=100)
    description = models.TextField(max_length=2000, null=False, default='')
    creator = models.ForeignKey(User, on_delete=models.PROTECT, related_name='auction_creator')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='auction_category')
    quantity_available = models.IntegerField('Listing Quantity', null=True, blank=True, default=1)
    auction_quantity_available = models.IntegerField('Listing Quantity', null=True, blank=True, default=1)

    starting_bid = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        blank=True,
        null=True
    )
    reserve_bid = models.DecimalField(
        'Reserve Price',
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        blank=True,
        null=True
    )
    current_bid = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        blank=True,
        null=True
    )
    buyItNowPrice = models.DecimalField(
        'Sales Price',
        max_digits=7,
        decimal_places=2,
        blank=True,
        null=True
    )
    buyer = models.ForeignKey(User, on_delete=models.PROTECT, null=True)
    watchers = models.ManyToManyField(User, related_name='watchlist', blank=True)
    active = models.BooleanField(default=True)
    product_name = models.CharField('Brand Name', max_length=256, null=False, blank=False, default='')
    package_quantity = models.IntegerField('Package Quantity', null=True, blank=True)
    partial_quantity = models.IntegerField('Partial Quantity', null=True, blank=True)
    manufacturer = models.CharField(max_length=255, null=False, blank=False, default='')
    auction_type = models.CharField('Auction Type', null=False, blank=False, default='Auction')
    gmdnPTDefinition = models.TextField(null=True, blank=True)
    implantable = models.BooleanField(default=False)
    deviceSterile = models.BooleanField('Package(s) Sterile', default=False)
    sterilizationPriorToUse = models.BooleanField(default=False)
    # expiration_date = models.DateTimeField(blank=True, null=True)
    package_type = models.CharField(
        'Package Type',
        max_length=100,
        choices=PACKAGE_TYPE_CHOICES,
        null=True,
        blank=True
    )
    sell_full_lot = models.BooleanField('Sell as Full Lot', default=True)
    fullPackage = models.BooleanField('Package(s) Full', default=False)
    hold_for_import = models.BooleanField('', default=False)
    auction_duration = models.IntegerField('Listing Duration', choices=DURATION_CHOICES, default=7)
    auction_end_reason = models.TextField(choices=AUCTION_CLOSED_REASONS, null=True, blank=True)
    date_created = models.DateTimeField(auto_now_add=True)
    auction_ending_date = models.DateTimeField(blank=True, null=True)
    featured_listing = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Listing'
        verbose_name_plural = 'Listings'

    def __str__(self):
        return f'Auction #{self.id}: {self.title} ({self.creator})'

    def save(self, *args, **kwargs):
        # Check if the object is being created for the first time
        if not self.pk and not self.auction_ending_date:
            super(Auction, self).save(*args, **kwargs)  # Save to get date_created
            self.auction_ending_date = self.date_created + timezone.timedelta(days=self.auction_duration)
            # Avoid infinite recursion by updating only the auction_ending_date field
            Auction.objects.filter(pk=self.pk).update(auction_ending_date=self.auction_ending_date)
        else:
            super(Auction, self).save(*args, **kwargs)

    def auction_end_date(self):
        return self.date_created + timedelta(days=self.auction_duration)

    def time_remaining(self):
        end_date = self.auction_end_date()
        now = timezone.now()
        if end_date > now:
            return end_date - now
        return timedelta(0)  # Auction ended

    def days_remaining(self):
        remaining_time = self.time_remaining()
        return remaining_time.days

    def hours_remaining(self):
        remaining_time = self.time_remaining()
        total_seconds = remaining_time.total_seconds()
        hours = total_seconds // 3600
        return int(hours)

    def formatted_time_remaining(self):
        remaining_time = self.time_remaining()
        days = remaining_time.days
        total_seconds = remaining_time.total_seconds()
        hours = (total_seconds // 3600) % 24
        minutes = (total_seconds // 60) % 60
        return f"{int(days)}D {int(hours)}H {int(minutes)}M"

    def count_watchers(self):
        return self.watchers.count()

    def total_views(self):
        return self.views.count()

    def get_image(self):
        # Returns the first image associated with the auction
        return self.get_images.first()

    def contains_expired_items(self):
        today = timezone.now().date()
        return any(detail.expiration_date and detail.expiration_date < today for detail in self.product_details.all())

    def highest_bid(self):
        return self.bid_set.order_by('-amount').first()

    @classmethod
    def get_active_manufacturers(cls):
        return cls.objects.filter(active=True).values_list('manufacturer', flat=True).distinct()

    @classmethod
    def get_active_specialties(cls):
        # Filter active auctions and retrieve related medical specialties
        specialties = MedicalSpecialty.objects.filter(
            categories__auction_category__active=True
        ).distinct()

        return specialties

    def get_absolute_url(self):
        return reverse('active_auctions_with_id', args=[self.id])


class ProductDetail(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='product_details')
    sku = models.CharField('SKU/UDI', max_length=100, null=True, blank=True, default='(01)')
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    lot_number = models.CharField(max_length=100, null=True, blank=True)
    production_date = models.DateField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f'ProductDetail #{self.id} for Auction #{self.auction.id}'

    def to_dict(self):
        return {
            'id': self.id,
            'auction_id': self.auction_id,
            'reference_number': self.reference_number,
            'lot_number': self.lot_number,
            'production_date': self.production_date,
            'expiration_date': self.expiration_date,
            # 'sku' is intentionally excluded
        }


class AuctionView(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auction_views')
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='views')
    viewed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} viewed Auction #{self.auction.id} on {self.viewed_at}'


def validate_file_size(value):
    max_size = 10 * 1024 * 1024  # 10 MB limit
    if value.size > max_size:
        raise ValidationError("The maximum file size that can be uploaded is 10MB")


class Image(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='get_images')
    image = ProcessedImageField(
        upload_to='images/',
        processors=[ResizeToFill(800, 600)],
        format='WEBP',  # Converts image to WEBP after processing
        options={'quality': 80},
        validators=[validate_file_size],
        blank=True,
        null=True
    )

    def __str__(self):
        return f'{self.image}'


class ProductImage(models.Model):
    reference_number = models.CharField(max_length=100, unique=True)
    image = models.ImageField(storage=GenericImageStorage(), null=True)  # Store the image file

    def __str__(self):
        return self.image

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return None


class Bid(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=7, decimal_places=2)
    date = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Bid #{self.id}: {self.amount} on {self.auction.title} by {self.user.username}'


class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='get_comments')
    comment = models.TextField(max_length=500)
    date_created = models.DateTimeField(default=timezone.now)

    def get_creation_date(self):
        return self.date_created.strftime('%B %d %Y')

    def __str__(self):
        return f'Comment #{self.id}: {self.user.username} on {self.auction.title}: {self.comment}'


# MESSAGING
class Message(models.Model):
    MESSAGE_TYPE_CHOICES = [
        ('question', 'Question'),
        ('system', 'System Message'),
        ('cs', 'Customer Service'),
    ]

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages', null=True,
                                  blank=True)
    listing = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES)
    subject = models.CharField(max_length=255)
    body = models.TextField(null=True, blank=True)
    # date_sent = models.DateTimeField(default=timezone.now)
    date_sent = models.DateTimeField(auto_now_add=True)
    date_responded = models.DateTimeField(null=True, blank=True)
    date_read = models.DateTimeField(null=True, blank=True)
    read = models.BooleanField(default=False)
    response_to = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='responses')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')
    archived = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.subject} from {self.sender.username} to {self.recipient.username if self.recipient else "System"}'

    @classmethod
    def unread_count(cls, user):
        return cls.objects.filter(recipient=user, read=False).count()

    def get_thread(self):
        return Message.objects.filter(Q(id=self.id) | Q(parent=self)).order_by('date_sent')

    @property
    def is_read(self):
        return self.read


# ORDER MANAGEMENT
class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Cart ({self.user.username})'

    def total_cost(self):
        return sum(item.total_price() for item in self.items.all())

    def item_count(self):
        return self.items.count()


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE)
    quantity = models.IntegerField(null=True, blank=True)
    price_each = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'{self.auction.title}'

    def total_price(self):
        return self.price_each * self.quantity

    def get_image(self):
        # Returns the first image associated with the auction
        return self.auction.get_images.first()


class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='orders')  # Changed to ForeignKey
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('shipped', 'Shipped'),
            ('completed', 'Completed')
        ],
        default='pending'
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    shipping_method = models.CharField(max_length=50, null=True, blank=True)
    shipping_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    special_instructions = models.TextField(null=True, blank=True)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    order_note = models.TextField(max_length=2000, null=False, default='')
    tax_exempt = models.BooleanField(null=True, blank=True)
    combined_sales_tax_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sales_tax_no_shipping = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_no_shipping = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f'Order #{self.id} for {self.user.username}'

    def calculate_total(self):
        # Logic to calculate total based on cart items, tax, and shipping
        items_total = sum(item.total_price() for item in self.cart.items.all())
        shipping_charges = self.carrier.shipping_cost if self.carrier else 0.00
        return items_total + self.tax_amount + shipping_charges

    def get_shipping_charges(self):
        # If there's a carrier associated with the order, return its shipping cost
        if self.carriers.exists():
            carrier = self.carriers.first()  # Assuming there is only one carrier per order
            total_shipping_cost = sum(carrier.shipping_cost for parcel in self.parcels.all())
            return total_shipping_cost if total_shipping_cost else Decimal(0.00)
        return Decimal(0.00)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    price_each = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'{self.quantity}x {self.auction.title}'

    # def total_price(self):
    #     return self.total_price


class ShippingAddress(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='shipping_address')
    shipping_full_name = models.CharField(max_length=255)
    shipping_company_name = models.CharField(max_length=255, blank=True, null=True)
    shipping_email = models.CharField(max_length=255, blank=True)
    shipping_street_address = models.CharField(max_length=255)
    shipping_apartment_suite = models.CharField('Suite', max_length=255, null=True, blank=True)
    shipping_city = models.CharField(max_length=255)
    shipping_state = models.CharField(max_length=2, choices=STATE_CHOICES)
    shipping_zip_code = models.CharField(max_length=10)
    shipping_country = models.CharField(max_length=255, default='USA')
    shipping_phone_number = models.CharField(max_length=15, blank=True)

    def __str__(self):
        return f'Shipping Address for Order #{self.order.id}'


class BillingAddress(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='billing_address')
    billing_full_name = models.CharField(max_length=255)
    billing_company_name = models.CharField(max_length=255, blank=True, null=True)
    billing_email = models.CharField(max_length=255, blank=True)
    billing_street_address = models.CharField(max_length=255)
    billing_apartment_suite = models.CharField('Suite', max_length=255, null=True, blank=True)
    billing_city = models.CharField(max_length=255)
    billing_state = models.CharField(max_length=2, choices=STATE_CHOICES)
    billing_zip_code = models.CharField(max_length=10)
    billing_country = models.CharField(max_length=255, default='USA')
    billing_phone_number = models.CharField(max_length=15, blank=True)

    def __str__(self):
        return f'Billing Address for Order #{self.order.id}'


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('credit_card', 'Credit Card'),
        ('ach', 'ACH'),
        ('zelle', 'Zelle'),
        ('paypal', 'PayPal'),
        ('venmo', 'Venmo'),
        ('cashapp', 'CashApp'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    order = models.OneToOneField('Order', on_delete=models.CASCADE, related_name='payment')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=100, null=True, blank=True)

    # Payment-specific fields
    card_last_four = models.CharField(max_length=4, null=True, blank=True)
    encrypted_card_number = models.BinaryField('Card Number', null=True, blank=True)
    encrypted_expiration_date = models.BinaryField(null=True, blank=True)
    encrypted_cvv_number = models.BinaryField(null=True, blank=True)
    payer_email = models.EmailField(null=True, blank=True)  # For PayPal/Zelle, etc.
    additional_info = models.JSONField(null=True, blank=True)  # For any other details, as JSON

    def __str__(self):
        return f'Payment for Order #{self.order.id} via {self.payment_method}'

    def encrypt_data(self, data):
        cipher_suite = Fernet(settings.ENCRYPTION_KEY)
        return cipher_suite.encrypt(data.encode())

    def decrypt_data(self, encrypted_data):
        cipher_suite = Fernet(settings.ENCRYPTION_KEY)
        return cipher_suite.decrypt(encrypted_data).decode()

    def set_card_number(self, card_number):
        self.card_last_four = card_number[-4:]
        self.encrypted_card_number = self.encrypt_data(card_number)

    def get_card_number(self):
        return self.decrypt_data(self.encrypted_card_number)

    def set_expiration_date(self, expiration_date):
        self.encrypted_expiration_date = self.encrypt_data(expiration_date)

    def get_expiration_date(self):
        return self.decrypt_data(self.encrypted_expiration_date)

    def set_cvv_number(self, cvv_number):
        self.encrypted_cvv_number = self.encrypt_data(cvv_number)

    def get_cvv(self):
        return self.decrypt_data(self.encrypted_cvv_number)


class Carrier(models.Model):
    CARRIER_CHOICES = [
        ('UPS', 'UPS'),
        ('FedEx', 'FedEx'),
        ('DHL', 'DHL'),
    ]

    DELIVERY_METHOD_CHOICES = [
        ('Ground', 'Ground'),
        ('Overnight', 'Overnight'),
        ('2 Day', '2 Day'),
        ('3 Day', '3 Day'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='carriers')
    carrier = models.CharField(max_length=50, choices=CARRIER_CHOICES, default='UPS')
    delivery_method = models.CharField(max_length=50, choices=DELIVERY_METHOD_CHOICES, default='Ground')
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f'{self.carrier} - {self.delivery_method} (Order #{self.order.id})'


class Parcel(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='parcels')
    height = models.DecimalField(max_digits=6, decimal_places=2)
    length = models.DecimalField(max_digits=6, decimal_places=2)
    width = models.DecimalField(max_digits=6, decimal_places=2)
    weight = models.DecimalField(max_digits=6, decimal_places=2)
    tracking_number = models.CharField(max_length=100, null=True, blank=True)
    delivery_status = models.CharField(max_length=50, choices=[
        ('pending', 'Pending'),
        ('shipped', 'Shipped'),
        ('in_transit', 'In Transit'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('delayed', 'Delayed'),
        ('failed_attempt', 'Failed Attempt'),
        ('returned_to_sender', 'Returned to Sender'),
        ('held_at_location', 'Held at Location'),
        ('exception', 'Exception'),
        ('cancelled', 'Cancelled'),
    ], default='pending')

    def __str__(self):
        return f'Parcel for Order #{self.order.id}'

    @property
    def volume(self):
        return self.height * self.length * self.width

    def save(self, *args, **kwargs):
        # Check if the order has a carrier and set it for the parcel
        if not hasattr(self, 'carrier') and self.order.carriers.exists():
            self.carrier = self.order.carriers.first()
        super().save(*args, **kwargs)


class UserManual(models.Model):
    manual_url = models.URLField(max_length=512, null=True, blank=True)
    manufacturer = models.CharField(max_length=255, null=False, blank=False, default='')

    def __str__(self):
        return f'User Manual for {self.manufacturer}'


class ComparativeSalesData(models.Model):
    sale_date = models.DateField(db_index=True, null=True, blank=True)
    ref_id = models.CharField(max_length=50, db_index=True)
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    line_total_cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    line_total_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f"{self.ref_id} on {self.sale_date}"


class ScanToExcel(models.Model):
    sku = models.CharField(max_length=100, null=True, blank=True, default='(01)')
    quantity = models.IntegerField(null=True, blank=True, default=1)
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    lot_number = models.CharField(max_length=100, null=True, blank=True)
    production_date = models.DateField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    scan_group = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.reference_number}-{self.quantity}"


class ProductCodeClassification(models.Model):
    DEVICE_CLASS_CHOICES = [
        ('I', 'Class I'),
        ('II', 'Class II'),
        ('III', 'Class III'),
        ('Unclassified', 'Unclassified'),
        ('Not Classified', 'Not Classified'),
    ]

    review_panel = models.CharField(max_length=100)
    medical_specialty = models.CharField(max_length=100)
    product_code = models.CharField(max_length=10)
    device_name = models.CharField(max_length=200)
    device_class = models.CharField(max_length=50, choices=DEVICE_CLASS_CHOICES)
    unclassified_reason = models.CharField(max_length=200, null=True, blank=True)
    gmp_exempt_flag = models.BooleanField(default=False)
    third_party_flag = models.BooleanField(default=False)
    review_code = models.CharField(max_length=100)
    regulation_number = models.CharField(max_length=50)
    submission_type_id = models.CharField(max_length=100, null=True, blank=True)
    definition = models.TextField()
    physical_state = models.TextField()
    technical_method = models.TextField()
    target_area = models.TextField()
    implant_flag = models.BooleanField(default=False)
    life_sustain_support_flag = models.BooleanField(default=False)
    summary_malfunction_reporting = models.CharField(max_length=200, null=True, blank=True)

    def __str__(self):
        return self.product_code

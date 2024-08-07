from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from config.storage_backends import ProfileImageStorage, CompanyLogoStorage


class User(AbstractUser):
    company_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
    profile_image = models.ImageField(storage=ProfileImageStorage(), blank=True, null=True)
    company_logo = models.ImageField(storage=CompanyLogoStorage(), blank=True, null=True)

    def __str__(self):
        return self.username


class Address(models.Model):
    ADDRESS_TYPE_CHOICES = [
        ('billing', 'Billing'),
        ('shipping', 'Shipping'),
    ]

    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='addresses')
    address_type = models.CharField(max_length=10, choices=ADDRESS_TYPE_CHOICES)
    street = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    state = models.CharField(max_length=255)
    zip_code = models.CharField(max_length=10)
    country = models.CharField(max_length=255)

    def __str__(self):
        return f'{self.address_type} address for {self.user.username}'


class Category(models.Model):
    category_name = models.CharField(max_length=50)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')

    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        unique_together = ('category_name', 'parent')  # Prevent duplicate categories under the same parent

    def __str__(self):
        return f'{self.category_name}'

    @property
    def count_active_auctions(self):
        return Auction.objects.filter(category=self).count()


class Auction(models.Model):
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
    title = models.CharField('Title', max_length=100)
    description = models.TextField(max_length=2000, null=False, default='')
    creator = models.ForeignKey(User, on_delete=models.PROTECT, related_name='auction_creator')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='auction_category')
    date_created = models.DateTimeField(default=timezone.now)
    quantity_available = models.IntegerField('Listing Quantity', null=True, blank=True, default=1)
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
    product_name = models.CharField('Product Name', max_length=256, null=False, blank=False, default='')
    package_quantity = models.IntegerField('Package Quantity', null=True, blank=True)
    partial_quantity = models.IntegerField('Partial Quantity', null=True, blank=True)
    manufacturer = models.CharField(max_length=100, null=False, blank=False, default='')
    auction_type = models.CharField('Auction Type', null=False, blank=False, default='Auction')
    gmdnPTDefinition = models.TextField(null=True, blank=True)
    implantable = models.BooleanField(default=False)
    deviceSterile = models.BooleanField('Package(s) Sterile', default=False)
    sterilizationPriorToUse = models.BooleanField(default=False)
    package_type = models.CharField(
        'Package Type',
        max_length=100,
        choices=PACKAGE_TYPE_CHOICES,
        null=True,
        blank=True
    )
    sell_full_lot = models.BooleanField('Sell as Full Lot', default=True)
    auction_duration = models.IntegerField('Listing Duration', choices=DURATION_CHOICES, default=7)
    fullPackage = models.BooleanField('Package(s) Full', default=False)


    def __str__(self):
        return f'Auction #{self.id}: {self.title} ({self.creator})'

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


class ProductDetail(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='product_details')
    sku = models.CharField('SKU/UDI', max_length=100, null=True, blank=True, default='(01)')
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    lot_number = models.CharField(max_length=100, null=True, blank=True)
    production_date = models.DateField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f'ProductDetail #{self.id} for Auction #{self.auction.id}'


class Image(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='get_images')
    image = models.ImageField(upload_to='images/')

    def __str__(self):
        return f'{self.image}'


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


class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Cart ({self.user.username})'

    def total_cost(self):
        return sum(item.total_price() for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f'{self.quantity} x {self.auction.title}'

    def total_price(self):
        return self.quantity * self.auction.current_bid if self.auction.current_bid else 0

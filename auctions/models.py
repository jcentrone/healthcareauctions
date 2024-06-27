from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    def __str__(self):
        return f'{self.username}'


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
    title = models.CharField('Title', max_length=100)
    description = models.TextField(max_length=800, null=True)
    creator = models.ForeignKey(User, on_delete=models.PROTECT, related_name='auction_creator')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='auction_category')
    date_created = models.DateTimeField(default=timezone.now)
    quantity_available = models.IntegerField('Auction Quantity', null=True, blank=True)
    starting_bid = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    reserve_bid = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        blank = True,
        null = True
    )
    current_bid = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        blank=True,
        null=True
    )
    buyer = models.ForeignKey(User, on_delete=models.PROTECT, null=True)
    watchers = models.ManyToManyField(User, related_name='watchlist', blank=True)
    active = models.BooleanField(default=True)
    product_name = models.CharField('Product Name', max_length=256, null=True, blank=True)
    package_quantity = models.IntegerField(null=True, blank=True)
    partial_quantity = models.IntegerField(null=True, blank=True)
    manufacturer = models.CharField(max_length=100, null=True, blank=True)
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    lot_number = models.CharField(max_length=100, null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    production_date = models.DateField(null=True, blank=True)
    package_type = models.CharField(max_length=100, null=True, blank=True)
    udi = models.CharField('UDI', null=True, blank=True)

    gmdnPTDefinition = models.TextField(null=True, blank=True)
    implantable = models.BooleanField(default=False)
    productCode = models.CharField(max_length=100, null=True, blank=True)
    productCodeName = models.CharField(max_length=100, null=True, blank=True)
    deviceSterile = models.BooleanField('Package Sterile', default=False)
    sterilizationPriorToUse = models.BooleanField(default=False)
    deviceClass = models.CharField(max_length=50, null=True, blank=True)
    size_information = models.TextField(null=True, blank=True)
    storage_handling = models.JSONField(null=True, blank=True)
    fullPackage = models.BooleanField('Package Full', default=False)
    auction_duration = models.IntegerField(choices=DURATION_CHOICES, default=7)

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

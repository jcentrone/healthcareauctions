from decimal import Decimal

from django.contrib import admin
from django.forms import modelform_factory
from django.http import HttpResponseRedirect
from django.urls import reverse

from .forms import MessageForm
from .models import Bid, User, Message, Order, OrderItem, ShippingAddress, \
    BillingAddress, Payment, Carrier, Parcel, ProductDetail, ShippingAccounts, Auction

# admin.site.register(Auction)
# admin.site.register(Image)
admin.site.register(Bid)
# admin.site.register(Comment)
# admin.site.register(Category)
admin.site.register(User)


class AuctionInline(admin.TabularInline):
    model = Auction
    extra = 0
    readonly_fields = ('creator_company_name', 'creator', 'creator_phone_number', 'creator_email')

    # These are not part of the Auction model, but we will add them using custom methods
    fields = ('creator_company_name', 'creator', 'creator_phone_number', 'creator_email')

    def creator_company_name(self, obj):
        return obj.creator.company_name

    def creator_phone_number(self, obj):
        return obj.creator.phone_number

    def creator_email(self, obj):
        return obj.creator.email

    # To give appropriate labels in the admin interface
    creator_company_name.short_description = 'Seller Company Name'
    creator_phone_number.short_description = 'Seller Phone Number'
    creator_email.short_description = 'Seller Email'

    def has_add_permission(self, request, obj=None):
        # Prevent adding auctions directly from the Order admin
        return False

    def has_delete_permission(self, request, obj=None):
        # Prevent deleting auctions directly from the Order admin
        return False


class ShippingAddressInline(admin.StackedInline):
    model = ShippingAddress
    extra = 0  # Prevent extra empty forms


class BillingAddressInline(admin.StackedInline):
    model = BillingAddress
    extra = 0  # Prevent extra empty forms


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0  # Prevent extra empty forms
    can_delete = False
    fields = []  # Empty fields to avoid rendering issues
    readonly_fields = []


# class PaymentInline(admin.TabularInline):
#     model = Payment
#     extra = 0  # Prevent extra empty forms
#     can_delete = False
#
#     def get_fields(self, request, obj=None):
#         payment = self.get_object_payment(obj)  # Ensure we are working with a Payment instance
#
#         if payment:
#             if payment.payment_method == 'credit_card':
#                 return (
#                     'payment_method',
#                     'card_last_four',
#                     'decrypted_card_number',
#                     'decrypted_expiration_date',
#                     'decrypted_cvv'
#                 )
#             elif payment.payment_method in ['paypal', 'zelle', 'venmo', 'cashapp']:
#                 return (
#                     'payment_method',
#                     'payer_email'
#                 )
#             elif payment.payment_method == 'ach':
#                 return (
#                     'payment_method',
#                 )
#         # Fallback to default fields if no payment instance is found or payment_method is unknown
#         return (
#             'payment_method',
#             'card_last_four',
#             'decrypted_card_number',
#             'decrypted_expiration_date',
#             'decrypted_cvv'
#         )
#
#     def get_readonly_fields(self, request, obj=None):
#         payment = self.get_object_payment(obj)  # Ensure we are working with a Payment instance
#
#         if payment:
#             if payment.payment_method == 'credit_card':
#                 return (
#                     'payment_method',
#                     'card_last_four',
#                     'decrypted_card_number',
#                     'decrypted_expiration_date',
#                     'decrypted_cvv'
#                 )
#             elif payment.payment_method in ['paypal', 'zelle', 'venmo', 'cashapp']:
#                 return (
#                     'payment_method',
#                     'payer_email'
#                 )
#             elif payment.payment_method == 'ach':
#                 return (
#                     'payment_method',
#                     'payer_email',  # Add other fields related to ACH if applicable
#                 )
#         # Fallback to default fields if no payment instance is found or payment_method is unknown
#         return super().get_readonly_fields(request, obj)
#
#     # Helper method to get the Payment instance from the Order
#     def get_object_payment(self, obj):
#         # Ensure we are working with a Payment instance
#         return obj.payment if isinstance(obj, Order) and hasattr(obj, 'payment') else obj
#
#     # Decrypt sensitive fields
#     def decrypted_card_number(self, obj):
#         return obj.get_card_number() if obj.encrypted_card_number else 'N/A'
#
#     decrypted_card_number.short_description = 'Card Number'
#
#     def decrypted_expiration_date(self, obj):
#         return obj.get_expiration_date() if obj.encrypted_expiration_date else 'N/A'
#
#     decrypted_expiration_date.short_description = 'Expiration Date'
#
#     def decrypted_cvv(self, obj):
#         return obj.get_cvv() if obj.encrypted_cvv_number else 'N/A'
#
#     decrypted_cvv.short_description = 'CVV'


class CarrierInline(admin.TabularInline):
    model = Carrier
    can_delete = True
    extra = 0


class ParcelInline(admin.TabularInline):
    model = Parcel
    extra = 0


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0  # Prevent extra empty forms
    can_delete = False



class ShippingAccountInline(admin.TabularInline):
    model = ShippingAccounts
    extra = 0
    fields = ('carrier_name', 'carrier_account_number', 'use_as_default_shipping_method')

    def has_delete_permission(self, request, obj=None):
        return False


class OrderAdmin(admin.ModelAdmin):
    change_form_template = 'admin/admin_view_order.html'
    list_display = (
        'id', 'user', 'user_email', 'status', 'tax_amount', 'total_amount', 'created_at', 'updated_at',
        'shipping_amount',
        'auction_creator_company_name', 'auction_creator_phone_number', 'auction_creator_email',
    )
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email', 'id')
    fields = ('status',)

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        obj = self.get_object(request, object_id)  # Fetch the Order instance

        # Create the form class for the Order model
        OrderForm = modelform_factory(Order, fields=('status', 'shipping_method', 'special_instructions'))

        # Create an instance of the forms with the Order object Message Form
        if request.method == 'POST':
            if 'send_message' in request.POST:
                message_form = MessageForm(request.POST)
                if message_form.is_valid():
                    message = message_form.save(commit=False)
                    message.sender = User.objects.get(username='CustomerService')
                    message.recipient = obj.items.first().auction.creator  # Assuming seller is the auction creator
                    message.listing = obj.items.first().auction  # Associate the message with the auction
                    message.save()
                    self.message_user(request, "Message sent successfully.")
                    return HttpResponseRedirect(reverse('admin:auctions_order_change', args=[obj.pk]))
            else:
                form = OrderForm(request.POST, instance=obj)
                if form.is_valid():
                    form.save()
        else:
            form = OrderForm(instance=obj)
            message_form = MessageForm()

        # Pass the Order form to the template as extra context
        extra_context['order_form'] = form
        extra_context['message_form'] = message_form

        # Create inline formsets
        shipping_inline = ShippingAddressInline(self.model, self.admin_site)
        billing_inline = BillingAddressInline(self.model, self.admin_site)
        payments_inline = PaymentInline(self.model, self.admin_site)
        order_items_inline = OrderItemInline(self.model, self.admin_site)
        carrier_inline = CarrierInline(self.model, self.admin_site)
        parcel_inline = ParcelInline(self.model, self.admin_site)

        shipping_formset = shipping_inline.get_formset(request, obj)(instance=obj)
        billing_formset = billing_inline.get_formset(request, obj)(instance=obj)
        payments_formset = payments_inline.get_formset(request, obj)(instance=obj)
        order_items_formset = order_items_inline.get_formset(request, obj)(instance=obj)
        carrier_formset = carrier_inline.get_formset(request, obj)(instance=obj)
        parcel_formset = parcel_inline.get_formset(request, obj)(instance=obj)

        # Pass the formsets to the template
        extra_context['shipping_inline'] = shipping_formset
        extra_context['billing_inline'] = billing_formset
        extra_context['payments_inline'] = payments_formset
        extra_context['order_items_inline'] = order_items_formset
        extra_context['carrier_inline'] = carrier_formset
        extra_context['parcel_inline'] = parcel_formset

        if obj.items.exists():
            # Pass the Order object to the template as extra context
            extra_context['order'] = obj
            # Get buyer-related information
            extra_context['buyer_name'] = obj.user.first_name + ' ' + obj.user.last_name
            # Get auction-related information
            auction = obj.items.first().auction
            extra_context['auction_creator_company_name'] = auction.creator.company_name
            extra_context['auction_creator_phone_number'] = auction.creator.phone_number
            extra_context['auction_creator_email'] = auction.creator.email

        else:
            extra_context['auction_creator_company_name'] = None
            extra_context['auction_creator_phone_number'] = None
            extra_context['auction_creator_email'] = None

        # Customize the title
        extra_context['title'] = f'Order #{obj.id} for {obj.user.company_name} - {obj.status.capitalize()} '

        return super().change_view(request, object_id, form_url, extra_context)

    def user_email(self, obj):
        return obj.user.email

    user_email.short_description = 'User Email'

    def auction_creator_company_name(self, obj):
        return obj.items.first().auction.creator.company_name if obj.items.exists() else None

    auction_creator_company_name.short_description = 'Seller Company Name'

    def auction_creator_phone_number(self, obj):
        return obj.items.first().auction.creator.phone_number if obj.items.exists() else None

    auction_creator_phone_number.short_description = 'Seller Phone Number'

    def auction_creator_email(self, obj):
        return obj.items.first().auction.creator.email if obj.items.exists() else None

    auction_creator_email.short_description = 'Seller Email'

    def save_model(self, request, obj, form, change):
        # Calculate items total
        items_total = sum(item.total_price() for item in obj.items.all())
        # Ensure shipping charges are a Decimal
        shipping_charges = Decimal(obj.get_shipping_charges())
        # Calculate total amount
        obj.total_amount = items_total + obj.tax_amount + shipping_charges
        super().save_model(request, obj, form, change)


admin.site.register(Order, OrderAdmin)


class IsReadFilter(admin.SimpleListFilter):
    title = 'Read Status'
    parameter_name = 'is_read'

    def lookups(self, request, model_admin):
        return (
            ('read', 'Read'),
            ('unread', 'Unread'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'read':
            return queryset.filter(date_read__isnull=False)
        if self.value() == 'unread':
            return queryset.filter(date_read__isnull=True)
        return queryset


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('subject', 'sender', 'recipient', 'date_sent', 'message_type', 'is_read')
    list_filter = ('message_type', IsReadFilter)
    search_fields = ('subject', 'body', 'sender__username', 'recipient__username')
    readonly_fields = ('date_sent', 'date_responded')

    def save_model(self, request, obj, form, change):
        if not change:  # When creating a new message
            obj.sender = request.user
        super().save_model(request, obj, form, change)


# AUCTIONS
class ProductDetailInline(admin.TabularInline):
    model = ProductDetail
    extra = 0  # Prevent extra empty forms
    readonly_fields = ('sku', 'reference_number', 'lot_number', 'production_date', 'expiration_date')
    can_delete = False


class BidInline(admin.TabularInline):
    model = Bid
    extra = 0  # Prevent extra empty forms
    readonly_fields = ('user', 'amount', 'date')
    can_delete = False  # Prevent deletion of bids from the admin interface


class AuctionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'title', 'creator', 'category', 'date_created', 'quantity_available', 'starting_bid',
        'reserve_bid', 'current_bid', 'buyItNowPrice', 'active', 'auction_end_date',
        'days_remaining', 'highest_bid', 'highest_bidder'
    )
    list_filter = ('active', 'date_created', 'category', 'auction_duration')
    search_fields = ('title', 'description', 'creator__username', 'category__category_name', 'id')
    ordering = ('-date_created',)
    readonly_fields = (
        'creator', 'category', 'date_created', 'quantity_available', 'starting_bid', 'reserve_bid',
        'current_bid', 'buyItNowPrice', 'active', 'auction_end_date', 'days_remaining', 'hours_remaining',
        'formatted_time_remaining', 'count_watchers', 'total_views', 'get_image', 'highest_bid',
        'highest_bidder'
    )

    fieldsets = (
        ('General Information', {
            'fields': (
                'title', 'description', 'creator', 'category', 'date_created',
                'quantity_available', 'starting_bid', 'reserve_bid', 'current_bid', 'buyItNowPrice',
                'active', 'auction_type', 'package_type', 'auction_duration',
                'product_name', 'manufacturer', 'implantable', 'deviceSterile',
                'sterilizationPriorToUse', 'sell_full_lot', 'fullPackage', 'gmdnPTDefinition'
            )
        }),
        ('Fields', {
            'fields': (
                'auction_end_date', 'days_remaining', 'hours_remaining', 'formatted_time_remaining',
                'count_watchers', 'total_views', 'get_image', 'highest_bid', 'highest_bidder'
            ),
        }),
    )

    inlines = [
        BidInline,
        ProductDetailInline,
    ]

    # Custom method to display the highest bid
    def highest_bid(self, obj):
        highest_bid = obj.bid_set.order_by('-amount').first()
        return highest_bid.amount if highest_bid else "No bids"

    highest_bid.short_description = "Highest Bid"

    # Custom method to display the highest bidder
    def highest_bidder(self, obj):
        highest_bid = obj.bid_set.order_by('-amount').first()
        return highest_bid.user.username if highest_bid else "No bids"

    highest_bidder.short_description = "Highest Bidder"


admin.site.register(Auction, AuctionAdmin)

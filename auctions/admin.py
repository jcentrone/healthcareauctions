from django.contrib import admin

from .models import Auction, Image, Bid, Comment, Category, User, Message, Order, OrderItem, ShippingAddress, \
    BillingAddress, Payment, Carrier, Parcel

admin.site.register(Auction)
admin.site.register(Image)
admin.site.register(Bid)
admin.site.register(Comment)
admin.site.register(Category)
admin.site.register(User)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0  # Prevent extra empty forms

    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]


class ShippingAddressInline(admin.StackedInline):
    model = ShippingAddress
    extra = 0  # Prevent extra empty forms


class BillingAddressInline(admin.StackedInline):
    model = BillingAddress
    extra = 0  # Prevent extra empty forms


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0  # Prevent extra empty forms

    def get_fields(self, request, obj=None):
        payment = self.get_object_payment(obj)  # Ensure we are working with a Payment instance

        if payment:
            if payment.payment_method == 'credit_card':
                return (
                    'payment_method',
                    'card_last_four',
                    'decrypted_card_number',
                    'decrypted_expiration_date',
                    'decrypted_cvv'
                )
            elif payment.payment_method in ['paypal', 'zelle', 'venmo', 'cashapp']:
                return (
                    'payment_method',
                    'payer_email'
                )
            elif payment.payment_method == 'ach':
                return (
                    'payment_method',
                    'payer_email',  # Add other fields related to ACH if applicable
                )
        # Fallback to default fields if no payment instance is found or payment_method is unknown
        return (
            'payment_method',
            'card_last_four',
            'decrypted_card_number',
            'decrypted_expiration_date',
            'decrypted_cvv'
        )

    def get_readonly_fields(self, request, obj=None):
        payment = self.get_object_payment(obj)  # Ensure we are working with a Payment instance

        if payment:
            if payment.payment_method == 'credit_card':
                return (
                    'payment_method',
                    'card_last_four',
                    'decrypted_card_number',
                    'decrypted_expiration_date',
                    'decrypted_cvv'
                )
            elif payment.payment_method in ['paypal', 'zelle', 'venmo', 'cashapp']:
                return (
                    'payment_method',
                    'payer_email'
                )
            elif payment.payment_method == 'ach':
                return (
                    'payment_method',
                    'payer_email',  # Add other fields related to ACH if applicable
                )
        # Fallback to default fields if no payment instance is found or payment_method is unknown
        return super().get_readonly_fields(request, obj)

    # Helper method to get the Payment instance from the Order
    def get_object_payment(self, obj):
        # Ensure we are working with a Payment instance
        return obj.payment if isinstance(obj, Order) and hasattr(obj, 'payment') else obj

    # Decrypt sensitive fields
    def decrypted_card_number(self, obj):
        return obj.get_card_number() if obj.encrypted_card_number else 'N/A'

    decrypted_card_number.short_description = 'Card Number'

    def decrypted_expiration_date(self, obj):
        return obj.get_expiration_date() if obj.encrypted_expiration_date else 'N/A'

    decrypted_expiration_date.short_description = 'Expiration Date'

    def decrypted_cvv(self, obj):
        return obj.get_cvv() if obj.encrypted_cvv_number else 'N/A'

    decrypted_cvv.short_description = 'CVV'


class ParcelInline(admin.TabularInline):
    model = Parcel
    extra = 1
    fields = (
        'height',
        'length',
        'width',
        'weight',
    )


class CarrierInline(admin.StackedInline):
    model = Carrier
    extra = 0
    # readonly_fields = ('order',)


class OrderAdmin(admin.ModelAdmin):
    change_form_template = 'admin/admin_view_order.html'
    list_display = ('id', 'user', 'user_email', 'status', 'tax_amount', 'total_amount', 'created_at', 'updated_at', )
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email', 'id')

    inlines = [
        PaymentInline,
        OrderItemInline,
        CarrierInline,
        ParcelInline,
        # ShippingAddressInline,  # Comment out these lines
        # BillingAddressInline,
    ]

    fieldsets = (
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
        }),
        ('Order Information', {
            'fields': ('user', 'status', 'shipping_method', 'special_instructions')
        }),
        ('Tax & Total', {
            'fields': ('tax_amount', 'total_amount',),
        }),


    )
    readonly_fields = (
        'created_at',
        'updated_at',
        'user',
        'total_amount',
        'shipping_method',
        'special_instructions'
    )

    def get_inline_instances(self, request, obj=None):
        inline_instances = super().get_inline_instances(request, obj)
        # Remove ShippingAddressInline and BillingAddressInline from the default inlines
        return [
            inline for inline in inline_instances
            if not isinstance(inline, (ShippingAddressInline, BillingAddressInline))
        ]

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        obj = self.get_object(request, object_id)  # Fetch the Order instance

        # Create inline formsets
        shipping_inline = ShippingAddressInline(self.model, self.admin_site)
        billing_inline = BillingAddressInline(self.model, self.admin_site)

        shipping_formset = shipping_inline.get_formset(request, obj)(instance=obj)
        billing_formset = billing_inline.get_formset(request, obj)(instance=obj)

        # Pass the formsets to the template
        extra_context['shipping_inline'] = shipping_formset
        extra_context['billing_inline'] = billing_formset

        # Customize the title
        extra_context['title'] = f''

        return super().change_view(request, object_id, form_url, extra_context)

    def user_email(self, obj):
        return obj.user.email

    user_email.short_description = 'User Email'

    def save_model(self, request, obj, form, change):
        # Update total amount by recalculating it using tax and shipping charges
        if obj.tax_amount is None:
            obj.tax_amount = 0

        items_total = sum(item.price * item.quantity for item in obj.items.all())
        obj.total_amount = items_total + obj.tax_amount + obj.get_shipping_charges()

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

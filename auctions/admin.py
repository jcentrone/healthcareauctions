from django.contrib import admin

from .models import Auction, Image, Bid, Comment, Category, User, Message, Order, OrderItem, ShippingAddress, \
    BillingAddress, Payment

admin.site.register(Auction)
admin.site.register(Image)
admin.site.register(Bid)
admin.site.register(Comment)
admin.site.register(Category)
admin.site.register(User)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0  # Prevent extra empty forms


class ShippingAddressInline(admin.StackedInline):
    model = ShippingAddress
    extra = 0  # Prevent extra empty forms


class BillingAddressInline(admin.StackedInline):
    model = BillingAddress
    extra = 0  # Prevent extra empty forms


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0  # Prevent extra empty forms
    fields = (
        'status',
        'transaction_id',
        'payer_email',
        'payment_method',
        'card_last_four',
        'decrypted_card_number',
        'decrypted_expiration_date',
        'decrypted_cvv',
    )
    readonly_fields = (
        'payer_email',
        'payment_method',
        'card_last_four',
        'decrypted_card_number',
        'decrypted_expiration_date',
        'decrypted_cvv'
    )

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

    # def decrypted_payer_email(self, obj):
    #     return obj.decrypt_data(obj.payer_email) if obj.payer_email else 'N/A'
    # decrypted_payer_email.short_description = 'Payer Email'


class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'user_email', 'status', 'total_amount', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email', 'id')

    inlines = [
        PaymentInline,
        OrderItemInline,
        ShippingAddressInline,
        BillingAddressInline,

    ]

    fieldsets = (
        (None, {
            'fields': ('user', 'status', 'total_amount', 'shipping_method', 'special_instructions')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
        }),
    )
    readonly_fields = ('created_at', 'updated_at')

    # Add user's email to the admin view
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'


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

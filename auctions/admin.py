from django.contrib import admin

from .models import Auction, Image, Bid, Comment, Category, User, Message

admin.site.register(Auction)
admin.site.register(Image)
admin.site.register(Bid)
admin.site.register(Comment)
admin.site.register(Category)
admin.site.register(User)


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

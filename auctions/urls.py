from django.contrib.auth import views as auth_views
from django.urls import path

from . import views
from .views import CustomPasswordChangeView

urlpatterns = [
    path('', views.index, name='index'),
    path('dashboard', views.dashboard, name='dashboard'),
    path('login', views.login_view, name='login'),
    path('logout', views.logout_view, name='logout'),
    path('register', views.register, name='register'),
    path('privacy', views.privacy_policy, name='privacy_policy'),
    path('terms', views.terms_and_conditions, name='terms_and_conditions'),
    path('auction/create', views.auction_create, name='auction_create'),
    path('auction/active', views.active_auctions_view, name='active_auctions_view'),
    path('auction/active/<str:category_name>', views.active_auctions_view, name='active_auctions_view'),
    path('auction/active/id/<int:auction_id>/', views.active_auctions_view, name='active_auctions_with_id'),
    path('auction/watchlist', views.watchlist_view, name='watchlist_view'),
    path('auction/watchlist/<int:auction_id>/edit/<str:reverse_method>', views.watchlist_edit, name='watchlist_edit'),
    path('auction/<str:auction_id>', views.auction_details_view, name='auction_details_view'),
    path('auction/<str:auction_id>/bid', views.auction_bid, name='auction_bid'),
    path('auction/<str:auction_id>/close', views.auction_close, name='auction_close'),
    path('auction/<str:auction_id>/comment', views.auction_comment, name='auction_comment'),
    path('auction/relist/<int:auction_id>/', views.auction_relist, name='auction_relist'),

    path('categories/<str:category_name>', views.category_details_view, name='category_details_view'),
    path('api/classify-device/', views.classify_device_view, name='classify_device'),
    path('barcode_scanner/', views.barcode_scanner, name='barcode_scanner'),
    path('import_excel/', views.import_excel, name='import_excel'),
    path('download-excel/', views.download_excel, name='download_excel'),
    path('add-to-cart/<int:auction_id>/', views.add_to_cart, name='add_to_cart'),
    path('cart/', views.view_cart, name='view_cart'),
    path('checkout/', views.checkout, name='checkout'),
    path('order-confirmation/<int:order_id>/', views.order_confirmation, name='order_confirmation'),
    path('remove-from-cart/<int:item_id>/', views.remove_from_cart, name='remove_from_cart'),
    path('api/get-auction-images/<int:auction_id>/', views.get_auction_images, name='get_auction_images'),
    path('auction/<int:auction_id>/product-details/', views.get_auction_product_details,
         name='get_auction_additional_details'),
    path('track-auction-view/', views.track_auction_view, name='track_auction_view'),
    path('inbox/', views.inbox, name='inbox'),
    path('message/<int:message_id>/', views.message_detail, name='message_detail'),
    path('send_message/<int:auction_id>/', views.send_message, name='send_message'),
    path('message/reply/<int:message_id>/', views.send_reply, name='send_reply'),
    path('message/validate/<str:message>/', views.validate_message, name='validate_message'),
    path('messages/mark-as-read/<int:thread_id>/', views.mark_messages_as_read, name='mark_messages_as_read'),
    path('send-customer-service-message/', views.send_customer_service_message, name='send_customer_service_message'),
    path('messages/archive/<int:message_id>/', views.archive_message, name='archive_message'),
    path('track-parcel/<int:parcel_id>/', views.track_parcel_view, name='track_parcel'),
    path('password-change/', CustomPasswordChangeView.as_view(), name='password_change'),
    path('password-change/done/',
         auth_views.PasswordChangeDoneView.as_view(template_name='registration/password_change_done.html'),
         name='password_change_done'),
    path('order/<int:order_id>/add-note/', views.add_order_note, name='add_order_note'),
    path('edit-auction/<int:auction_id>/', views.edit_auction, name='edit_auction'),
    path('post_listing/<int:auction_id>/', views.post_listing, name='post_listing'),
    path('export_listings/', views.export_listings_to_excel, name='export_listings'),

]

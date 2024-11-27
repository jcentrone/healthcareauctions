from django.contrib.auth import views as auth_views
from django.contrib.sitemaps.views import sitemap
from django.contrib.staticfiles.storage import staticfiles_storage
from django.urls import path
from django.views.generic import RedirectView

from . import views
from .sitemaps import AuctionSitemap, CategorySitemap, StaticViewSitemap

sitemaps = {
    'auctions': AuctionSitemap,
    'categories': CategorySitemap,
    'static': StaticViewSitemap,
}

urlpatterns = [
    path('', views.index, name='index'),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('dashboard', views.dashboard, name='dashboard'),
    path('login', views.login_view, name='login'),
    path('logout', views.logout_view, name='logout'),
    path('register', views.register, name='register'),
    path('privacy', views.privacy_policy, name='privacy_policy'),
    path('terms', views.terms_and_conditions, name='terms_and_conditions'),
    path('auction/create', views.auction_create, name='auction_create'),
    path('auction/active', views.active_auctions_view, name='active_auctions_view'),
    path('auction/active/<str:category_name>', views.active_auctions_view, name='active_auctions_view_with_category'),
    path('auction/active/id/<int:auction_id>/', views.active_auctions_view, name='active_auctions_with_id'),
    path('auction/watchlist', views.watchlist_view, name='watchlist_view'),
    path('auction/watchlist/<int:auction_id>/edit/<str:reverse_method>', views.watchlist_edit, name='watchlist_edit'),
    path('auction/<str:auction_id>/bid', views.auction_bid, name='auction_bid'),
    path('auction/<str:auction_id>/close', views.auction_close, name='auction_close'),
    path('auction/<str:auction_id>/comment', views.auction_comment, name='auction_comment'),
    path('auction/relist/<int:auction_id>/', views.auction_relist, name='auction_relist'),
    path('auction/delete/<int:auction_id>/', views.auction_delete_view, name='auction-delete'),
    path('api/get-image-formset/<int:auction_id>/', views.get_image_formset, name='get_image_formset'),
    path('auction/edit/<int:auction_id>/', views.edit_auction, name='edit_auction'),
    # path('categories/<str:category_name>', views.category_details_view, name='category_details_view'),
    path('categories/<int:id>/', views.category_details_view, name='category_details_view'),

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

    path('order/<int:order_id>/add-note/', views.add_order_note, name='add_order_note'),
    path('edit-auction/<int:auction_id>/', views.edit_auction, name='edit_auction'),
    path('post_listing/<int:auction_id>/', views.post_listing, name='post_listing'),
    path('export_listings/', views.export_listings_to_excel, name='export_listings'),
    path('scrape/', views.scrape, name='scrape'),
    path('save-all-forms/', views.save_all_forms, name='save_all_forms'),
    path('get_default_image/', views.get_default_image, name='get_default_image'),
    path('get_default_image_blob/', views.get_default_image_blob, name='get_default_image_blob'),
    path('how_we_work/', views.how_we_work, name='how_we_work'),
    path('scan_to_excel/', views.scan_to_excel, name='scan_to_excel'),
    # Password reset links (ref: https://docs.djangoproject.com/en/3.2/topics/auth/default/#module-django.contrib.auth.views)
    path('password-reset/',
         auth_views.PasswordResetView.as_view(
             template_name='registration/password_reset_form.html',
             email_template_name='registration/password_reset_email.html',
             subject_template_name='registration/password_reset_subject.txt',
         ),
         name='password_reset'),
    path('password-reset/done/',
         auth_views.PasswordResetDoneView.as_view(template_name='registration/password_reset_done.html'),
         name='password_reset_done'),
    path('password-reset-confirm/<uidb64>/<token>/',
         auth_views.PasswordResetConfirmView.as_view(template_name='registration/password_reset_confirm.html'),
         name='password_reset_confirm'),
    path('password-reset-complete/',
         auth_views.PasswordResetCompleteView.as_view(template_name='registration/password_reset_complete.html'),
         name='password_reset_complete'),
    path('api/suggest_price/<str:ref_id>/', views.get_fair_price, name='suggest_price'),
    path('api/get-classification-data/', views.get_classification_data, name='get_classification_data'),

    path('get_synergy_data/<str:reference_number>/', views.get_synergy_data, name='get_synergy_data'),
    path('robots.txt', RedirectView.as_view(url=staticfiles_storage.url('robots.txt'))),

]

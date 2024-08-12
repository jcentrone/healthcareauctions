from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('dashboard', views.dashboard, name='dashboard'),
    path('login', views.login_view, name='login'),
    path('logout', views.logout_view, name='logout'),
    path('register', views.register, name='register'),
    path('privacy', views.privacy_policy, name='privacy_policy'),
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
    path('categories/<str:category_name>', views.category_details_view, name='category_details_view'),
    path('api/classify-device/', views.classify_device_view, name='classify_device'),
    path('barcode_scanner/', views.barcode_scanner, name='barcode_scanner'),
    path('import_excel/', views.import_excel, name='import_excel'),
    path('download-excel/', views.download_excel, name='download_excel'),
    path('new_header/', views.header, name='new_header'),
    path('add-to-cart/<int:auction_id>/', views.add_to_cart, name='add_to_cart'),
    path('cart/', views.view_cart, name='view_cart'),
    path('remove-from-cart/<int:item_id>/', views.remove_from_cart, name='remove_from_cart'),
    path('api/get-auction-images/<int:auction_id>/', views.get_auction_images, name='get_auction_images'),
    path('auction/<int:auction_id>/product-details/', views.get_auction_product_details,
         name='get_auction_additional_details'),
    path('track-auction-view/', views.track_auction_view, name='track_auction_view'),

]

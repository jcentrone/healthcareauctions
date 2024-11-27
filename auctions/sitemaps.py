from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from .models import Auction, Category

class AuctionSitemap(Sitemap):
    changefreq = 'daily'
    priority = 0.8

    def items(self):
        return Auction.objects.filter(active=True)

    def lastmod(self, obj):
        return obj.date_created

class CategorySitemap(Sitemap):
    changefreq = 'weekly'
    priority = 0.6

    def items(self):
        return Category.objects.all()

    def location(self, obj):
        # return reverse('category_details_view', args=[obj.category_name])
        return reverse('category_details_view', args=[obj.id])

class StaticViewSitemap(Sitemap):
    changefreq = 'monthly'
    priority = 0.5

    def items(self):
        return ['index', 'active_auctions_view']

    def location(self, item):
        return reverse(item)

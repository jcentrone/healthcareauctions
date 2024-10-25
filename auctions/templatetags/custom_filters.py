from django import template

register = template.Library()


@register.filter(name='titlecase')
def titlecase(value):
    return value.title() if isinstance(value, str) else value


@register.filter(name='capitalize_all')
def capitalize_all(value):
    return value.upper() if isinstance(value, str) else value


@register.filter
def sort_list(value):
    return sorted(value)


@register.filter
def get_item(dictionary, key):
    if isinstance(dictionary, dict):
        return dictionary.get(key)
    return None


@register.filter
def sort_by_label(value):
    labels = {
        '': 'Best Match',
        'ending_soonest': 'Ending Soonest',
        'newly_listed': 'Newly Listed',
        'price_highest': 'Price Highest',
        'price_lowest': 'Price Lowest',
        'fewest_bids': 'Fewest Bids',
        'most_bids': 'Most Bids',
    }
    return labels.get(value, 'Best Match')


@register.filter
def time_filter_label(value):
    labels = {
        '': 'All Days',
        'today': 'Today',
        'tomorrow': 'Tomorrow',
        'next_3_days': 'Next 3 Days',
        'next_5_days': 'Next 5 Days',
        'next_7_days': 'Next 7 Days',
        'next_10_days': 'Next 10 Days',
    }
    return labels.get(value, 'Ending All Days')


@register.filter
def auction_type_label(value):
    labels = {
        '': 'All',
        'Auction': 'Auction',
        'Sale': 'Get It Now',
    }
    return labels.get(value, 'Listing Type')


@register.filter
def expired_filter_label(value):
    labels = {
        '': 'All Items',
        'expired': 'Expired Items',
        'not_expired': 'In Date Items',
    }
    return labels.get(value, 'All Items')


@register.filter
def mul(value, arg):
    return float(value) * float(arg)

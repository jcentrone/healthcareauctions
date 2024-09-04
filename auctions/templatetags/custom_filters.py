from django import template

register = template.Library()


@register.filter(name='titlecase')
def titlecase(value):
    return value.title() if isinstance(value, str) else value


@register.filter
def get_item(dictionary, key):
    if isinstance(dictionary, dict):
        return dictionary.get(key)
    return None

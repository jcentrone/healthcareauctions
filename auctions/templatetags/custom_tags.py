from django import template
from django.shortcuts import get_object_or_404
from auctions.models import Category, Message, Cart

register = template.Library()


@register.inclusion_tag('header_new.html', takes_context=True)
def render_header(context):
    # Simply pass the context through to the template
    return context

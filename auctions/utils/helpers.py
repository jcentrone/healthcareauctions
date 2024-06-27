import json
import os

from google.oauth2 import service_account

from auctions.models import Category


def get_or_create_category(path):
    """
    This function takes a list of category names representing the path of the category hierarchy.
    It returns the Category object and ensures the hierarchy is created in the database.
    """
    parent = None
    for category_name in path:
        category, created = Category.objects.get_or_create(category_name=category_name, parent=parent)
        parent = category
    return parent


def classify_and_save_device(device_data):
    """
    This function classifies the device based on its data and saves the category hierarchy in the database.
    """
    medical_specialty = device_data.medical_specialty_description, 'Unclassified'
    device_class = "Class " + device_data.get('device_class', 'Unknown')
    device_name = device_data.get('device_name', 'Unknown Device')

    # Create the full path for the category
    category_path = [medical_specialty, device_class, device_name]

    # Get or create the category
    category = get_or_create_category(category_path)

    return category


def update_categories_from_fda(fda_data):
    specialty = fda_data.get('medical_specialty_description', None)
    if specialty:
        parent_category, parent_created = Category.objects.get_or_create(
            category_name=specialty,
            parent=None  # Top-level category
        )
        device_name = fda_data.get('device_name', None)
        if device_name:
            device_category, device_created = Category.objects.get_or_create(
                category_name=device_name,
                parent=parent_category
            )
            # Now you can return the ID of the device category
            return {
                "category_name": f"{parent_category.category_name} / {device_name}",
                "value": device_category.id  # ID of the child category
            }

    return None




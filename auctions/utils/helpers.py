import json
import os

from google.oauth2 import service_account

from auctions.models import Category, MedicalSpecialty


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
    print(fda_data)
    medical_specialty_code = fda_data.get('medical_specialty_code', None)
    medical_specialty_description = fda_data.get('medical_specialty_description', None)
    device_name = fda_data.get('device_name', None)

    print(medical_specialty_code)
    print(medical_specialty_description)
    print(device_name)

    if medical_specialty_code:
        medical_specialty_code = medical_specialty_code.upper()  # Ensure consistency
        medical_specialty, created = MedicalSpecialty.objects.get_or_create(
            code=medical_specialty_code,
            defaults={'description': medical_specialty_description}
        )
        if not created and medical_specialty_description:
            # Optionally update the description if it has changed
            if medical_specialty.description != medical_specialty_description:
                medical_specialty.description = medical_specialty_description
                medical_specialty.save()

        category, created = Category.objects.get_or_create(
            category_name=device_name,
            medical_specialty=medical_specialty
        )
        if not created and device_name:
            # Optionally update the description if it has changed
            if category.category_name != device_name:
                category.category_name = device_name
                category.save()

        # Now you can return the ID of the device category
        return {
            "category_name": f"{medical_specialty.description} / {category.category_name}",
            "value": category.id  # ID of the child category
        }





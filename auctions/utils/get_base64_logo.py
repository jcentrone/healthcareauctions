import base64
from django.conf import settings
import os

def get_logo_base64():
    logo_path = os.path.join(settings.STATIC_ROOT, 'images', 'logo3.jpg')  # Adjust the path accordingly
    with open(logo_path, 'rb') as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

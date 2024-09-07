import requests
from bs4 import BeautifulSoup
from django.core.files.base import ContentFile

from auctions.models import ProductImage

''' 
Call this function from a button on the client side:
<a href="{% url 'scrape' %}" class="btn btn-outline-primary" >Scrape</a>
'''

def upload_to_gcs(image_url, reference_number):
    try:
        response = requests.get(image_url)
        response.raise_for_status()  # Will raise an HTTPError if the HTTP request returned an unsuccessful status code
        if response.status_code == 200:
            # Create a file name for the image
            file_name = f'{reference_number}.jpg'

            # Create a ContentFile from the response content
            content = ContentFile(response.content)

            # Save the image using the ImageField's save method
            product_image = ProductImage(reference_number=reference_number)
            product_image.image.save(file_name, content, save=True)

            # Return the URL of the saved image
            return product_image.image.url
    except requests.exceptions.RequestException as e:
        print(f"Error downloading image {image_url}: {e}")
        return None


def scrape_images(url):
    try:
        response = requests.get(url)
        response.raise_for_status()  # Will raise an HTTPError if the HTTP request returned an unsuccessful status code
        soup = BeautifulSoup(response.content, 'html.parser')

        product_containers = soup.find_all('div', class_='grid-product__content')

        for container in product_containers:
            # Get the reference number from the grid-product__title div
            reference_number_div = container.find('div', class_='grid-product__title')
            if reference_number_div:
                reference_number = reference_number_div.get_text(strip=True)
                print('Reference Number:', reference_number)

                # Get the image URL from the data-bgset attribute
                image_div = container.find('div', class_='grid__image-ratio')
                if image_div:
                    data_bgset = image_div.get('data-bgset')
                    if data_bgset:
                        image_url = data_bgset.split()[3]  # This will give you the first image URL
                        if image_url.startswith('//'):
                            image_url = 'https:' + image_url  # Add the protocol if missing

                        print('Image URL:', image_url)

                        # Upload to Google Cloud Storage using the custom storage backend
                        gcs_url = upload_to_gcs(image_url, reference_number)
                        if gcs_url:
                            print(f"Image saved at: {gcs_url}")
                            # Save to the database
                            ProductImage.objects.get_or_create(
                                reference_number=reference_number,
                                defaults={'image': gcs_url}
                            )
    except requests.exceptions.RequestException as e:
        print(f"Error fetching page {url}: {e}")

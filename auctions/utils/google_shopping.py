import os

from django.conf import settings
from google.shopping.merchant_products_v1beta import ProductWeight, ShippingWeight
from google.shopping.merchant_products_v1beta.services.product_inputs_service import ProductInputsServiceClient
from google.shopping.merchant_products_v1beta.types import ProductDetail as APIProductDetail
from google.shopping.merchant_products_v1beta.types import ProductInput, InsertProductInputRequest, products_common
from google.shopping.merchant_products_v1beta.types.productinputs import DeleteProductInputRequest
from google.shopping.type.types import types, Price
from tenacity import retry, wait_random_exponential, stop_after_attempt

GOOGLE_MERCHANT_CENTER_ID = os.environ.get("GOOGLE_MERCHANT_CENTER_ID")

MAX_ATTEMPTS = 6


def build_product_input(listing):
    product_input = ProductInput()

    # Required fields
    product_input.channel = types.Channel.ChannelEnum.ONLINE
    product_input.offer_id = str(listing.id)
    product_input.content_language = "en"
    product_input.feed_label = "US"

    # Product attributes
    attributes = products_common.Attributes()
    attributes.title = listing.title
    attributes.description = listing.description
    attributes.link = f"https://www.healthcareauctions.com{listing.get_absolute_url()}"

    # Fetch all images
    images = listing.get_images.all()
    num_images = images.count()
    print(f"Number of images associated with auction {listing.id}: {num_images}")

    if num_images > 0:
        # Use the first image as the main image_link
        main_image = images[0]
        main_image_url = main_image.image.url
        if not main_image_url.startswith('http'):
            main_image_url = f"https://www.healthcareauctions.com{main_image_url}"
        attributes.image_link = main_image_url
        print(f"Main Image Link: {attributes.image_link}")  # For debugging

        # Use the rest as additional_image_links
        additional_images = images[1:]
        additional_image_links = []
        for img in additional_images:
            img_url = img.image.url
            if not img_url.startswith('http'):
                img_url = f"https://www.healthcareauctions.com{img_url}"
            additional_image_links.append(img_url)
            print(f"Additional Image Link: {img_url}")  # For debugging

        if additional_image_links:
            attributes.additional_image_links = additional_image_links  # Correct field name
    else:
        print(f"No images found for auction {listing.id}")

    # Price
    amount = listing.buyItNowPrice or listing.starting_bid or 0.00
    attributes.price = Price()
    attributes.price.amount_micros = int(float(amount) * 1_000_000)
    attributes.price.currency_code = 'USD'

    # Product Weight
    attributes.product_weight = ProductWeight()
    attributes.product_weight.value = 5
    attributes.product_weight.unit = 'lb'

    # Shipping Weight
    attributes.shipping_weight = ShippingWeight()
    attributes.shipping_weight.value = 5
    attributes.shipping_weight.unit = 'lb'

    # Availability
    attributes.availability = 'in stock' if listing.active else 'out of stock'

    # Brand
    attributes.brand = listing.manufacturer

    # Fetch the first ProductDetail associated with the listing
    product_detail = listing.product_details.first()

    # Condition
    attributes.condition = 'new'  # or 'used' based on your data

    # Expiration date
    if listing.auction_ending_date:
        attributes.expiration_date = listing.auction_ending_date.isoformat()

    # Additional Product Details: Reference Number, Lot Number, Exp. Date
    attributes.product_details = []  # Correct field name

    if product_detail:
        if product_detail.reference_number:
            ref_numb = APIProductDetail()
            ref_numb.section_name = 'Additional Details'
            ref_numb.attribute_name = 'Reference Number'
            ref_numb.attribute_value = product_detail.reference_number
            attributes.product_details.append(ref_numb)

        if product_detail.lot_number:
            lot_numb = APIProductDetail()
            lot_numb.section_name = 'Additional Details'
            lot_numb.attribute_name = 'Lot Number'
            lot_numb.attribute_value = product_detail.lot_number
            attributes.product_details.append(lot_numb)

        if product_detail.expiration_date:
            exp_date = APIProductDetail()
            exp_date.section_name = 'Additional Details'
            exp_date.attribute_name = 'Expiration Date'
            exp_date.attribute_value = product_detail.expiration_date.isoformat()
            attributes.product_details.append(exp_date)

    # Google product category
    if hasattr(listing.category, 'google_product_category'):
        attributes.google_product_category = listing.category.google_product_category

    # Set attributes to product_input
    product_input.attributes = attributes

    return product_input


# Add the product to Google Merchant Center
@retry(wait=wait_random_exponential(multiplier=1, max=40), stop=stop_after_attempt(MAX_ATTEMPTS), reraise=True)
def add_to_google(listing):
    client = ProductInputsServiceClient(credentials=settings.GS_CREDENTIALS)

    product_input = build_product_input(listing)

    merchant_id = GOOGLE_MERCHANT_CENTER_ID
    parent = f"accounts/{merchant_id}"
    data_source = f"accounts/{merchant_id}/dataSources/10459497661"

    request = InsertProductInputRequest(
        parent=parent,
        product_input=product_input,
        data_source=data_source,
    )

    # delete_from_google(id_to_delete)

    try:
        response = client.insert_product_input(request=request)
        print(f"Inserted product with ID: {response.product}")
        return response
    except Exception as e:
        print(f"Error adding product {listing.id} to Google Merchant Center: {e}")
        raise e


@retry(wait=wait_random_exponential(multiplier=1, max=40), stop=stop_after_attempt(MAX_ATTEMPTS), reraise=True)
def delete_from_google(id_to_delete):
    client = ProductInputsServiceClient(credentials=settings.GS_CREDENTIALS)

    merchant_id = GOOGLE_MERCHANT_CENTER_ID
    data_source_id = '10459497661'  # Replace with your actual data source ID
    data_source = f"accounts/{merchant_id}/dataSources/{data_source_id}"

    # The name of the product input to delete
    product_input_name = f"accounts/{merchant_id}/productInputs/online~en~US~{id_to_delete}"

    request = DeleteProductInputRequest(
        name=product_input_name,
        data_source=data_source,
    )

    try:
        client.delete_product_input(request=request)
        print(f"Deleted product input with ID: {id_to_delete}")
    except Exception as e:
        print(f"Error deleting product {id_to_delete} from Google Merchant Center: {e}")
        raise e

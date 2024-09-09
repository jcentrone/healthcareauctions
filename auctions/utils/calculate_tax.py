import os

import requests
from django.conf import settings



# ZIP_TAX_API_KEY = 'a5ROqNT2axDJmrSlGQFkMsKx'


def get_sales_tax(zip_code, state=None, city=None):
    """
    Function to get the sales tax rate for a given ZIP code using the Zip-Tax API.

    Parameters:
    - zip_code (str): The ZIP code for which to retrieve the sales tax rate.
    - api_key (str): Your Zip-Tax API key.
    - state (str, optional): The state for more accurate results.
    - city (str, optional): The city for more accurate results.

    Returns:
    - dict: A dictionary containing the tax information if successful, or an error message.
    """
    url = "https://api.zip-tax.com/request/v40"

    # Set up the parameters for the request
    params = {
        "key": settings.ZIP_TAX_API_KEY,
        "postalcode": zip_code,
        "state": state,
        "city": city,
        "format": "json"
    }

    if state:
        params["state"] = state
    if city:
        params["city"] = city

    try:
        # Send the request to the API
        response = requests.get(url, params=params)
        response.raise_for_status()  # Raise an error for bad HTTP status codes

        # Parse the JSON response
        data = response.json()

        # Check if the request was successful
        if data.get('rCode') == 100:
            return data['results'][0]  # Return the first result (there may be multiple results)
        else:
            return {"error": f"API returned an error: {data.get('rCode')}"}

    except requests.exceptions.RequestException as e:
        return {"error": f"Request failed: {e}"}




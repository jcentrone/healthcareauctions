# from zcrmsdk import ZCRMRestClient

from zcrmsdk import ZCRMRestClient
from zcrmsdk import ZCRMRecord, ZCRMModule
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def initialize_zoho():
    configuration = {
        'client_id': 'YOUR_CLIENT_ID',
        'client_secret': 'YOUR_CLIENT_SECRET',
        'redirect_uri': 'YOUR_REDIRECT_URI',
        'refresh_token': 'YOUR_REFRESH_TOKEN',
        'currentUserEmail': 'YOUR_ZOHO_USER_EMAIL',
        'apiBaseUrl': 'https://www.zohoapis.com',  # Use '.com' or your region
        'apiVersion': 'v2',
        'sandbox': False,
    }
    ZCRMRestClient.initialize(configuration)


def create_or_update_zoho_account_and_contact(user):
    initialize_zoho()

    # Prepare Account data
    account_data = {
        'Account_Name': user.company_name or user.username,
        'Phone': user.phone_number,
    }

    # Prepare Contact data
    contact_data = {
        'First_Name': user.first_name or '',
        'Last_Name': user.last_name or user.username,
        'Email': user.email,
        'Phone': user.phone_number,
    }

    # Include Address Information
    default_address = user.addresses.filter(use_as_default_shipping_method_address=True).first()
    if default_address:
        account_data.update({
            'Billing_Street': default_address.street,
            'Billing_City': default_address.city,
            'Billing_State': default_address.state,
            'Billing_Code': default_address.zip_code,
            'Billing_Country': default_address.country,
            # Similarly for Shipping Address if needed
        })

    try:
        # Handle Account
        account = handle_account(account_data)

        # Handle Contact
        contact = handle_contact(contact_data, account_id=account.entity_id)

        logger.info(f"Successfully synced user '{user.username}' to Zoho CRM.")
    except Exception as e:
        logger.error(f"Error syncing user '{user.username}' to Zoho CRM: {e}")


def handle_account(account_data):
    account_module = ZCRMModule.get_instance('Accounts')
    criteria = f"(Account_Name:equals:{account_data['Account_Name']})"
    response = account_module.search_records(criteria=criteria)
    accounts = response.data

    if accounts:
        account = accounts[0]
        for field, value in account_data.items():
            account.set_field_value(field, value)
        update_response = account.update()
        return account
    else:
        account = ZCRMRecord.get_instance('Accounts')
        for field, value in account_data.items():
            account.set_field_value(field, value)
        create_response = account.create()
        return create_response.data[0]


def handle_contact(contact_data, account_id):
    contact_module = ZCRMModule.get_instance('Contacts')
    criteria = f"(Email:equals:{contact_data['Email']})"
    response = contact_module.search_records(criteria=criteria)
    contacts = response.data

    # Link Contact to Account
    contact_data['Account_Name'] = {'id': account_id}

    if contacts:
        contact = contacts[0]
        for field, value in contact_data.items():
            contact.set_field_value(field, value)
        update_response = contact.update()
        return contact
    else:
        contact = ZCRMRecord.get_instance('Contacts')
        for field, value in contact_data.items():
            contact.set_field_value(field, value)
        create_response = contact.create()
        return create_response.data[0]

from storages.backends.gcloud import GoogleCloudStorage
from google.oauth2 import service_account
import os
import json

# Load Google credentials from environment variable
credentials = None
google_credentials_raw = os.getenv('GOOGLE_CREDENTIALS')
if google_credentials_raw:
    service_account_info = json.loads(google_credentials_raw)
    credentials = service_account.Credentials.from_service_account_info(service_account_info)


class ProfileImageStorage(GoogleCloudStorage):
    location = 'profile_images'
    bucket_name = 'healthcare_auctions_auction_images'
    credentials = credentials


class CompanyLogoStorage(GoogleCloudStorage):
    location = 'company_logos'
    bucket_name = 'healthcare_auctions_auction_images'
    credentials = credentials


class W9Storage(GoogleCloudStorage):
    location = 'w9_storage'
    bucket_name = 'healthcare_auctions_w9_storage'
    credentials = credentials


class ResellerCertificateStorage(GoogleCloudStorage):
    location = 'reseller_certificate_storage'
    bucket_name = 'healthcare_auctions_w9_storage'
    credentials = credentials


class GenericImageStorage(GoogleCloudStorage):
    location = 'generic_image_storage'
    bucket_name = 'healthcare_auctions_generic_image_storage'
    credentials = credentials

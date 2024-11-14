import json
import os
import secrets

import dj_database_url
from decouple import config
from google.oauth2 import service_account

from .storage_backends import ProfileImageStorage, CompanyLogoStorage

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    default=secrets.token_urlsafe(nbytes=64),
)

SITE_URL = 'https://www.healthcareauctions.com'

# DEBUG = config('DEBUG', default=False, cast=bool)
DEBUG = True

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'medical-auctions-757e84a2ed6f.herokuapp.com',
    '[::1]',
    '0.0.0.0',
    'healthcareauctions.com',
    'www.healthcareauctions.com',
    # '*'
]

# Get the environment variable; default to False if not set
# SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'
#
# # Other security settings
# SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False') == 'True'
# CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'False') == 'True'
# SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '0'))
# SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'False') == 'True'
# SECURE_HSTS_PRELOAD = os.environ.get('SECURE_HSTS_PRELOAD', 'False') == 'True'


CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True

SECURE_SSL_REDIRECT = False
# SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

CSRF_TRUSTED_ORIGINS = [
    'https://healthcareauctions.com',
    'https://www.healthcareauctions.com',
]

# Application definition

INSTALLED_APPS = [
    # Local
    'auctions',
    # Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sitemaps',
    'django_apscheduler',

    # other apps
    'storages',
    'rangefilter',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'auctions.context_processors.header_data'
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# https://docs.djangoproject.com/en/3.2/ref/settings/#databases


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DATABASE_NAME'),
        'USER': config('DATABASE_USER'),
        'PASSWORD': config('DATABASE_PASS'),
        'HOST': config('DATABASE_HOST'),
        'PORT': '',  # leave blank so the default port is selected
    }
}

AUTH_USER_MODEL = 'auctions.User'

# Password validation
# https://docs.djangoproject.com/en/3.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/3.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True

# Default primary key field type
# https://docs.djangoproject.com/en/3.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.2/howto/static-files/

STATIC_URL = '/static/'

# Location where Django collects all static files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Location where we will store our static files
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]

# Use default file storage for static files (local filesystem or another backend)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Google Cloud Storage settings
GS_BUCKET_NAME = 'healthcare_auctions_auction_images'
GS_PROJECT_ID = 'healthcare-auctions'
# GS_DEFAULT_ACL = 'publicRead'


# Use GCS for media files
DEFAULT_FILE_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'

# Load Google credentials from environment variable
credentials = None
google_credentials_raw = os.getenv('GOOGLE_CREDENTIALS')
if google_credentials_raw:
    service_account_info = json.loads(google_credentials_raw)
    credentials = service_account.Credentials.from_service_account_info(service_account_info)

GS_CREDENTIALS = credentials

# Additional settings
MEDIA_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Retrieve the encryption key from the environment variable
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY',
                           default=secrets.token_urlsafe(nbytes=64))

# Ensure the key is not missing
if not ENCRYPTION_KEY:
    raise ValueError("No ENCRYPTION_KEY set for Fernet symmetric encryption.")

# UPS Credentials
UPS_ACCESS_LICENSE_NUMBER = os.environ.get('UPS_ACCESS_LICENSE_NUMBER')
UPS_USERNAME = os.environ.get('UPS_USERNAME')
UPS_PASSWORD = os.environ.get('UPS_PASSWORD')

# Zip Tax Credentials
ZIP_TAX_API_KEY = os.environ.get('ZIP_TAX_API_KEY')

# Mailjet API configuration
MAILJET_API_KEY = os.environ.get('MAILJET_API_KEY')
MAILJET_API_SECRET = os.environ.get('MAILJET_API_SECRET')

# Django Email Backend Configuration (Optional)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'in-v3.mailjet.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = MAILJET_API_KEY
EMAIL_HOST_PASSWORD = MAILJET_API_SECRET
DEFAULT_FROM_EMAIL = 'notifications@healthcareauctions.com'

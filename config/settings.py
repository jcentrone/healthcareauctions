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

# DEBUG = config('DEBUG', default=False, cast=bool)
DEBUG = True

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'medical-auctions-757e84a2ed6f.herokuapp.com',  # Note: Remove the 'https://' prefix
    '[::1]',
    '0.0.0.0',
    '*'
]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_apscheduler',
    # Local
    'auctions',
    # other apps
    'storages',
]

# Cronjobs
CRONJOBS = [
    ('0 * * * *', 'django.core.management.call_command', ['deactivate_expired_auctions']),
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
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
# DATABASES = {
#         "default": dj_database_url.config(
#             env="DATABASE_URL",
#             conn_max_age=600,
#             conn_health_checks=True,
#             ssl_require=True,
#         ),
#     }

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

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.2/howto/static-files/

STATIC_URL = '/static/'

# Location where Django collects all static files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Location where we will store our static files
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
# https://docs.djangoproject.com/en/3.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Google Cloud Storage settings
GS_BUCKET_NAME = 'healthcare_auctions_auction_images'
GS_PROJECT_ID = 'healthcare-auctions'

# Use default file storage for static files (local filesystem or another backend)
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

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
STATIC_URL = '/static/'

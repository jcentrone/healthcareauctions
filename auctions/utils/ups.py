import requests
from django.conf import settings


def track_parcel(parcel):
    if parcel.carrier.carrier != 'UPS':
        raise ValueError("Currently, only UPS tracking is supported.")

    url = "https://onlinetools.ups.com/rest/Track"
    headers = {
        "Content-Type": "application/json",
        "AccessLicenseNumber": settings.UPS_ACCESS_LICENSE_NUMBER,
        "Username": settings.UPS_USERNAME,
        "Password": settings.UPS_PASSWORD,
    }

    data = {
        "UPSSecurity": {
            "UsernameToken": {
                "Username": settings.UPS_USERNAME,
                "Password": settings.UPS_PASSWORD,
            },
            "ServiceAccessToken": {
                "AccessLicenseNumber": settings.UPS_ACCESS_LICENSE_NUMBER,
            },
        },
        "TrackRequest": {
            "Request": {
                "RequestOption": "1",
                "TransactionReference": {
                    "CustomerContext": "Tracking Parcel",
                },
            },
            "InquiryNumber": parcel.tracking_number,
        }
    }

    response = requests.post(url, json=data, headers=headers)

    if response.status_code == 200:
        tracking_info = response.json()
        status = tracking_info.get("TrackResponse", {}).get("Shipment", {}).get("Package", {}).get("Activity", {}).get(
            "Status", {}).get("Description", "Unknown")
        parcel.delivery_status = status.lower().replace(" ", "_")
        parcel.save()
        return tracking_info
    else:
        raise ValueError(f"Error fetching tracking data: {response.status_code}")

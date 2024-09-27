# your_app/utils.py

import pandas as pd
import logging as logger
from decimal import Decimal

from auctions.models import ComparativeSalesData


def calculate_fair_price(ref_id, discount_factor=0.35):
    """
    Calculate a fair price based on historical sales data with a static discount factor.
    Uses a weighted moving average to account for trends.
    """

    try:
        # Normalize ref_id to ensure consistent querying (e.g., uppercase)
        ref_id = ref_id.upper()

        # Fetch all sales data for the given ref_id
        sales_qs = ComparativeSalesData.objects.filter(ref_id__iexact=ref_id).order_by('sale_date')

        if not sales_qs.exists():
            return {"error": "No sales data found for the given REF#."}

        # Convert QuerySet to DataFrame
        data = pd.DataFrame(list(sales_qs.values('sale_date', 'unit_price', 'unit_cost', 'quantity')))

        # Ensure 'sale_date' is datetime
        data['sale_date'] = pd.to_datetime(data['sale_date'])

        # Convert unit_price and unit_cost to Decimal
        data['unit_price'] = data['unit_price'].apply(Decimal)
        data['unit_cost'] = data['unit_cost'].apply(Decimal)

        # Sort by 'sale_date'
        data = data.sort_values('sale_date')

        # Feature Engineering: Calculate days since the latest sale
        latest_date = data['sale_date'].max()
        data['days_since_sale'] = (latest_date - data['sale_date']).dt.days

        # Assign weights inversely proportional to days since sale
        data['weight'] = Decimal(1) / (data['days_since_sale'] + Decimal(1))  # Adding 1 to avoid division by zero

        # Validate weights
        if data['weight'].sum() == 0:
            logger.warning(f"Total weight is zero for ref_id: {ref_id}")
            return {"error": "Insufficient data to calculate fair price."}

        # Calculate weighted average unit_price and unit_cost using Decimal
        weighted_avg_price = (data['unit_price'] * data['weight']).sum() / data['weight'].sum()
        weighted_avg_cost = (data['unit_cost'] * data['weight']).sum() / data['weight'].sum()

        # Apply discount factor as a Decimal
        discount_factor_decimal = Decimal(discount_factor)
        suggested_price = weighted_avg_price * (Decimal(1) - discount_factor_decimal)

        # Ensure suggested price is above cost with a minimum margin (e.g., 5%)
        if suggested_price < weighted_avg_cost * Decimal(1.05):
            suggested_price = weighted_avg_cost * Decimal(1.05)

        # Round to two decimal places
        suggested_price = suggested_price.quantize(Decimal('0.01'))
        weighted_avg_price = weighted_avg_price.quantize(Decimal('0.01'))
        weighted_avg_cost = weighted_avg_cost.quantize(Decimal('0.01'))

        return {
            "ref_id": ref_id,
            "suggested_price": float(suggested_price),
            "weighted_average_price": float(weighted_avg_price),
            "weighted_average_cost": float(weighted_avg_cost),
            "discount_factor": discount_factor
        }

    except Exception as e:
        logger.error(f"Error calculating fair price for ref_id {ref_id}: {str(e)}")
        return {"error": "An error occurred while calculating the fair price."}
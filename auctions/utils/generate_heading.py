def generate_heading(
        search_query=None,
        category_name=None,
        specialty=None,
        manufacturer_filter=None,
        auction_type=None,
        time_filter=None,
        sort_by=None,
        title=None,
        auctions_count=0
):
    heading_parts = []

    # Search query
    if search_query:
        heading_parts.append(f'Search Results for "{search_query.capitalize()}"')
    # Filters
    elif any([category_name, specialty, manufacturer_filter, auction_type, time_filter, sort_by]):
        filters = []
        if category_name:
            filters.append(f"in {category_name.title()}")
        if specialty:
            filters.append(f"Specialty: {specialty.title()}")
        if manufacturer_filter:
            filters.append(f"Manufacturer: {manufacturer_filter.title()}")
        if auction_type:
            filters.append(f"Type: {auction_type}")
        if time_filter:
            filters.append(f"Time: {time_filter.title()}")
        if sort_by:
            # Format the sort_by value
            formatted_sort_by = sort_by.replace("_", " ").title()
            filters.append(f"Sorted by: {formatted_sort_by}")
        heading_parts.append(" - ".join(filters))
    # Default title
    else:
        if title:
            heading_parts.append(title.title())
        else:
            heading_parts.append("Listings")

    # Add auction count
    plural = "s" if auctions_count != 1 else ""
    heading_parts.append(f"- {auctions_count} Result{plural}")

    return " ".join(heading_parts)
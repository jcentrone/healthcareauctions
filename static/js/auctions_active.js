document.querySelectorAll('.dropdown-menu a').forEach(item => {
    item.addEventListener('click', function () {
        const button = this.closest('.dropdown').querySelector('.dropdown-toggle');
        button.textContent = this.textContent;
        button.dataset.value = this.dataset.value;

        const hiddenInput = button.nextElementSibling;
        hiddenInput.value = this.dataset.value;
    });
});

document.addEventListener('DOMContentLoaded', function () {
    // Submit form when the checkbox is toggled
    document.getElementById('my-auctions-checkbox').addEventListener('change', function () {
        document.getElementById('auction-filter-form').submit();
    });
    // Update the hidden input and submit the form when a dropdown item is clicked
    document.querySelectorAll('#auction-filter-form .dropdown-menu a').forEach(item => {
        item.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent default link behavior

            const button = this.closest('.dropdown').querySelector('.dropdown-toggle');
            const hiddenInput = document.getElementById(button.id + '-value');

            console.log(`Selected ${button.id}: ${this.textContent} (value: ${this.dataset.value})`); // Debugging

            button.textContent = this.textContent;
            hiddenInput.value = this.dataset.value;

            console.log(`Updated hidden input ${hiddenInput.id}: ${hiddenInput.value}`); // Debugging

            document.getElementById('auction-filter-form').submit();
        });
    });
});

function getAuctionIdFromUrl() {
    const urlParts = window.location.pathname.split('/');
    return urlParts[urlParts.length - 2]; // This gets the auction ID from the URL
}

function getAdditionalImages(auctionId) {
    // Fetch additional images for the modal if needed
    fetch('/api/get-auction-images/' + auctionId + '/')
        .then(response => response.json())
        .then(data => {
            const imagesContainer = document.getElementById('additional-images-' + auctionId);
            imagesContainer.innerHTML = ''; // Clear any existing images

            if (data.image_urls.length > 0) {
                data.image_urls.forEach(function (url) {
                    // Create an anchor element with the lightbox attributes
                    const anchor = document.createElement('a');
                    anchor.classList.add('thumb-img');
                    anchor.href = url;
                    anchor.setAttribute('data-lightbox', 'auction-images');
                    // anchor.setAttribute('data-title', 'Image Title'); // Optional, add a title for each image

                    // Create an img element
                    const img = document.createElement('img');
                    img.src = url;
                    img.classList.add('img-thumbnail');

                    // Append img to anchor, then anchor to the container
                    anchor.appendChild(img);
                    imagesContainer.appendChild(anchor);
                });
            } else {
                imagesContainer.innerHTML = '<p>No additional images available.</p>';
            }
        })
        .catch(error => console.error('Error fetching images:', error));
}

function getAdditionalDetails(auctionId) {
    // Fetch additional product details
    fetch(`/auction/${auctionId}/product-details/`)
        .then(response => response.json())
        .then(data => {
            let detailsContainer = document.getElementById(`additional-details-${auctionId}`);
            detailsContainer.innerHTML = ''; // Clear any existing details

            if (data.product_details.length > 0) {
                console.log('Product Details', data.product_details);
                data.product_details.forEach(function (detail, index) {
                    // Create table if it doesn't exist yet
                    let table = detailsContainer.querySelector('table');
                    if (!table) {
                        table = document.createElement('table');
                        table.classList.add('table', 'table-striped', 'table-bordered');
                        detailsContainer.appendChild(table);

                        // Create the table header
                        let thead = document.createElement('thead');
                        let headerRow = document.createElement('tr');
                        ['SKU', 'Reference Number', 'Lot Number', 'Expiration Date'].forEach(function (headerText) {
                            let th = document.createElement('th');
                            th.scope = "col";
                            th.textContent = headerText;
                            headerRow.appendChild(th);
                        });
                        thead.appendChild(headerRow);
                        table.appendChild(thead);

                        // Create the table body
                        let tbody = document.createElement('tbody');
                        table.appendChild(tbody);
                    }

                    // Add a new row to the table for each product detail
                    let row = document.createElement('tr');
                    ['sku', 'reference_number', 'lot_number', 'expiration_date'].forEach(function (field) {
                        let td = document.createElement('td');
                        td.textContent = detail[field] || 'N/A';  // Show 'N/A' if the field is empty
                        row.appendChild(td);
                    });

                    table.querySelector('tbody').appendChild(row);
                });

            } else {
                detailsContainer.innerHTML = '<p>No additional product details available.</p>';
            }
        });
}

document.addEventListener('DOMContentLoaded', function () {
    // Extract auction ID from the URL
    const auctionId = getAuctionIdFromUrl();
    if (auctionId) {
        // Trigger the modal for the specific auction
        const auctionModal = document.getElementById('auctionModal' + auctionId);
        if (auctionModal) {
            const modal = new bootstrap.Modal(auctionModal);
            getAdditionalDetails(auctionId);
            getAdditionalImages(auctionId);
            modal.show();
        }
    }

    // Modal event listener
    document.querySelectorAll('.modal').forEach(function (modal) {
        modal.addEventListener('show.bs.modal', function (event) {
            let button = event.relatedTarget; // Button that triggered the modal
            let auctionId = button.getAttribute('data-auction-id'); // Extract info from data-* attributes

            // Log the view to the server
            fetch('/track-auction-view/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
                },
                body: JSON.stringify({'auction_id': auctionId})
            });

            getAdditionalDetails(auctionId);
            getAdditionalImages(auctionId);
        });
    });

    // Bid submission handling
    document.querySelectorAll('.bid-form form').forEach(function (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();

            let bidAmount = parseFloat(form.querySelector('input[name="amount"]').value);
            let auctionId = form.getAttribute('data-auction-id');
            let startingBid = parseFloat(form.getAttribute('data-starting-bid'));
            let currentBid = parseFloat(form.getAttribute('data-current-bid')) || 0;

            // Validate bid amount
            let minimumBid = Math.max(startingBid, currentBid);
            if (isNaN(bidAmount) || bidAmount <= minimumBid) {
                Swal.fire({
                    title: 'Invalid Bid',
                    text: `Please enter a bid higher than ${minimumBid.toFixed(2)}`,
                    input: 'number',
                    inputLabel: 'Your Bid',
                    inputPlaceholder: `Enter a bid higher than ${minimumBid.toFixed(2)}`,
                    confirmButtonColor: '#0B5ED7',
                    showCancelButton: true,
                    inputValidator: (value) => {
                        if (!value || isNaN(value) || parseFloat(value) <= minimumBid) {
                            return `Please enter a valid bid higher than ${minimumBid.toFixed(2)}`;
                        } else {
                            form.querySelector('input[name="amount"]').value = parseFloat(value);
                            form.submit();
                        }
                    }
                });
                return;
            }

            // Submit the bid via AJAX
            fetch(form.action, {
                method: 'POST',
                body: new URLSearchParams(new FormData(form)),
                headers: {
                    'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                }
            })
                .then(response => response.json())
                .then(response => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Bid Placed',
                        text: 'Your bid has been successfully placed.',
                        confirmButtonColor: '#0B5ED7'
                    }).then(() => {
                        location.reload();  // Reload the page to reflect the new bid
                    });
                })
                .catch(error => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'There was an error placing your bid. Please try again.',
                        confirmButtonColor: '#0B5ED7'
                    });
                });
        });
    });
});




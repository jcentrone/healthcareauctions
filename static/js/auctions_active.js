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
    //My Auctions
    let my_auctions = document.getElementById('my-auctions-checkbox');
    if (my_auctions) {
        my_auctions.addEventListener('change', function () {
            document.getElementById('auction-filter-form').submit();
        });
    }


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
    console.log('urlpart', urlParts[urlParts.length - 2]);
    return urlParts[urlParts.length - 2]; // This gets the auction ID from the URL
}

// function getAdditionalImages(auctionId) {
//     // Fetch additional images for the modal if needed
//     fetch('/api/get-auction-images/' + auctionId + '/')
//         .then(response => response.json())
//         .then(data => {
//             const imagesContainer = document.getElementById('additional-images-' + auctionId);
//             imagesContainer.innerHTML = ''; // Clear any existing images
//
//             if (data.image_urls.length > 0) {
//                 data.image_urls.forEach(function (url) {
//                     // Create an anchor element with the lightbox attributes
//                     const anchor = document.createElement('a');
//                     anchor.classList.add('thumb-img');
//                     anchor.href = url;
//                     anchor.setAttribute('data-lightbox', 'auction-images');
//                     // anchor.setAttribute('data-title', 'Image Title'); // Optional, add a title for each image
//
//                     // Create an img element
//                     const img = document.createElement('img');
//                     img.src = url;
//                     img.classList.add('img-thumbnail');
//
//                     // Append img to anchor, then anchor to the container
//                     anchor.appendChild(img);
//                     imagesContainer.appendChild(anchor);
//                 });
//             } else {
//                 imagesContainer.innerHTML = '<p>No additional images available.</p>';
//             }
//         })
//         .catch(error => console.error('Error fetching images:', error));
// }

function getAdditionalImages(auctionId) {
    // Fetch additional images for the auction
    fetch('/api/get-auction-images/' + auctionId + '/')
        .then(response => response.json())
        .then(data => {
            const mainImageContainer = document.getElementById('main-image-' + auctionId);
            const thumbnailsContainer = document.getElementById('thumbnail-images-' + auctionId);
            mainImageContainer.innerHTML = ''; // Clear existing main image
            thumbnailsContainer.innerHTML = ''; // Clear existing thumbnails

            if (data.image_urls.length > 0) {
                // Set the first image as the main image
                const mainImageUrl = data.image_urls[0];

                // Create an anchor element for the main image with lightbox attributes
                const mainAnchor = document.createElement('a');
                mainAnchor.href = mainImageUrl;
                mainAnchor.setAttribute('data-lightbox', 'auction-images');

                // Create the img element for the main image
                const mainImg = document.createElement('img');
                mainImg.src = mainImageUrl;
                mainImg.classList.add('img-fluid', 'main-img');

                // Append the img to the anchor, then anchor to the main image container
                mainAnchor.appendChild(mainImg);
                mainImageContainer.appendChild(mainAnchor);

                // Loop through the rest of the images and add them as thumbnails (up to 4)
                data.image_urls.slice(1, 5).forEach(function (url) {
                    // Create an anchor element with the lightbox attributes
                    const anchor = document.createElement('a');
                    anchor.classList.add('thumb-img');
                    anchor.href = url;
                    anchor.setAttribute('data-lightbox', 'auction-images');

                    // Create an img element
                    const img = document.createElement('img');
                    img.src = url;
                    img.classList.add('img-thumbnail', 'thumbnail-img');

                    // Append img to anchor, then anchor to the thumbnails container
                    anchor.appendChild(img);
                    thumbnailsContainer.appendChild(anchor);
                });
            } else {
                mainImageContainer.innerHTML = '<p>No images available.</p>';
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
                // console.log('Product Details', data.product_details);

                // Check if any item is expired
                let containsExpiredItems = false;

                data.product_details.forEach(function (detail, index) {
                    // Check if the item is expired
                    if (detail.expiration_date) {
                        let expirationDate = new Date(detail.expiration_date);
                        // console.log('exipration', expirationDate);
                        let today = new Date();
                        if (expirationDate && expirationDate < today) {
                            containsExpiredItems = true;
                        }
                    }

                    // Create table if it doesn't exist yet
                    let table = detailsContainer.querySelector('table');
                    if (!table) {
                        table = document.createElement('table');
                        table.classList.add('table', 'table-striped', 'table-bordered');
                        detailsContainer.appendChild(table);

                        // Create the table header
                        let thead = document.createElement('thead');
                        let headerRow = document.createElement('tr');
                        ['Reference Number', 'Lot Number', 'Expiration Date'].forEach(function (headerText) {
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
                    ['reference_number', 'lot_number', 'expiration_date'].forEach(function (field) {
                        let td = document.createElement('td');
                        td.classList.add('text-uppercase')
                        td.textContent = detail[field] || 'N/A';  // Show 'N/A' if the field is empty
                        row.appendChild(td);
                    });

                    table.querySelector('tbody').appendChild(row);
                });

                // If any item is expired, show the warning message
                if (containsExpiredItems) {
                    let warningMessage = document.createElement('div');
                    warningMessage.className = 'alert alert-warning';
                    warningMessage.textContent = 'This listing may contain an expired item(s).';
                    detailsContainer.append(warningMessage);
                }

            } else {
                detailsContainer.innerHTML = '<p>No additional product details available.</p>';
            }
        });
}

document.addEventListener('DOMContentLoaded', function() {
    const cardHeader = document.querySelector('.card-header');
    const card = document.querySelector('.card');

    // Check if the screen width is mobile size (767px or less)
    if (window.innerWidth <= 767) {
        card.classList.add('collapsed');  // Collapse the card on mobile by default
    } else {
        card.classList.remove('collapsed');  // Ensure card is expanded on desktop by default
    }

    cardHeader.addEventListener('click', function() {
        card.classList.toggle('collapsed');
    });
});

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

// Function to handle character count
document.addEventListener('DOMContentLoaded', function () {
    function updateCharCount(textarea, charCount) {
        const currentLength = textarea.value.length;
        charCount.textContent = `${currentLength}/1000 characters used`;
    }

    document.querySelectorAll('textarea.form-control').forEach(function (textarea) {
        const charCount = textarea.closest('form').querySelector('.form-text');

        textarea.addEventListener('input', function () {
            updateCharCount(textarea, charCount);
        });

        updateCharCount(textarea, charCount);
    });
});


document.querySelectorAll('.message-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const textarea = form.querySelector('textarea[name="body"]');
        const messageText = textarea.value;

        fetch(`/message/validate/${encodeURIComponent(messageText)}/`)
            .then(response => response.json())
            .then(data => {
                if (data.contains_pii) {
                    const highlightedMessage = data.validated_message.replace(/##(.*?)##/g, '<span style="background-color: yellow;">$1</span>').replace(/!!(.*?)!!/g, '<span>$1</span>');
                    Swal.fire({
                        title: 'Sensitive Information Detected',
                        html: `In accordance with our terms and conditions, this auction platform is blind, and sharing personally identifiable information (PII) is not permitted. Please review and remove the highlighted information before sending your message: <br><br>${highlightedMessage}`,
                        icon: 'warning',
                        confirmButtonText: 'OK, I will edit it',
                        customClass: {
                            confirmButton: 'btn btn-primary',
                        },
                    }).then((result) => {
                        if (result.isConfirmed) {
                            textarea.value = data.validated_message.replace(/##/g, '').replace(/!!/g, '');
                            const charCount = form.querySelector('.form-text');
                            charCount.textContent = `${textarea.value.length}/1000 characters used`;
                        }
                    });
                } else {
                    form.submit();
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    });
});

// Add to cart button in listing
document.addEventListener('DOMContentLoaded', function () {
    // Select all Add to Cart buttons
    const addToCartButtons = document.querySelectorAll('form button[type="submit"]');

    // Add click event listener to each button
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function (event) {
            event.stopPropagation(); // Stop the event from propagating to the parent elements
        });
    });
});




document.addEventListener("DOMContentLoaded", function () {
    // Function to load images
    function lazyLoadImage(image) {
        const src = image.getAttribute("data-src");
        if (!src) return;

        // Replace placeholder with the actual image
        image.src = src;

        // Ensure the 'onload' event is properly bound
        image.addEventListener('load', function () {
            // console.log(`Image successfully loaded: ${src}`);
            image.removeAttribute("data-src");
            image.classList.add("loaded");
            // console.log(`Class 'loaded' added to image:`, image.classList);

            // Add 'loaded' class to the parent container
             const parent = image.closest('.auction_image_second');
             // console.log(parent);
            if (parent) {
                parent.style.position = ''; // Reset any specific positioning
                parent.classList.add('hide-after');
                parent.style.removeProperty('content'); // Remove pseudo-element content
                parent.style.removeProperty('animation'); // Stop spinner animation
            }
        });

        // Handle cases where 'onload' might not trigger due to caching
        if (image.complete) {
            // console.log(`Image already loaded from cache: ${src}`);
            image.onload; // Manually call onload if the image is already cached
        }
    }

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            // console.log(`Intersection entry:`, entry.target);
            if (entry.isIntersecting) {
                // console.log(`Image is in the viewport: ${entry.target.src}`);

                lazyLoadImage(entry.target);
                observer.unobserve(entry.target); // Stop observing once loaded
            }
        });
    });

    // Select all lazy-load images
    const images = document.querySelectorAll('.auction_image_third');
    images.forEach(image => observer.observe(image));
});


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

function getAdditionalImages(auctionId) {
    // Fetch additional images for the auction
    fetch('/api/get-auction-images/' + auctionId + '/')
        .then(response => response.json())
        .then(data => {
            const galleryContainer = document.getElementById('image-gallery-' + auctionId);
            const thumbnailColumn = document.getElementById('thumbnail-column-' + auctionId);
            const mainImageDisplay = document.getElementById('main-image-display-' + auctionId);

            thumbnailColumn.innerHTML = ''; // Clear existing thumbnails
            mainImageDisplay.innerHTML = ''; // Clear existing main image

            if (data.image_urls.length > 0) {
                // Display the first image as the main image by default
                const mainImageUrl = data.image_urls[0];
                const mainImg = document.createElement('img');
                mainImg.src = mainImageUrl;
                mainImg.alt = 'Main Image';
                mainImageDisplay.appendChild(mainImg);

                // Load all images as thumbnails
                data.image_urls.forEach(function (url, index) {
                    const thumbnailDiv = document.createElement('div');
                    thumbnailDiv.classList.add('thumbnail');

                    const thumbImg = document.createElement('img');
                    thumbImg.src = url;
                    thumbImg.alt = 'Thumbnail ' + (index + 1);
                    thumbImg.dataset.index = index; // Store the index for reference

                    // Add click event to update the main image
                    thumbImg.addEventListener('click', function () {
                        mainImg.src = url;
                    });

                    thumbnailDiv.appendChild(thumbImg);
                    thumbnailColumn.appendChild(thumbnailDiv);
                });
            } else {
                mainImageDisplay.innerHTML = '<p>No images available.</p>';
            }
        })
        .catch(error => console.error('Error fetching images:', error));
}

function getAdditionalDetails(auctionId) {
    // Fetch additional product details
    fetch(`/auction/${auctionId}/product-details/`)
        .then(response => response.json())
        .then(data => {
            // Get references to the span elements
            const refNumSpan = document.getElementById(`ref-numb-${auctionId}`);
            const lotNumSpan = document.getElementById(`lot-numb-${auctionId}`);
            const expDateSpan = document.getElementById(`exp-date-${auctionId}`);

            // Clear any existing content
            refNumSpan.innerHTML = '';
            lotNumSpan.innerHTML = '';
            expDateSpan.innerHTML = '';

            if (data.product_details.length > 0) {
                // Assuming we use the first product detail
                const detail = data.product_details[0];

                // Populate the spans with data, or 'N/A' if not available
                refNumSpan.textContent = detail.reference_number || 'N/A';
                lotNumSpan.textContent = detail.lot_number || 'N/A';

                // Handle expiration date and check if expired
                if (detail.expiration_date) {
                    const expirationDate = new Date(detail.expiration_date);
                    const today = new Date();

                    // Format the expiration date (optional)
                    const options = {year: 'numeric', month: 'long', day: 'numeric'};
                    const formattedDate = expirationDate.toLocaleDateString(undefined, options);
                    expDateSpan.textContent = formattedDate;

                    // Check if expired
                    if (expirationDate < today) {
                        // Add a subtle warning next to the expiration date
                        const warningSpan = document.createElement('span');
                        warningSpan.className = 'text-warning ms-2'; // Bootstrap classes for styling
                        warningSpan.textContent = '(Expired)';
                        expDateSpan.appendChild(warningSpan);
                    }
                } else {
                    expDateSpan.textContent = 'N/A';
                }
            } else {
                // If no product details are available
                refNumSpan.textContent = 'N/A';
                lotNumSpan.textContent = 'N/A';
                expDateSpan.textContent = 'N/A';
            }
        })
        .catch(error => console.error('Error fetching product details:', error));
}


document.addEventListener('DOMContentLoaded', function () {
    const cardHeader = document.querySelector('.card-header');
    const card = document.querySelector('.card');

    // Check if the screen width is mobile size (767px or less)
    if (window.innerWidth <= 767) {
        card.classList.add('collapsed');  // Collapse the card on mobile by default
    } else {
        card.classList.remove('collapsed');  // Ensure card is expanded on desktop by default
    }

    cardHeader.addEventListener('click', function () {
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







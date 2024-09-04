document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.questionForm').forEach(function (form) {
        // Get the recipient dropdown and subject input
        const recipientSelect = form.querySelector('select[name="recipient"]');
        const orderInfo = form.querySelector(`#order-info-${form.id.split('-')[1]}`);
        const textarea = form.querySelector('textarea[name="body"]');

        // Update the form action based on the recipient selection
        recipientSelect.addEventListener('change', function () {
            if (recipientSelect.value === 'seller') {
                form.action = `/send_message/${form.id.split('-')[1]}/`;
                orderInfo.style.display = 'block';
            } else if (recipientSelect.value === 'customer_service') {
                form.action = '/send-customer-service-message/';
                orderInfo.style.display = 'none';
            }
        });

        // Handle form submission with message validation
        form.addEventListener('submit', function (e) {
            e.preventDefault();

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

    // Function to handle character count
    function updateCharCount(textarea, charCount) {
        const currentLength = textarea.value.length;
        charCount.textContent = `${currentLength}/1000 characters used`;
    }

    document.querySelectorAll('textarea.form-control').forEach(function (textarea) {
        const charCount = textarea.closest('form').querySelector('.form-text');

        textarea.addEventListener('input', function () {
            updateCharCount(textarea, charCount);
        });

        // updateCharCount(textarea, charCount);
    });

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

                    // Check if any item is expired
                    let containsExpiredItems = false;

                    data.product_details.forEach(function (detail, index) {
                        // Check if the item is expired
                        let expirationDate = new Date(detail.expiration_date);
                        let today = new Date();
                        if (expirationDate < today) {
                            containsExpiredItems = true;
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

                    // If any item is expired, show the warning message
                    if (containsExpiredItems) {
                        let warningMessage = document.createElement('div');
                        warningMessage.className = 'alert alert-warning';
                        warningMessage.textContent = 'This listing contains an expired item(s).';
                        detailsContainer.append(warningMessage);
                    }

                } else {
                    detailsContainer.innerHTML = '<p>No additional product details available.</p>';
                }
            });
    }

    // Modal event listener
    document.querySelectorAll('.listingModal').forEach(function (modal) {
        modal.addEventListener('show.bs.modal', function (event) {
            let button = event.relatedTarget; // Button that triggered the modal
            console.log(button);
            let auctionId = button.getAttribute('data-auction-id'); // Extract info from data-* attributes

            getAdditionalDetails(auctionId);
            getAdditionalImages(auctionId);
        });
    });

    //Navigation Listener for Active tab
    const tabButtons = document.querySelectorAll('#dashboardTabs .nav-link');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const activeTabId = this.getAttribute('id').split('-')[0]; // Get the tab ID (e.g., 'orders', 'sales')
            const url = new URL(window.location.href);
            url.searchParams.set('active_tab', activeTabId); // Set the 'active_tab' parameter
            history.replaceState(null, '', url); // Update the URL without reloading the page
        });
    });
});
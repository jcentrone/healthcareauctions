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
    // Function to get additional images
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

    document.querySelectorAll('textarea.form-control').forEach(function (textarea) {
        const charCount = textarea.closest('form').querySelector('.form-text');

        textarea.addEventListener('input', function () {
            updateCharCount(textarea, charCount);
        });

        // updateCharCount(textarea, charCount);
    });

    // Modal event listener
    document.querySelectorAll('.listingModal').forEach(function (modal) {
        modal.addEventListener('show.bs.modal', function (event) {
            let button = event.relatedTarget; // Button that triggered the modal
            console.log(button);
            let auctionId = button.getAttribute('data-auction-id'); // Extract info from data-* attributes

            // getAdditionalDetails(auctionId);
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

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('editAuctionForm{{ listing.id }}');

    form.addEventListener('submit', function(event) {
        event.preventDefault();  // Prevent the default form submission

        const formData = new FormData(form);

        fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',  // This indicates it's an AJAX request
            },
        })
        .then(response => response.json())  // Parse the JSON from the response
        .then(data => {
            if (data.success) {
                // Display a success message
                alert(data.message);
                // Refresh the page
                location.reload();
            } else {
                // Display the error messages
                alert(data.message);
                console.log('Form Errors:', data.form_errors);
                console.log('Formset Errors:', data.formset_errors);
            }
        })
        .catch(error => {
            // Handle errors here
            alert('An error occurred. Please try again.');
            console.error('Error:', error);
        });
    });
});


function enableEditing(listingId) {
    const form = document.getElementById(`editAuctionForm${listingId}`);
    const inputs = form.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    const dates = form.querySelectorAll('input[type="date"]');

    // Make text inputs and textareas editable
    inputs.forEach(input => {
        input.removeAttribute('readonly');
        input.classList.remove('readonly-input');
        input.classList.add('editable-input');
    });

    // Make checkboxes editable
    checkboxes.forEach(checkbox => {
        checkbox.removeAttribute('disabled');
    });

    // Make dates editable
    dates.forEach(date => {
        date.removeAttribute('readonly');
        date.classList.add('bg-white');
        date.style.padding = '.375rem .75rem';
        date.style.border = '1px solid #dee2e6';


    });

    // Hide the edit button and show the save button
    document.getElementById(`editButton${listingId}`).style.display = 'none';
    document.getElementById(`saveButton${listingId}`).style.display = 'block';

    // Show the additional listing meta row
    const additionalMetaRow = document.getElementById(`additional-listing-meta-${listingId}`);
    if (additionalMetaRow) {
        console.log(`Showing additional meta for listing ${listingId}`);
        additionalMetaRow.style.display = 'flex';
    } else {
        console.log(`Could not find additional meta for listing ${listingId}`);
    }
}

function disableEditing(listingId) {
    const form = document.getElementById(`editAuctionForm${listingId}`);
    const inputs = form.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    const dates = form.querySelectorAll('input[type="date"]');

    // Make text inputs and textareas un-editable
    inputs.forEach(input => {
        input.setAttribute('readonly', 'readonly');
        input.classList.add('readonly-input');
        input.classList.remove('editable-input');
    });

    // Make checkboxes un-editable
    checkboxes.forEach(checkbox => {
        checkbox.setAttribute('disabled', 'disabled');
    });

    // Make dates un-editable
    dates.forEach(date => {
        date.setAttribute('readonly', 'readonly');
        date.classList.remove('bg-white');
        date.style.padding = '.375rem .75rem';
        date.style.border = 'none';
    });

    // Show the edit button and show the save button
    document.getElementById(`editButton${listingId}`).style.display = 'block';
    document.getElementById(`saveButton${listingId}`).style.display = 'none';

    // Hide the additional listing meta row
    const additionalMetaRow = document.getElementById(`additional-listing-meta-${listingId}`);
    if (additionalMetaRow) {
        console.log(`Showing additional meta for listing ${listingId}`);
        additionalMetaRow.style.display = 'none';
    } else {
        console.log(`Could not find additional meta for listing ${listingId}`);
    }
}

function confirmListing(listingId) {
    Swal.fire({
        title: 'Are you sure?',
        text: 'Do you want to list this item?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, list it!',
        cancelButtonText: 'No, cancel!',
        customClass: {
            confirmButton: 'btn btn-success me-1',
            cancelButton: 'btn btn-danger ms-1'
        },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            // Serialize the form data
            let formData = new FormData(document.querySelector(`#editAuctionForm${listingId}`));

            // Make an AJAX request to the server
            $.ajax({
                url: `/post_listing/${listingId}/`,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    if (response.success) {
                        Swal.fire({
                            title: 'Success!',
                            text: response.message,
                            icon: 'success',
                            customClass: {
                                confirmButton: 'btn btn-success'
                            },
                            buttonsStyling: false
                        }).then(() => {
                            // Optionally, reload the page or update the UI
                            location.reload();
                        });
                    } else {
                        Swal.fire({
                            title: 'Error!',
                            text: response.message,
                            icon: 'error',
                            customClass: {
                                confirmButton: 'btn btn-danger'
                            },
                            buttonsStyling: false
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        title: 'Error!',
                        text: 'Something went wrong. Please try again.',
                        icon: 'error',
                        customClass: {
                            confirmButton: 'btn btn-danger'
                        },
                        buttonsStyling: false
                    });
                }
            });
        }
    });
}


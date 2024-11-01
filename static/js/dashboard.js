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


    // Char count for messages listener
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
            // console.log(button);
            let auctionId = button.getAttribute('data-auction-id'); // Extract info from data-* attributes

            // getAdditionalDetails(auctionId);
            // getAdditionalImages(auctionId);
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

// document.addEventListener('DOMContentLoaded', function () {
//     const form = document.getElementById('editAuctionForm{{ listing.id }}');
//
//     form.addEventListener('submit', function (event) {
//         event.preventDefault();  // Prevent the default form submission
//
//         const formData = new FormData(form);
//
//         fetch(form.action, {
//             method: 'POST',
//             body: formData,
//             headers: {
//                 'X-Requested-With': 'XMLHttpRequest',  // This indicates it's an AJAX request
//             },
//         })
//             .then(response => response.json())  // Parse the JSON from the response
//             .then(data => {
//                 // Handle the messages from the server
//                 if (data.messages) {
//                     data.messages.forEach(msg => {
//                         const alertDiv = document.createElement('div');
//                         alertDiv.className = `alert alert-${msg.tags} alert-dismissible fade show`;
//                         alertDiv.role = 'alert';
//                         alertDiv.innerHTML = `
//                         ${msg.message}
//                         <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
//                     `;
//                         document.getElementById('main-content').prepend(alertDiv);
//                     });
//                 }
//
//                 if (data.success) {
//                     // Reload the page to show the updated dashboard
//                     location.reload();
//                 } else {
//                     console.log('Form Errors:', data.form_errors);
//                     console.log('Formset Errors:', data.formset_errors);
//                 }
//             })
//             .catch(error => {
//                 // Handle errors here
//                 alert('An error occurred. Please try again.');
//                 console.error('Error:', error);
//             });
//     });
// });

function submitForm(event, listing_id) {
    event.preventDefault();
    event.stopPropagation();
    const form = document.getElementById(`editAuctionForm${listing_id}`);
    const formData = new FormData(form);

    // Get CSRF token
    const csrftoken = getCookie('csrftoken');

    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrftoken,
            'X-Requested-With': 'XMLHttpRequest',
        },
    })
        .then(response => response.json())
        .then(data => {
            if (data.messages) {
                data.messages.forEach(msg => {
                    const alertDiv = document.createElement('div');
                    alertDiv.className = `alert alert-${msg.tags} alert-dismissible fade show`;
                    alertDiv.role = 'alert';
                    alertDiv.innerHTML = `
                    ${msg.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                    document.getElementById('main-content').prepend(alertDiv);
                });
            }

            if (data.success) {
                // Close the modal
                const modal = document.getElementById(`listingModal${listing_id}`);
                const bootstrapModal = bootstrap.Modal.getInstance(modal);
                bootstrapModal.hide();

                // Optionally, refresh the page or update the listing in the DOM
            } else {
                console.log('Form Errors:', data.form_errors);
                console.log('Formset Errors:', data.formset_errors);
                alert('Please correct the errors in the form.');
            }
        })
        .catch(error => {
            alert('An error occurred. Please try again.');
            console.error('Error:', error);
        });
}

// CSRF Token Helper Function
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


// Function to get additional images
function initializeImageInputs() {
    const imageSlots = document.querySelectorAll('.image-slot');
    imageSlots.forEach(function (slot) {
        const clickableElement = slot.querySelector('.image-clickable');
        const imageInput = slot.querySelector('.image-input');
        const deleteButton = slot.querySelector('.delete-image-btn');
        const deleteField = slot.querySelector('input[type="checkbox"][name$="-DELETE"]');

        // Attach click event to the clickable element (image or placeholder)
        if (clickableElement && imageInput) {
            clickableElement.addEventListener('click', function () {
                imageInput.click();
            });
        }

        // Handle change event for the file input
        if (imageInput) {
            imageInput.addEventListener('change', function () {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        // Remove the placeholder if it exists
                        const placeholder = slot.querySelector('.image-placeholder');
                        if (placeholder) {
                            placeholder.remove();
                        }

                        // Remove existing image if it exists
                        const existingImage = slot.querySelector('img');
                        if (existingImage) {
                            existingImage.remove();
                        }

                        // Create new image element
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.alt = 'Image';
                        img.className = 'img-thumbnail image-clickable';
                        img.style.width = '150px';
                        img.style.height = '150px';
                        img.style.objectFit = 'cover';
                        img.style.cursor = 'pointer';

                        // Insert the new image into the slot
                        slot.insertBefore(img, imageInput);

                        // Re-attach click event to the new image
                        img.addEventListener('click', function () {
                            imageInput.click();
                        });

                        // If the image was previously marked for deletion, unmark it
                        if (deleteField) {
                            deleteField.checked = false;
                        }

                        // Remove any visual indication of deletion
                        slot.classList.remove('image-deleted');
                    }
                    reader.readAsDataURL(file);
                }
            });
        }

        // Handle click event for the delete button
        if (deleteButton && deleteField) {
            deleteButton.addEventListener('click', function (e) {
                e.stopPropagation();  // Prevent triggering the image click event
                // Mark the image for deletion
                deleteField.checked = true;

                // Visually indicate that the image is marked for deletion
                slot.classList.add('image-deleted');

                // Optionally, disable the clickable element
                clickableElement.style.pointerEvents = 'none';
                clickableElement.style.opacity = '0.5';

                // Hide the delete button
                deleteButton.style.display = 'none';
            });
        }
    });
}


function enableEditing(listingId) {
    const form = document.getElementById(`editAuctionForm${listingId}`);
    const inputs = form.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    const dates = form.querySelectorAll('input[type="date"]');
    const images = form.querySelectorAll('.image-placeholder');

    // Make text inputs and textareas editable
    inputs.forEach(input => {
        input.removeAttribute('readonly');
        input.classList.remove('readonly-input');
        input.classList.add('editable-input');
    });

    // Make checkboxes editable
    checkboxes.forEach(checkbox => {
        checkbox.removeAttribute('disabled');
        checkbox.style.border = '1px solid #dee2e6';
    });

    // Make dates editable
    dates.forEach(date => {
        date.removeAttribute('readonly');
        date.classList.add('bg-white');
        date.style.padding = '.375rem .75rem';
        date.style.border = '1px solid #dee2e6';


    });

    // Show additional image slots
    images.forEach(image => {
        image.classList.remove('d-none');
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

    initializeImageInputs();
}

function disableEditing(listingId) {
    const form = document.getElementById(`editAuctionForm${listingId}`);
    const inputs = form.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    const dates = form.querySelectorAll('input[type="date"]');
    const images = form.querySelectorAll('.image-placeholder');

    // Make text inputs and textareas un-editable
    inputs.forEach(input => {
        input.setAttribute('readonly', 'readonly');
        input.classList.add('readonly-input');
        input.classList.remove('editable-input');
    });

    // Make checkboxes un-editable
    checkboxes.forEach(checkbox => {
        checkbox.setAttribute('disabled', 'disabled');
        checkbox.style.border = 'none';
    });

    // Make dates un-editable
    dates.forEach(date => {
        date.setAttribute('readonly', 'readonly');
        date.classList.remove('bg-white');
        date.style.padding = '.375rem .75rem';
        date.style.border = 'none';
    });

    // Show additional image slots
    images.forEach(image => {
        image.classList.add('d-none');
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
            postListing(listingId);
        }
    });
}

function postListing(listingIds) {
    // Ensure listingIds is always an array
    if (!Array.isArray(listingIds)) {
        listingIds = [listingIds];
    }

    console.log('Listing IDs', listingIds);

    let currentIndex = 0;

    const submitNextListing = () => {
        if (currentIndex >= listingIds.length) {
            Swal.fire({
                icon: 'success',
                title: 'All Listings Posted',
                text: 'All selected listings have been posted successfully.',
            }).then(() => {
                // Optionally, reload the page or update the UI
                location.reload();
            });
            return;
        }

        const listingId = listingIds[currentIndex];

        Swal.fire({
            title: `Posting Listing ${currentIndex + 1} of ${listingIds.length}`,
            text: `Posting listing with ID: ${listingId}`,
            didOpen: () => {
                Swal.showLoading();
            }
        });

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
                    currentIndex++;
                    submitNextListing();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error Posting Listing',
                        text: response.message,
                        customClass: {
                            confirmButton: 'btn btn-danger'
                        },
                        buttonsStyling: false
                    });
                }
            },
            error: function () {
                Swal.fire({
                    icon: 'error',
                    title: 'Request Failed',
                    text: `Failed to post listing with ID: ${listingId}`,
                    customClass: {
                        confirmButton: 'btn btn-danger'
                    },
                    buttonsStyling: false
                });
            }
        });
    };

    submitNextListing();
}

function submitAllForms(url) {
    // Show SweetAlert for processing
    Swal.fire({
        title: 'Processing...',
        text: 'Please wait while your data is being saved.',
        icon: 'info',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading();
        }
    });

    // Create a FormData object to hold all form data, including files
    let formData = new FormData();

    // Append each form's data to the FormData object
    $('#settings-form, #billing-form, #shipping-form, #shipping-account-form').each(function () {
        let formElement = $(this)[0];
        let formFormData = new FormData(formElement);

        // Append each form's data to the main FormData object
        formFormData.forEach((value, key) => {
            formData.append(key, value);
        });
    });

    $.ajax({
        type: 'POST',
        url: url,
        data: formData,
        processData: false,  // Prevent jQuery from automatically transforming the data into a query string
        contentType: false,  // Ensure that the content type is set to multipart/form-data
        success: function (response) {
            Swal.close();  // Close the SweetAlert processing dialog

            if (response.status === 'success') {
                // Display a Bootstrap success alert
                let alertElement = $(`
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        ${response.message}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `);
                $('#main-content').prepend(alertElement);

                // Set a timer to hide the alert after 5 seconds
                setTimeout(() => {
                    alertElement.alert('close');
                }, 5000);
            } else {
                // Display errors using Bootstrap alerts
                let errors = response.errors;
                for (let formName in errors) {
                    if (errors.hasOwnProperty(formName)) {
                        $('#main-content').prepend(`
                            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                                <strong>Errors in ${formName}:</strong> ${JSON.stringify(errors[formName])}
                                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                            </div>
                        `);
                    }
                }
            }
        },
        error: function (response) {
            Swal.close();  // Close the SweetAlert processing dialog
            // Display a generic Bootstrap error alert
            $('#alert-container').html(`
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    An error occurred while processing your request.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `);
        }
    });
}


document.addEventListener('DOMContentLoaded', function () {
    const selectAllCheckbox = document.getElementById('select-all-listings');
    const listingCheckboxes = document.querySelectorAll('.listing-checkbox');

    if (selectAllCheckbox) {
        // Handle "Select All" functionality
        selectAllCheckbox.addEventListener('change', function () {
            listingCheckboxes.forEach(function (checkbox) {
                checkbox.checked = selectAllCheckbox.checked;
            });
            document.getElementById('post-selected-listings').style.display = 'flex';
        });
    }

    // Listener to post multiple listings
    document.getElementById('post-selected-listings').addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        const selectedListings = Array.from(document.querySelectorAll('.listing-checkbox'))
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.dataset.listingId);
        console.log(selectedListings.length);
        if (selectedListings.length > 0) {
            Swal.fire({
                title: 'Are you sure?',
                text: `You are about to post ${selectedListings.length} listings.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, post them!',
                cancelButtonText: 'No, cancel!',
                customClass: {
                    confirmButton: 'btn btn-success me-1',
                    cancelButton: 'btn btn-danger ms-1'
                },
                buttonsStyling: false
            }).then((result) => {
                console.log('Swal result:', result);  // Add this line to check if this block is executed
                if (result.isConfirmed) {
                    postListing(selectedListings);
                }
            });
        } else {
            return;
        }
    });
});


document.addEventListener('DOMContentLoaded', function () {
    // Handle Dropdown Item Clicks
    let dropdownItems = document.querySelectorAll('.dropdown-item[data-bs-toggle="tab"]');
    dropdownItems.forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            let target = this.getAttribute('href');
            let tabTriggerEl = document.querySelector('[data-bs-target="' + target + '"]');
            if (tabTriggerEl) {
                let tab = new bootstrap.Tab(tabTriggerEl);
                tab.show();
            }
        });
    });

    // Update Dropdown Button Text Based on Active Tab
    let settingsTabs = document.getElementById('dashboardTabs');
    let dropdownButton = document.getElementById('dropdownMenuButton');

    if (dropdownButton) {
        // Function to update the dropdown button text
        function updateDropdownButton() {
            let activeTab = settingsTabs.querySelector('.nav-link.active');
            if (activeTab) {
                let activeText = activeTab.querySelector('.card-header').textContent.trim();
                dropdownButton.innerHTML = '<i class="fas fa-bars me-2"></i> ' + activeText;
            }
        }

        // Initial update on page load
        updateDropdownButton();

        // Listen for tab shown events
        let tabLinks = settingsTabs.querySelectorAll('.nav-link');
        tabLinks.forEach(function (tab) {
            tab.addEventListener('shown.bs.tab', function () {
                updateDropdownButton();
            });
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const deleteButton = document.getElementById('delete-auction-btn');
    if (deleteButton) {
        deleteButton.addEventListener('click', function () {
            const auctionId = this.getAttribute('data-auction-id');

            // Display SweetAlert2 confirmation dialog
            Swal.fire({  // Changed from swal.fire to Swal.fire
                title: "Are you sure?",
                text: "Are you sure you want to delete this listing? This action cannot be undone.",
                icon: "warning",
                showCancelButton: true,  // Ensure the cancel button is shown
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel',
                customClass: {
                    confirmButton: 'btn btn-primary me-2',
                    cancelButton: 'btn btn-secondary ms-2',
                },
                buttonsStyling: false,
                allowOutsideClick: false,
            })
                .then((result) => {  // Renamed parameter to 'result' for clarity
                    if (result.isConfirmed) {  // Check if the user confirmed
                        // Get CSRF token
                        const csrftoken = getCookie('csrftoken');

                        // Send DELETE request via Fetch API
                        fetch(`/auction/delete/${auctionId}/`, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': csrftoken,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({})
                        })
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('Network response was not ok');
                                }
                                return response.json();
                            })
                            .then(data => {
                                if (data.success) {
                                    Swal.fire({
                                        title: "Deleted!",
                                        text: "Your auction has been deleted successfully.",
                                        icon: "success",
                                        confirmButtonText: 'OK',
                                        customClass: {
                                            confirmButton: 'btn btn-primary',
                                        },
                                    })
                                        .then(() => {
                                            window.location.href = '/dashboard?active_tab=listings'; // Redirect to the dashboard or another appropriate page
                                        });
                                } else {
                                    Swal.fire({
                                        title: "Error!",
                                        text: "An error occurred while deleting the auction.",
                                        icon: "error",
                                        confirmButtonText: 'OK',
                                        customClass: {
                                            confirmButton: 'btn btn-primary',
                                        },
                                    });
                                }
                            })
                            .catch(error => {
                                console.error('Error:', error);
                                Swal.fire({
                                    title: "Error!",
                                    text: "An error occurred while deleting the auction.",
                                    icon: "error",
                                    confirmButtonText: 'OK',
                                    customClass: {
                                        confirmButton: 'btn btn-primary',
                                    },
                                });
                            });
                    } else {
                        // Optional: Handle the cancel action if needed
                        // For example, you can show a message or simply do nothing
                        console.log('Deletion canceled by user.');
                    }
                });
        });
    }
});


// Function to get the CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}



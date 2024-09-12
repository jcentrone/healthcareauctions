document.addEventListener('DOMContentLoaded', function () {
    const pages = document.querySelectorAll('.form-page');
    const nextButtons = document.querySelectorAll('.next-btn');
    const prevButtons = document.querySelectorAll('.prev-btn');
    const sameAsShippingCheckbox = document.getElementById('same-as-shipping');
    const submitBtn = document.getElementById('submitBtn');  // Ensure this is correctly referenced
    const form = document.getElementById('registration-form');
    let currentPage = 0;

    // Function to show the page with an error
    function showPageWithError() {
        const errorFields = form.querySelectorAll('.is-invalid');
        if (errorFields.length > 0) {
            const firstErrorField = errorFields[0];
            const inputGroup = firstErrorField.closest('.form-group');
            if (inputGroup) {
                const page = inputGroup.closest('.form-page');
                if (page) {
                    // Show the page with the error
                    pages.forEach(p => p.style.display = 'none');
                    page.style.display = 'block';

                    // Set the current page index to the page with the error
                    currentPage = Array.from(pages).indexOf(page);
                }
            }
        }
    }

    // Function to validate inputs on the current page
    function validateCurrentPage() {
        const inputs = pages[currentPage].querySelectorAll('input, select, textarea');
        let valid = true;

        inputs.forEach(input => {
            if (!input.checkValidity()) {
                valid = false;
                input.classList.add('is-invalid');
                input.reportValidity();
            } else {
                input.classList.remove('is-invalid');
            }
        });

        return valid;
    }

    // Function to show a specific page
    function showPage(pageIndex) {
        pages.forEach((page, index) => {
            page.style.display = (index === pageIndex) ? 'block' : 'none';
        });

        // Hide the previous button if on the first page
        prevButtons.forEach(button => {
            button.style.display = (pageIndex === 0) ? 'none' : 'inline-block';
        });

        // Handle the visibility of the "Next" and "Create Account" buttons
        if (pageIndex === pages.length - 1) {
            // Last page: show "Create Account" and hide "Next"
            nextButtons.forEach(button => button.style.display = 'none');
            submitBtn.style.display = 'inline-block';
        } else {
            // Not the last page: show "Next" and hide "Create Account"
            nextButtons.forEach(button => button.style.display = 'inline-block');
            submitBtn.style.display = 'none';
        }

        currentPage = pageIndex;
    }

    // Handle next button clicks
    nextButtons.forEach(button => {
        button.addEventListener('click', function () {
            if (validateCurrentPage()) {
                // Move to the next page if the current page is valid
                showPage(currentPage + 1);
            }
        });
    });

    // Handle previous button clicks
    prevButtons.forEach(button => {
        button.addEventListener('click', function () {
            showPage(currentPage - 1);
        });
    });

    // Handle form submission
    form.addEventListener('submit', function (e) {
        if (!validateCurrentPage()) {
            e.preventDefault();  // Prevent form submission if the current page is not valid
            showPageWithError();  // Show the page containing the first error
        }
    });

    // Handle "Same as Shipping" checkbox change
    sameAsShippingCheckbox.addEventListener('change', function () {
        if (sameAsShippingCheckbox.checked) {
            document.querySelector('[name="billing_street"]').value = document.querySelector('[name="shipping_street"]').value;
            document.querySelector('[name="billing_city"]').value = document.querySelector('[name="shipping_city"]').value;
            document.querySelector('[name="billing_state"]').value = document.querySelector('[name="shipping_state"]').value;
            document.querySelector('[name="billing_zip"]').value = document.querySelector('[name="shipping_zip"]').value;
            document.querySelector('[name="billing_country"]').value = document.querySelector('[name="shipping_country"]').value;
        } else {
            document.querySelector('[name="billing_street"]').value = '';
            document.querySelector('[name="billing_city"]').value = '';
            document.querySelector('[name="billing_state"]').value = '';
            document.querySelector('[name="billing_zip"]').value = '';
            document.querySelector('[name="billing_country"]').value = '';
        }
    });

    // Initialize the first page and hide the "Create Account" button
    submitBtn.style.display = 'none';
    showPage(0);

    // Show the page with the first error if there are any validation errors
    showPageWithError();
});





// Function to handle image preview
// function readURL(input, previewId, iconId) {
//     if (input.files && input.files[0]) {
//         const reader = new FileReader();
//
//         reader.onload = function (e) {
//             document.getElementById(previewId).src = e.target.result;
//             document.getElementById(previewId).style.display = 'block';
//             document.getElementById(iconId).style.display = 'none';
//         };
//
//         reader.readAsDataURL(input.files[0]);
//     }
// }

// Profile Image Preview
// document.getElementById('profile_image_input').addEventListener('change', function () {
//     readURL(this, 'profile-thumbnail-preview', 'profile-upload-icon');
// });

// Company Logo Preview
// document.getElementById('company_logo_input').addEventListener('change', function () {
//     readURL(this, 'company-logo-thumbnail-preview', 'company-logo-upload-icon');
// });

// businessButton.addEventListener('click', function () {
//     accountTypeInput.value = 'business';
//     businessButton.classList.remove('btn-secondary');
//     businessButton.classList.add('btn-primary');
//     personalButton.classList.remove('btn-primary');
//     personalButton.classList.add('btn-secondary');
//     companyNameGroup.style.display = 'flex';
//     w9Container.style.display = 'block';
//     companyLogoGroup.style.display = 'block';
//
// });

// personalButton.addEventListener('click', function () {
//     accountTypeInput.value = 'personal';
//     personalButton.classList.remove('btn-secondary');
//     personalButton.classList.add('btn-primary');
//     businessButton.classList.remove('btn-primary');
//     businessButton.classList.add('btn-secondary');
//     companyNameGroup.style.display = 'none';
//     w9Container.style.display = 'none';
//     companyLogoGroup.style.display = 'none';
// });

// Initial state
// showPage(0);
// if (accountTypeSelect.value === 'business') {
//     companyNameGroup.style.display = 'flex';
//     companyLogoGroup.style.display = 'flex';
// } else {
//     companyNameGroup.style.display = 'none';
//     companyLogoGroup.style.display = 'none';
// }
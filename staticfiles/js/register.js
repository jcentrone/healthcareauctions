document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('registration-form');
    const pages = document.querySelectorAll('.form-page');
    const nextButtons = document.querySelectorAll('.next-btn');
    const prevButtons = document.querySelectorAll('.prev-btn');
    const businessButton = document.getElementById('business-account-selector');
    const personalButton = document.getElementById('personal-account-selector');
    const accountTypeInput = document.getElementById('account_type');
    const companyNameGroup = document.getElementById('company_name_group');
    const companyLogoGroup = document.getElementById('company_logo_group');
    const sameAsShippingCheckbox = document.getElementById('same-as-shipping');

    let currentPage = 0;

    function showPage(pageIndex) {
        pages.forEach((page, index) => {
            page.style.display = (index === pageIndex) ? 'block' : 'none';
        });
        currentPage = pageIndex;
    }

    nextButtons.forEach(button => {
        button.addEventListener('click', function () {
            showPage(currentPage + 1);
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', function () {
            showPage(currentPage - 1);
        });
    });

    // Function to handle image preview
    function readURL(input, previewId, iconId) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();

            reader.onload = function (e) {
                document.getElementById(previewId).src = e.target.result;
                document.getElementById(previewId).style.display = 'block';
                document.getElementById(iconId).style.display = 'none';
            };

            reader.readAsDataURL(input.files[0]);
        }
    }

    // Profile Image Preview
    document.getElementById('profile_image_input').addEventListener('change', function () {
        readURL(this, 'profile-thumbnail-preview', 'profile-upload-icon');
    });

    // Company Logo Preview
    document.getElementById('company_logo_input').addEventListener('change', function () {
        readURL(this, 'company-logo-thumbnail-preview', 'company-logo-upload-icon');
    });

    businessButton.addEventListener('click', function () {
        accountTypeInput.value = 'business';
        businessButton.classList.remove('btn-secondary');
        businessButton.classList.add('btn-primary');
        personalButton.classList.remove('btn-primary');
        personalButton.classList.add('btn-secondary');
        companyNameGroup.style.display = 'block';
        companyLogoGroup.style.display = 'block';
    });

    personalButton.addEventListener('click', function () {
        accountTypeInput.value = 'personal';
        personalButton.classList.remove('btn-secondary');
        personalButton.classList.add('btn-primary');
        businessButton.classList.remove('btn-primary');
        businessButton.classList.add('btn-secondary');
        companyNameGroup.style.display = 'none';
        companyLogoGroup.style.display = 'none';
    });

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

    // Initial state
    showPage(0);
    if (accountTypeSelect.value === 'business') {
        companyNameGroup.style.display = 'flex';
        companyLogoGroup.style.display = 'flex';
    } else {
        companyNameGroup.style.display = 'none';
        companyLogoGroup.style.display = 'none';
    }
});

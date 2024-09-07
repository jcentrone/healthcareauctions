document.addEventListener('DOMContentLoaded', function () {
    validateCreditCardForm();
    disableEnableSubmit();
});

function validateCreditCardForm() {
    let cardNumberField = document.getElementById('id_card_number');
    let expiryField = document.getElementById('id_expiration_date');
    let cvcField = document.getElementById('id_cvv');

    // Attach Payform.js to inputs
    payform.cardNumberInput(cardNumberField);
    payform.expiryInput(expiryField);
    payform.cvcInput(cvcField);

    // Handle form submission or validation on blur/change
    cardNumberField.addEventListener('blur', validateCardNumber);
    expiryField.addEventListener('blur', validateExpiryDate);
    cvcField.addEventListener('blur', validateCVC);

    function validateCardNumber() {
        let isValid = payform.validateCardNumber(cardNumberField.value);
        if (isValid) {
            cardNumberField.classList.remove('is-invalid');
            cardNumberField.classList.add('is-valid');
        } else {
            cardNumberField.classList.remove('is-valid');
            cardNumberField.classList.add('is-invalid');
        }
    }

    function validateExpiryDate() {
        let expiry = expiryField.value.split('/');
        let isValid = payform.validateCardExpiry(expiry[0], expiry[1]);
        if (isValid) {
            expiryField.classList.remove('is-invalid');
            expiryField.classList.add('is-valid');
        } else {
            expiryField.classList.remove('is-valid');
            expiryField.classList.add('is-invalid');
        }
    }

    function validateCVC() {
        let cardType = payform.parseCardType(cardNumberField.value);
        let isValid = payform.validateCardCVC(cvcField.value, cardType);
        if (isValid) {
            cvcField.classList.remove('is-invalid');
            cvcField.classList.add('is-valid');
        } else {
            cvcField.classList.remove('is-valid');
            cvcField.classList.add('is-invalid');
        }
    }
}

function disableEnableSubmit() {
    const agreeTermsCheckbox = document.getElementById('id_agree_terms');
    const submitButton = document.getElementById('orderButton');
    const parentElement = submitButton.parentElement;

    // Disable submit button initially
    submitButton.disabled = true;

    // Listen for changes on the checkbox
    agreeTermsCheckbox.addEventListener('change', function () {
        // Toggle the disabled state of the submit button
        submitButton.disabled = !this.checked;
    });

    // Workaround for handling clicks on a disabled button
    parentElement.addEventListener('click', function (event) {
        if (event.target === parentElement) {
            event.preventDefault();  // Prevent any default action
            agreeTermsCheckbox.focus();  // Set focus to the checkbox

            // Show a tooltip or alert
            const tooltip = document.createElement('div');
            tooltip.innerText = 'Please accept the terms and conditions';
            tooltip.style.position = 'absolute';
            tooltip.style.padding = '10px';
            tooltip.style.borderRadius = '5px';
            tooltip.style.color = '#000';
            tooltip.style.fontSize = '12px';
            tooltip.classList.add('bg-info');

            const checkboxRect = agreeTermsCheckbox.getBoundingClientRect();
            tooltip.style.top = `${window.scrollY + checkboxRect.top - 45}px`;
            tooltip.style.left = `${window.scrollX + checkboxRect.left}px`;

            document.body.appendChild(tooltip);

            // Remove the tooltip after 3 seconds
            setTimeout(() => {
                tooltip.remove();
            }, 4000);
        }
    });
}

// Modal functions and operations:
$(document).ready(function () {
    // Check if the user has previously opted to hide the instructions
    const hideInstructions = localStorage.getItem('hideInstructionsForever');

    // If not, show the modal on page load
    if (!hideInstructions) {
        $('#checkoutInstructionsModal').modal('show');
    }

    // When the modal is closed, check if the user wants to hide it in the future
    $('#checkoutInstructionsModal').on('hidden.bs.modal', function () {
        if ($('#hideInstructionsForever').is(':checked')) {
            localStorage.setItem('hideInstructionsForever', 'true');
        }
    });

    // Initially set the required fields for the default selected option
    setRequiredFields();

    // Listen to changes in the shipping option buttons
    $('input[name="shipping_option"]').on('change', function() {
        if ($(this).attr('id') === 'our_shipping') {
            // Show our shipping form, hide customer shipping form
            $('#our_shipping_form').show();
            $('#customer_shipping_form').hide();
        } else {
            // Show customer shipping form, hide our shipping form
            $('#our_shipping_form').hide();
            $('#customer_shipping_form').show();
        }
        // Set required fields based on the selected option
        setRequiredFields();
    });

    function setRequiredFields() {
        // Clear all required attributes first
        $('#shipping_method_form input').removeAttr('required');
        $('#shipping_accounts_form input').removeAttr('required');

        // Determine which option is selected
        if ($('#our_shipping').is(':checked')) {
            // Our Shipping is selected, make relevant fields required
            $('#shipping_method_form input[name="shipping_method"]').attr('required', 'required');
        } else {
            // Customer Shipping is selected, make relevant fields required
            $('#shipping_accounts_form input[name="carrier_name"]').attr('required', 'required');
            $('#shipping_accounts_form input[name="carrier_account_number"]').attr('required', 'required');
        }
    }




});


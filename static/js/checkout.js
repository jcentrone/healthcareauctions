document.addEventListener('DOMContentLoaded', function () {
    validateCreditCardForm();
    disableEnableSubmit();
    toggleShippingForms();
    toggleEdit();
    setRequiredFields();


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

// JavaScript to handle form display logic based on the selected shipping option
function toggleShippingForms() {
    const ourShippingRadio = document.getElementById('our_shipping');
    const customerShippingRadio = document.getElementById('customer_shipping');
    const ourShippingForm = document.getElementById('our_shipping_form');
    const customerShippingForm = document.getElementById('customer_shipping_form');
    if (customerShippingRadio.checked) {
        ourShippingForm.style.display = 'none';
        customerShippingForm.style.display = 'block';
    } else {
        ourShippingForm.style.display = 'block';
        customerShippingForm.style.display = 'none';
    }

    // Attach event listeners to radio buttons
    ourShippingRadio.addEventListener('change', toggleShippingForms);
    customerShippingRadio.addEventListener('change', toggleShippingForms);
}

function toggleEdit(section) {
    let sections = [
        document.getElementById('order-contact'),
        document.getElementById('order-shipping-billing')
    ];


    sections.forEach(function (section) {
        let formGroups = section.querySelectorAll('.form-group');
        let formControls = section.querySelectorAll('.form-control');

        formControls.forEach(function (field) {

            if (field.readOnly) {
                field.readOnly = false;
                field.classList.remove('read-only');
            } else {
                field.readOnly = true;
                field.classList.add('read-only');
            }
            if (field.id === 'auction-search' || field.id === 'payment_method' || field.id === 'id_card_number' || field.id === 'id_expiration_date' || field.id === 'id_cvv') {
                field.classList.remove('read-only');
            }
        });

        formGroups.forEach(function (field) {
            // console.log('Field', field);
            if (field.id !== 'auction-search') {

                if (field.classList.contains('no-margin-bottom')) {
                    field.classList.remove('no-margin-bottom');
                } else {

                    field.classList.add('no-margin-bottom');
                }
            }
        });

        // Optionally, you can toggle the text of the edit button
        let editButtons = document.querySelectorAll('.edit-button');
        editButtons.forEach(function (editButton) {
            if (editButton.innerText === "Edit") {
                editButton.innerText = "Save";
            } else {
                editButton.innerText = "Edit";
            }

        });

    });

    let roShipping = document.getElementById('cszReadOnly_shipping');
    let eShipping = document.getElementById('cszEdit_shipping');
    let roBilling = document.getElementById('cszReadOnly_billing');
    let eBilling = document.getElementById('cszEdit_billing')

    if (eShipping.style.display === 'none') {
        roShipping.style.display = 'none';
        eShipping.style.display = 'flex';
        roBilling.style.display = 'none';
        eBilling.style.display = 'flex';
    } else {
        roShipping.style.display = 'flex';
        eShipping.style.display = 'none';
        roBilling.style.display = 'flex';
        eBilling.style.display = 'none';
    }
}

function setRequiredFields() {
    // Listen to changes in the shipping option buttons
    $('input[name="shipping_option"]').on('change', function () {
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

// Hide Modal Instructions forever.
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
});


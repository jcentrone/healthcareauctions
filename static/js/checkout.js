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
        console.log(event.target );
        if (event.target === submitButton) {
            console.log('Disabled submit button clicked.');
            event.preventDefault();  // Prevent any default action
            agreeTermsCheckbox.focus();  // Set focus to the checkbox

            // Show a tooltip or alert
            const tooltip = document.createElement('div');
            tooltip.innerText = 'Please accept the terms and conditions';
            tooltip.style.position = 'absolute';
            tooltip.style.backgroundColor = '#ffc107';
            tooltip.style.padding = '5px 10px';
            tooltip.style.borderRadius = '5px';
            tooltip.style.color = '#000';
            tooltip.style.fontSize = '12px';

            const checkboxRect = agreeTermsCheckbox.getBoundingClientRect();
            tooltip.style.top = `${window.scrollY + checkboxRect.top - 30}px`;
            tooltip.style.left = `${window.scrollX + checkboxRect.left}px`;

            document.body.appendChild(tooltip);

            // Remove the tooltip after 3 seconds
            setTimeout(() => {
                tooltip.remove();
            }, 3000);
        }
    });
}

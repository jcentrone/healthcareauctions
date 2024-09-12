let currentInputId = null;

document.addEventListener('DOMContentLoaded', (event) => {
    function readURL(input, previewId, iconId) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById(previewId).src = e.target.result;
                document.getElementById(previewId).style.display = 'block';
                document.getElementById(iconId).style.display = 'none';
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    // Attach event listeners to all image upload inputs
    document.querySelectorAll('input[type="file"][id^="id_form-"]').forEach((input) => {
        const index = input.id.match(/\d+/)[0]; // Extract the index from the input ID
        input.addEventListener('change', () => {
            readURL(input, `thumbnail-preview-${index}`, `upload-icon-${index}`);
        });
    });

    document.getElementById('id_form-0-sku').required = true;
    document.getElementById('id_category').required = true;
});


document.querySelectorAll('.scan-control').forEach((input) => {
    // Extract the index from the input ID
    input.addEventListener('click', () => {
        // startScanner();
        document.getElementById('scanModal').style.display = 'block';

    });
});

// Hide Show modal onload.
window.onload = () => {
    // document.getElementById('optionModal').style.display = 'block';
    document.getElementById('optionModal').style.display = 'none';
};

document.getElementById('id_fullPackage').addEventListener('change', (event) => {
    let partialQty = document.getElementById('partial-qty');
    let auctionQty = document.getElementById('id_quantity_available');

    if (event.target.checked) {
        partialQty.classList.add('hidden-field');
        auctionQty.disabled = false;

    } else {
        partialQty.classList.remove('hidden-field');
        auctionQty.value = 1;
        auctionQty.disabled = true;
    }
});

document.getElementById('id_quantity_available').addEventListener('change', (event) => {
    let partialQty = document.getElementById('partial-qty');
    let fullPkgEl = document.getElementById('id_fullPackage');


    if (event.target.value > 1) {
        partialQty.style.visibility = 'hidden';
        fullPkgEl.checked = true;
    } else {
        partialQty.style.visibility = 'visible';
        fullPkgEl.checked = false;

    }
});


const options = {
    scanQRCode: 'scanModal',
    importExcel: 'importModal',
    enterDetails: null // Handle Enter Details Manually option
};

Object.keys(options).forEach(option => {
    document.getElementById(option).onclick = () => {
        document.getElementById('optionModal').style.display = 'none';
        const modalId = options[option];
        if (modalId) document.getElementById(modalId).style.display = 'block';
        // if (option === 'scanQRCode') startScanner();
    };
});


document.getElementById('scanQRCode').onclick = () => {
    document.getElementById('optionModal').style.display = 'none';
    document.getElementById('scanModal').style.display = 'block';
    // startScanner();
};

document.addEventListener('DOMContentLoaded', function () {
    const skuInput = document.getElementById('id_form-0-sku');

    // Paste event listener
    skuInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = (e.clipboardData || window.clipboardData).getData('text');
        e.target.value = pastedData;
        parseBarcode(pastedData);
    });

    // Keydown event listener
    skuInput.addEventListener('input', (e) => {
        // Check the length of the input value
        if (skuInput.value.length >= 13) {
            parseBarcode(skuInput.value);
        }
    });

    document.getElementById('sku-intro').removeAttribute('hidden');
});


function triggerHapticFeedback() {
    if (navigator.vibrate) {
        navigator.vibrate(200); // Vibrate for 200 milliseconds
    } else {
        console.log("Vibration API not supported.");
    }
}


// API Functions
function parseBarcode(code) {
    if (code) {
        fetch(`https://accessgudid.nlm.nih.gov/api/v3/parse_udi.json?udi=${code}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log("Device data from AccessGUDID:", data);
                document.getElementById('lookup-errors').innerText = '';
                fetchDeviceData(data.udi);

                // populateForm(data);
            })
            .catch(error => {
                document.getElementById('lookup-errors').innerText = 'No Information Found';
                document.getElementById('close-modal-btn').classList.remove('hidden-field');
                console.error('Error fetching device data:', error);
            });
    }
}

function fetchDeviceData(code) {
    fetch(`https://accessgudid.nlm.nih.gov/api/v3/devices/lookup.json?udi=${code}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("2) Device data from AccessGUDID:", data);
            document.getElementById('lookup-errors').innerText = '';
            populateForm(data);
            fetchClassificationData(data.gudid.device.productCodes.fdaProductCode[0].productCode);
        })
        .catch(error => {
            document.getElementById('lookup-errors').innerText = 'No Information Found';
            document.getElementById('close-modal-btn').classList.remove('hidden-field');
            console.error('Error fetching device data:', error);
        });
}

function fetchClassificationData(code) {
    fetch(`https://api.fda.gov/device/classification.json?search=product_code:${code}&limit=5`)
        .then(response => response.json())
        .then(data => {
            console.log("Device data from AccessGUDID Classification:", data);

            let classificationData = {
                medical_specialty_description: data.results[0].medical_specialty_description,
                device_class: data.results[0].device_class,
                device_name: data.results[0].device_name,
                definition: data.results[0].definition
            };
            console.log("Classification Data:", classificationData);

            let descEl = document.getElementById('id_description');
            let space = '\n';
            descEl.value += space;
            descEl.value += '\n' + data.results[0].definition;

            return fetch('/api/classify-device/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()  // Function to get CSRF token
                },
                body: JSON.stringify(classificationData)
            });
        })
        .then(response => response.json())
        .then(result => {
            console.log(result);
            updateCategoryDropdown(result);
        })
        .catch(error => console.error('Error in processing:', error));
}

function updateCategoryDropdown(result) {
    const selectElement = document.getElementById('id_category');
    const parsedResult = result.category; // Ensure this parsing matches the actual response structure
    // console.log(parsedResult);

    const newValue = parsedResult.value;
    const newText = parsedResult.category_name;

    let optionExists = Array.from(selectElement.options).some(option => {
        if (option.value === newValue || option.textContent === newText) {
            option.selected = true; // Select if it exists
            return true;
        }
        return false;
    });

    if (!optionExists) {
        const newOption = document.createElement('option');
        newOption.value = newValue;
        newOption.textContent = newText;
        newOption.selected = true;
        selectElement.appendChild(newOption);
    }
}


function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}

function populateForm(data, overwrite = false) {
    if (data && data.gudid && data.gudid.device) {
        const device = data.gudid.device;
        const udi = data.udi;
        document.getElementById('id_product_name').value = device.brandName || '';
        document.getElementById('id_manufacturer').value = toProperCase(device.companyName) || '';

        if (udi) {
            const lotNumberField = document.getElementById('id_form-0-lot_number');
            const expirationDateField = document.getElementById('id_form-0-expiration_date');
            const productionDateField = document.getElementById('id_form-0-production_date');

            // Check if the field is empty before assigning a new value
            if (!lotNumberField.value) {
                lotNumberField.value = capitalizeAll(udi.lotNumber) || '';
            }

            if (!expirationDateField.value) {
                expirationDateField.value = udi.expirationDate || '';
            }

            if (!productionDateField.value) {
                productionDateField.value = udi.manufacturingDate || '';
            }
        }


        let description = device.deviceDescription || '';
        let gmdnTerms = device.gmdnTerms.gmdn[0].gmdnPTDefinition || '';
        if (gmdnTerms) {
            description += '\n\n' + gmdnTerms;
        }
        document.getElementById('id_description').value = description;

        let packageQuantity = '';
        let packageType = '';

        if (device.identifiers && device.identifiers.identifier) {
            for (const identifier of device.identifiers.identifier) {
                if (identifier.deviceIdType === "Package") {
                    packageQuantity = identifier.pkgQuantity || '';
                    packageType = identifier.pkgType || '';
                    break;
                } else {
                    packageQuantity = device.deviceCount || '';
                }
            }
        }
        let catalogNumber = device.catalogNumber;

        document.getElementById('id_title').value = catalogNumber;
        document.getElementById('id_package_quantity').value = packageQuantity;

        // Map package type to the dropdown
        const packageTypeField = document.getElementById('id_package_type');
        if (packageType) {
            packageTypeField.value = packageType.toUpperCase();
        } else {
            packageTypeField.value = '';
        }

        document.getElementById('id_deviceSterile').checked = device.sterilization.deviceSterile || false;
        document.getElementById('id_fullPackage').checked = true;
        document.getElementById('partial-qty').classList.add('hidden-field');


        let modal = document.getElementById('modal-bg');
        if (!modal.classList.contains('hidden-field')) {
            modalActions();
        }
    } else {
        console.log("No device data found");
    }
}

// Modal Actions - Workflow
function closeModal() {
    document.getElementById('modal-bg').classList.add('hidden-field');
    // Move placeholder back to modal content and move listing type container
    moveElement('placeholderEL', 'modal-content', true);
    moveElement('sku-field0', 'product-detail-container0', true);
    moveElement('description-name-container', 'auction-summary-container', true);
    moveElement('listingTypeContainer', 'sku-container');
    document.getElementById('sku-intro').setAttribute('hidden', 'hidden');
    // document.getElementById('sku-intro').style.display = 'none';

}

// Function to handle actions within the modal
function modalActions() {
    let placeholderEL = document.getElementById('placeholderEL');
    placeholderEL.style.height = '0px';

    // Move UDI/SKU back to its original position
    moveElement('sku-field0', 'product-detail-container0', true);
    document.getElementById('sku-intro').removeAttribute('hidden');

    // Append placeholder to modal content
    document.getElementById('modal-content').appendChild(placeholderEL);

    // Hide SKU info
    document.getElementById('sku-info').classList.add('hidden-field');

    // Show description information in the modal
    document.getElementById('description-information').classList.remove('hidden-field');

    // Move description container to modal content
    moveElement('description-name-container', 'modal-content');

    // // Destroy the existing TinyMCE instance
    // tinymce.get('id_description').remove();
    // // Reinitialize TinyMCE
    //
    // tinymce.init({
    //     selector: '#id_description',
    //     menubar: false,
    //     plugins: 'autolink charmap lists searchreplace visualblocks wordcount linkchecker',
    //     toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | align lineheight | numlist bullist indent outdent | charmap | removeformat',
    // });

    // Move placeholder to auction summary container
    moveElement('placeholderEL', 'auction-summary-container', true);

    // Show the next button
    document.getElementById('next-modal-btn').classList.remove('hidden-field');
}


// Function to move elements within the DOM
function moveElement(elementId, targetId, prepend = false) {
    let element = document.getElementById(elementId);
    let target = document.getElementById(targetId);
    if (prepend) {
        target.prepend(element);
    } else {
        target.appendChild(element);
    }
}

// Event listener for the next button click
document.getElementById('next-modal-btn').addEventListener('click', function () {
    // Hide description information and move description container
    document.getElementById('description-information').classList.add('hidden-field');
    moveElement('description-name-container', 'auction-summary-container', true);

    // Move placeholder back to modal content
    moveElement('placeholderEL', 'modal-content', true);

    // Show auction type modal title and move listing type container
    document.getElementById('auction-type-modal-title').classList.remove('hidden-field');
    moveElement('listingTypeContainer', 'modal-content', true);
    document.getElementById('id_starting_bid').focus();
    // Move placeholder back to SKU container
    moveElement('placeholderEL', 'sku-container');

    // Hide the next button and show the close button
    document.getElementById('next-modal-btn').classList.add('hidden-field');
    document.getElementById('close-modal-btn').classList.remove('hidden-field');
});

// Event listener for the close button click
document.getElementById('close-modal-btn').addEventListener('click', function () {
    // Move placeholder back to modal content and move listing type container
    moveElement('placeholderEL', 'modal-content', true);
    moveElement('listingTypeContainer', 'sku-container');

    // Hide the modal background
    document.getElementById('modal-bg').classList.add('hidden-field');
});


function toProperCase(str) {
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function capitalizeAll(str) {
    if (str) {
        return str.replace(/\b\w/g, function (char) {
            return char.toUpperCase();
        });
    }
}

function convertDate(dateString) {

    let formattedDate;

    if (dateString.length === 6) {
        // Extract components from the input string
        const year = dateString.substring(0, 2);
        const month = dateString.substring(2, 4);
        const day = dateString.substring(4, 6);

        // Convert the year to YYYY format
        const fullYear = `20${year}`;

        // Format the date as MM/DD/YYYY
        formattedDate = `${month}/${day}/${fullYear}`;

        return formattedDate;
    } else if (dateString.length === 8) {
        // Extract components from the input string
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);


        // Format the date as MM/DD/YYYY
        formattedDate = `${month}/${day}/${year}`;

        return formattedDate;
    }
}

// Add event listeners to scan buttons for individual barcode fields
document.querySelectorAll('[id^="scanButton-"]').forEach(button => {
    button.addEventListener('click', () => {
        const inputId = button.getAttribute('data-input');
        // startScanner(inputId);
        document.getElementById('scanModal').style.display = 'block';
    });
});


// Event listener for the Save button
document.getElementById('closeScanModal').addEventListener('click', function () {
    transferDataToAuctionForm();
    $('#scanModal').modal('hide');
    stopScanner();

});

// Function to extract data from the mapping table
function extractMappingTableData() {
    const rows = document.querySelectorAll('#mapping-table .mapping-row');
    const data = {};

    rows.forEach(row => {
        const key = row.querySelector('select').value;
        const value = row.querySelector('.mapping-cell:last-child').innerText;
        data[key] = value;
    });

    return data;
}

// Function to map extracted data to the auction form fields
function transferDataToAuctionForm() {
    const data = extractMappingTableData();
    console.log(data);

    // Mapping keys to form field IDs
    const fieldMap = {
        '01': 'id_form-0-sku',  // GTIN/UDI
        '10': 'id_form-0-lot_number',  // Batch or Lot Number
        '11': 'id_form-0-production_date',  // Production Date (assuming you have this field)
        '17': 'id_form-0-expiration_date',  // Expiration Date
        'ref': 'id_form-0-reference_number', // Reference Number
        'unknown': 'unknown' // Reference Number
    };

    // Loop through each key in the data object
    Object.keys(data).forEach(key => {
        // Find the corresponding field ID from the fieldMap
        const fieldId = fieldMap[key];

        // If the fieldId exists in the fieldMap, update the corresponding HTML element
        if (fieldId) {
            const element = document.getElementById(fieldId);

            if (element) {
                // Update the element's value with the data
                element.value = data[key];
                if (fieldId === 'id_form-0-sku') {
                    console.log('code', '01' + data[key]);
                    let code = '01' + data[key];
                    parseBarcode(code);
                }
            }
        }
    })

    document.getElementById('scanModal').style.display = 'none';
    closeModal();
}

// Info Icons
document.addEventListener('DOMContentLoaded', function () {
    const infoIcons = document.querySelectorAll('.fa-info-circle');

    infoIcons.forEach(icon => {
        icon.addEventListener('mouseover', function () {
            const tooltip = icon.querySelector('.tooltip');
            if (tooltip) {
                tooltip.style.visibility = 'visible';
                tooltip.style.opacity = 1;
            }
        });

        icon.addEventListener('mouseout', function () {
            const tooltip = icon.querySelector('.tooltip');
            if (tooltip) {
                tooltip.style.visibility = 'hidden';
                tooltip.style.opacity = 0;
            }
        });
    });
});



// Is mobile Device
// Function to check if the device is mobile
function isMobileDevice() {
    return /Mobi|Android/i.test(navigator.userAgent);
}

// DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", function () {
    if (isMobileDevice()) {
        // Show elements meant only for mobile devices
        document.querySelectorAll('.mobile-only').forEach(function (element) {
            element.style.display = 'block';
        });

        // If you have a modal to display, you can show it here
        // For example, if you have a modal with id 'scanModal':
        document.getElementById('scanModal').style.display = 'block';

        // Automatically start the scanner
        initScanner().catch(err => {
            console.error('Failed to initialize scanner:', err);
        });
    } else {
        // Hide mobile-only elements on non-mobile devices
        document.querySelectorAll('.mobile-only').forEach(function (element) {
            element.style.display = 'none';
        });
    }
});

// Auction Type Card Functions
document.addEventListener('DOMContentLoaded', function () {
    const listingTypeContainer = document.getElementById('listingTypeContainer');
    const auctionTab = document.getElementById('auction-tab');
    const buyItNowTab = document.getElementById('buyItNow-tab');

    const updateAuctionType = () => {
        if (auctionTab.classList.contains('active')) {
            listingTypeContainer.setAttribute('data-auctiontype', 'Auction');
            document.getElementById('id_auction_type').value = 'Auction';
            document.getElementById('id_starting_bid').required = true;
            document.getElementById('id_buyItNowPrice').required = false;
            document.getElementById('listing-duration').classList.remove('hidden-field');

        } else {
            listingTypeContainer.setAttribute('data-auctiontype', 'Sale');
            document.getElementById('id_auction_type').value = 'Sale';
            document.getElementById('id_starting_bid').required = false;
            document.getElementById('id_buyItNowPrice').required = true;
            document.getElementById('listing-duration').classList.add('hidden-field');

        }
    };

    auctionTab.addEventListener('click', function () {
        auctionTab.classList.add('active');
        buyItNowTab.classList.remove('active');
        updateAuctionType();
        auctionTab.querySelector('i').style.display = 'inline';
        buyItNowTab.querySelector('i').style.display = 'none';
    });

    buyItNowTab.addEventListener('click', function () {
        buyItNowTab.classList.add('active');
        auctionTab.classList.remove('active');
        updateAuctionType();
        buyItNowTab.querySelector('i').style.display = 'inline';
        auctionTab.querySelector('i').style.display = 'none';
    });

    // Initialize auction type on page load
    updateAuctionType();
    if (auctionTab.classList.contains('active')) {
        auctionTab.querySelector('i').style.display = 'inline';
        buyItNowTab.querySelector('i').style.display = 'none';
    } else {
        buyItNowTab.querySelector('i').style.display = 'inline';
        auctionTab.querySelector('i').style.display = 'none';
    }
});

document.getElementById('auction-form').addEventListener('submit', function (event) {
    let invalidInput = document.querySelector('.tab-content .tab-pane:invalid');
    console.log('Invalid Input', invalidInput);
    if (invalidInput) {
        event.preventDefault();

        let invalidTabId = invalidInput.closest('.tab-pane').id;
        let invalidTabLink = document.querySelector(`a[href="#${invalidTabId}"]`);
        if (invalidTabLink) {
            invalidTabLink.click();
        }

        invalidInput.focus();
    }
});

function updateButtonVisibility() {
    const activeTab = document.querySelector('.nav-tabs .nav-link.active');
    const prevTab = activeTab.parentElement.previousElementSibling?.querySelector('.nav-link');
    const nextTab = activeTab.parentElement.nextElementSibling?.querySelector('.nav-link');
    const prevButton = document.querySelector('.prev-tab');
    const nextButton = document.querySelector('.next-tab');
    prevButton.style.display = prevTab ? 'inline-block' : 'none';
    nextButton.style.display = nextTab ? 'inline-block' : 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('auction-form');
    const errorMessages = document.getElementById('error-messages');


    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Handle tab switching
    function switchToMainTab(tabPaneId) {
        const tabLink = document.querySelector(`a[href="#${tabPaneId}"]`);
        if (tabLink) {
            const tabEvent = new bootstrap.Tab(tabLink);
            tabEvent.show();
        }
    }


    // Initial button visibility update
    updateButtonVisibility();

    document.getElementById('submit-btn').addEventListener('click', function (event) {
        event.preventDefault();

        // Function to validate required fields within a specific container
        function validateRequiredFields(containerSelector) {
            let allValid = true;
            const requiredFields = document.querySelectorAll(`${containerSelector} [required]`);

            requiredFields.forEach((field) => {
                if (!field.value.trim()) {
                    allValid = false;
                    field.classList.add('is-invalid'); // Highlight the empty required field
                } else {
                    field.classList.remove('is-invalid'); // Remove the invalid class if the field has a value
                }
            });

            return allValid;
        }

        // Validate fields on Page 1
        if (!validateRequiredFields('#page1')) {
            Swal.fire({
                title: 'Missing Information!',
                text: 'Please fill in all required fields in the listing summary.',
                icon: 'warning',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'btn btn-warning'
                }
            });
            switchToMainTab('page1');
            updateButtonVisibility();
            return;
        }

        // Validate fields on Page 2
        if (!validateRequiredFields('#mfgPkg-info')) {
            Swal.fire({
                title: 'Missing Information!',
                text: 'Please fill in all required fields in the product details.',
                icon: 'warning',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'btn btn-warning'
                }
            });
            switchToMainTab('page2');
            updateButtonVisibility();
            return;
        }

        // Validate fields in the Product Detail Formset
        if (!validateRequiredFields('#product-detail-formset')) {
            Swal.fire({
                title: 'Missing Information!',
                text: 'Please fill in all required fields in the product details.',
                icon: 'warning',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'btn btn-warning'
                }
            });
            switchToMainTab('page2');
            updateButtonVisibility();
            return;
        }

        // Check if the main image has been uploaded
        const mainImageInput = document.getElementById('id_form-0-image');
        if (!mainImageInput.files.length) {
            Swal.fire({
                title: 'Main Image Missing!',
                text: 'Please upload a main image before submitting your listing.',
                icon: 'warning',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'btn btn-warning'
                }
            });
            switchToMainTab('page3');
            updateButtonVisibility();
            return;
        }

        const formData = new FormData(form);
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        // Clear previous error messages
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
            el.removeAttribute('data-bs-original-title');
            el.removeAttribute('data-bs-toggle');
        });

        // Show processing alert
        Swal.fire({
            title: 'Processing...',
            text: 'Please wait while we create your listing.',
            icon: 'info',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        fetch(form.action, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
            },
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                Swal.close(); // Close the processing alert

                if (data.success) {
                    Swal.fire({
                        title: 'Success!',
                        text: 'Your listing has been added successfully.',
                        icon: 'success',
                        confirmButtonText: 'OK',
                        customClass: {
                            confirmButton: 'btn btn-primary'
                        }
                    }).then(() => {
                        window.location.href = data.redirect_url;
                    });
                } else {
                    Swal.fire({
                        title: 'Error!',
                        text: 'There were errors with your submission.',
                        icon: 'error',
                        confirmButtonText: 'OK',
                        customClass: {
                            confirmButton: 'btn btn-danger'
                        }
                    });

                    const firstErrorField = document.querySelector(`[name="${data.errors[0].field}"]`);
                    if (firstErrorField) {
                        firstErrorField.classList.add('is-invalid');
                        firstErrorField.setAttribute('data-bs-toggle', 'tooltip');
                        firstErrorField.setAttribute('data-bs-original-title', data.errors[0].message);

                        const tooltip = new bootstrap.Tooltip(firstErrorField);
                        tooltip.show();

                        const mainTabPane = firstErrorField.closest('.main-tab');
                        if (mainTabPane) {
                            switchToMainTab(mainTabPane.id);
                            firstErrorField.focus();
                        }
                        updateButtonVisibility();
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.close(); // Close the processing alert

                Swal.fire({
                    title: 'Error!',
                    text: 'An unexpected error occurred. Please try again later.',
                    icon: 'error',
                    confirmButtonText: 'OK',
                    customClass: {
                        confirmButton: 'btn btn-danger'
                    }
                });
            });
    });


    // Clear error message on input
    form.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('input', function () {
            if (input.classList.contains('is-invalid')) {
                input.classList.remove('is-invalid');
                input.removeAttribute('data-bs-original-title');
                input.removeAttribute('data-bs-toggle');
                const tooltip = bootstrap.Tooltip.getInstance(input);
                if (tooltip) {
                    tooltip.dispose();
                }
            }
        });
    });

    // Tab navigation buttons
    document.querySelectorAll('.next-tab').forEach(button => {
        button.addEventListener('click', function () {
            const activeTab = document.querySelector('.nav-tabs .nav-link.active');
            const nextTab = activeTab.parentElement.nextElementSibling?.querySelector('.nav-link');
            if (nextTab) {
                const tabEvent = new bootstrap.Tab(nextTab);
                tabEvent.show();
                updateButtonVisibility();
            }
        });
    });

    document.querySelectorAll('.prev-tab').forEach(button => {
        button.addEventListener('click', function () {
            const activeTab = document.querySelector('.nav-tabs .nav-link.active');
            const prevTab = activeTab.parentElement.previousElementSibling?.querySelector('.nav-link');
            if (prevTab) {
                const tabEvent = new bootstrap.Tab(prevTab);
                tabEvent.show();
                updateButtonVisibility();
            }
        });
    });

    // Update button visibility on tab shown event
    document.querySelectorAll('a[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', updateButtonVisibility);
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const auctionTypeField = document.querySelector('[name="auction_type"]');
    const startingBidField = document.querySelector('[name="starting_bid"]');
    const quantityAvailableField = document.querySelector('[name="quantity_available"]');
    const packageFullField = document.querySelector('[name="fullPackage"]');
    const partialQuantityField = document.querySelector('[name="package_quantity"]');

    function updateFieldRequirements() {
        const auctionType = auctionTypeField.value;
        const packageFull = packageFullField.checked;

        if (auctionType === "Auction") {
            startingBidField.required = true;
            quantityAvailableField.required = true;
        } else {
            startingBidField.required = false;
            quantityAvailableField.required = false;
        }

        if (packageFull) {
            partialQuantityField.required = false;
        } else {
            partialQuantityField.required = true;
        }

    }

    // Initial check
    updateFieldRequirements();

    // Event listeners
    auctionTypeField.addEventListener('change', updateFieldRequirements);
    packageFullField.addEventListener('change', updateFieldRequirements);
});

document.addEventListener('DOMContentLoaded', function () {
    const quantityAvailableField = document.getElementById('id_quantity_available');

    if (quantityAvailableField) {
        quantityAvailableField.addEventListener('input', function () {
            if (parseInt(this.value, 10) > 1) {
                // Your code here for when the value is greater than 1
            }
        });
    }
});

// document.addEventListener('DOMContentLoaded', function () {
//     const formsetContainer = document.getElementById('product-detail-formset');
//     const addButton = document.getElementById('add-product-detail');
//     const totalFormsInput = document.querySelector('#id_form-TOTAL_FORMS');
//     let formCount = parseInt(totalFormsInput.value);
//
//     const parentElement = document.querySelector('[data-form-index="0"]');
//     // const childElement = parentElement.querySelector('.remove-form-row');
//     // childElement.style.opacity = '0';
//
//     addButton.addEventListener('click', function () {
//         const newForm = formsetContainer.querySelector('.product-detail-form').cloneNode(true);
//         const formRegex = RegExp(`form-(\\d){1}-`, 'g');
//         newForm.innerHTML = newForm.innerHTML.replace(formRegex, `form-${formCount}-`);
//         newForm.setAttribute('data-form-index', formCount);
//
//         // Clear the input values
//         Array.from(newForm.querySelectorAll('input')).forEach(input => {
//             input.value = '';
//         });
//
//
//         // Append the new form and update the form count
//         formsetContainer.appendChild(newForm);
//         formCount++;
//         totalFormsInput.value = formCount;
//
//         // Add event listener to the remove button of the new form
//         const removeButton = newForm.querySelector('.remove-form-row');
//         removeButton.style.opacity = '1';
//         removeButton.addEventListener('click', function () {
//             newForm.remove();
//             formCount--;
//             totalFormsInput.value = formCount;
//         });
//     });
//
//     // Attach remove event to initial forms
//     document.querySelectorAll('.remove-form-row').forEach(button => {
//         button.addEventListener('click', function (event) {
//             event.target.closest('.product-detail-form').remove();
//             formCount--;
//             totalFormsInput.value = formCount;
//         });
//     });
// });

document.getElementById('id_form-0-reference_number').addEventListener('input', function () {
    const referenceNumber = this.value;
    let titleInput = document.getElementById('id_title'); // Get the input field
    titleInput.value += referenceNumber;


    if (referenceNumber.length > 0) {
        fetch(`/get_default_image_blob/?reference_number=${referenceNumber}`)
            .then(response => {
                if (response.ok) {
                    return response.blob(); // Get the image as a blob
                } else {
                    throw new Error('Image not found');
                }
            })
            .then(blob => {
                const imgURL = URL.createObjectURL(blob);
                document.getElementById('thumbnail-preview-0').src = imgURL;
                document.getElementById('thumbnail-preview-0').style.display = 'block';
                document.getElementById('upload-icon-0').style.display = 'none';

                // Set the blob to the file input
                const fileInput = document.getElementById('id_form-0-image');
                const file = new File([blob], 'default_image.jpg', {type: blob.type});
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
            })
            .catch(error => {
                console.error('Error fetching the image as blob:', error);
                document.getElementById('thumbnail-preview-0').style.display = 'none';
                document.getElementById('upload-icon-0').style.display = 'block';
            });
    } else {
        document.getElementById('thumbnail-preview-0').style.display = 'none';
        document.getElementById('upload-icon-0').style.display = 'block';
    }
});







let currentInputId = null;

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

// Attach event listener to the main image input
document.getElementById('id_form-0-image').addEventListener('change', () => {
    readURL(document.getElementById('id_form-0-image'), 'main-thumbnail-preview', 'main-upload-icon');
});


// Attach event listeners to all image upload inputs
document.querySelectorAll('input[type="file"][id^="id_form-"]').forEach((input) => {
    const index = input.id.match(/\d+/)[0]; // Extract the index from the input ID
    input.addEventListener('change', () => {
        readURL(input, `thumbnail-preview-${index}`, `upload-icon-${index}`);
    });
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
        partialQty.style.visibility = 'hidden';
        auctionQty.disabled = false;

    } else {
        partialQty.style.visibility = 'visible';
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

// document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('id_udi').addEventListener('change', (e) => {
    parseBarcode(e.target.value);
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


                fetchDeviceData(data.udi);

                // populateForm(data);
            })
            .catch(error => console.error('Error fetching device data:', error));
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
            console.log("Device data from AccessGUDID:", data);
            populateForm(data);
            fetchClassificationData(data.gudid.device.productCodes.fdaProductCode[0].productCode);
        })
        .catch(error => console.error('Error fetching device data:', error));
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

function populateForm(data) {
    console.log(data);
    if (data && data.gudid && data.gudid.device) {
        const device = data.gudid.device;
        document.getElementById('id_product_name').value = device.brandName || '';
        document.getElementById('id_description').value = device.deviceDescription || '';
        document.getElementById('id_manufacturer').value = toProperCase(device.companyName) || '';


        let packageQuantity = '';
        let packageType = '';

        if (device.identifiers && device.identifiers.identifier) {
            for (const identifier of device.identifiers.identifier) {
                if (identifier.deviceIdType === "Package") {
                    packageQuantity = identifier.pkgQuantity || '';
                    packageType = toProperCase(identifier.pkgType || '');
                    break;
                } else {
                    packageQuantity = device.deviceCount || '';
                }
            }
        }


        document.getElementById('id_title').value = device.brandName + " - " + device.deviceDescription;
        document.getElementById('id_package_type').value = packageType;
        document.getElementById('id_package_quantity').value = packageQuantity;
        document.getElementById('id_deviceSterile').checked = device.sterilization.deviceSterile || false;
        document.getElementById('id_fullPackage').checked = device.deviceStatus || false;

        // Modal Actions
        modalActions();

    } else {
        console.log("No device data found");
    }
}

// Modal Actions - Workflow
// Function to handle actions within the modal
function modalActions() {
    let placeholderEL = document.getElementById('placeholderEL');
    placeholderEL.style.height = '0px';

    // Move UDI/SKU back to its original position
    moveElement('sku-field', 'sku-container', true);

    // Append placeholder to modal content
    document.getElementById('modal-content').appendChild(placeholderEL);

    // Hide SKU info
    document.getElementById('sku-info').classList.add('hidden-field');

    // Show description information in the modal
    document.getElementById('description-information').classList.remove('hidden-field');

    // Move description container to modal content
    moveElement('description-name-container', 'modal-content');

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
        '01': 'id_udi',  // GTIN/UDI
        '10': 'id_lot_number',  // Batch or Lot Number
        '11': 'id_production_date',  // Production Date (assuming you have this field)
        '17': 'id_expiration_date',  // Expiration Date
        'ref': 'id_reference_number' // Reference Number
        // Add more mappings as needed
    };

    for (const [key, value] of Object.entries(data)) {
        const fieldId = fieldMap[key];
        if (fieldId) {
            let field = document.getElementById(fieldId);

            if (fieldId === 'id_udi') {
                parseBarcode('01' + value);
                field.value = '01' + value;
            } else if (fieldId === 'id_production_date' || fieldId === 'id_expiration_date') {
                if (!value.includes("/")) {
                    field.value = convertDate(value);
                } else {
                    field.value = value;
                }
            } else {
                field.value = value;
            }


        }
    }
    // stopScanner();
    document.getElementById('scanModal').style.display = 'none';
}

document.getElementById('infoIcon').addEventListener('mouseover', function () {
    document.querySelector('.tooltip').style.visibility = 'visible';
    document.querySelector('.tooltip').style.opacity = 1;
});
document.getElementById('infoIcon').addEventListener('mouseout', function () {
    document.querySelector('.tooltip').style.visibility = 'hidden';
    document.querySelector('.tooltip').style.opacity = 0;
});

// document.getElementById('barcode-image-input').addEventListener('change', handleImageInput);

function handleImageInput(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const codeReader = new ZXing.BrowserMultiFormatReader();
            codeReader.decodeFromImage(img)
                .then(result => {
                    console.log(result);
                    processDetectedBarcode(result);
                })
                .catch(err => {
                    console.error('Failed to decode barcode from image:', err);
                });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}


document.addEventListener("DOMContentLoaded", function () {
    function isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    if (isMobileDevice()) {
        document.querySelectorAll('.mobile-only').forEach(function (element) {
            element.setAttribute('style', 'display: block !important;');
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    console.log('test');
    const listingTypeContainer = document.getElementById('listingTypeContainer');
    const auctionTab = document.getElementById('auction-tab');
    const buyItNowTab = document.getElementById('buyItNow-tab');

    const updateAuctionType = () => {
        if (auctionTab.classList.contains('active')) {
            listingTypeContainer.setAttribute('data-auctiontype', 'Auction');
            document.getElementById('id_auction_type').value = 'Auction';

        } else {
            listingTypeContainer.setAttribute('data-auctiontype', 'Sale');
            document.getElementById('id_auction_type').value = 'Sale';

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

    // Handle form submission via AJAX
    document.getElementById('submit-btn').addEventListener('click', function (event) {
        event.preventDefault();

        const formData = new FormData(form);
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        // Clear previous error messages
        document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
            el.removeAttribute('data-bs-original-title');
            el.removeAttribute('data-bs-toggle');
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
                if (data.success) {
                    // Handle successful form submission (e.g., redirect or show a success message)
                    window.location.href = "{% url 'active_auctions_view' %}";
                } else {
                    // Handle form errors
                    const firstErrorField = document.querySelector(`[name="${data.errors[0].field}"]`);
                    if (firstErrorField) {
                        firstErrorField.classList.add('is-invalid');
                        firstErrorField.setAttribute('data-bs-toggle', 'tooltip');
                        firstErrorField.setAttribute('data-bs-original-title', data.errors[0].message);

                        // Initialize the tooltip for the invalid field
                        const tooltip = new bootstrap.Tooltip(firstErrorField);
                        tooltip.show();

                        const mainTabPane = firstErrorField.closest('.main-tab');
                        if (mainTabPane) {
                            switchToMainTab(mainTabPane.id);
                            firstErrorField.focus();
                            updateButtonVisibility();
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
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
    const packageFullField = document.querySelector('[name="package_full"]');
    const partialQuantityField = document.querySelector('[name="partial_quantity"]');

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






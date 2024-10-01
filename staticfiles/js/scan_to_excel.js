Dynamsoft.License.LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzMDA4ODA4LTEwMzIwMTcyMCIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21sdHMuZHluYW1zb2Z0LmNvbS8iLCJvcmdhbml6YXRpb25JRCI6IjEwMzAwODgwOCIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NsdHMuZHluYW1zb2Z0LmNvbS8iLCJjaGVja0NvZGUiOjg3Njc1NzAyNn0=");
Dynamsoft.Core.CoreModule.loadWasm(["dbr"]);

let cvRouter;
let cameraView;
let cameraEnhancer;
let scannerInitialized = false;
let currentZoomLevel = 1; // Initialize zoom level
let minZoom = 1; // Default values
let maxZoom = 5; // Default values
let scannedItems = [];

const requiredFields = [
    'Product Name',
    'GTIN/UDI',
    'Lot Number',
    'Production Date',
    'Expiration Date',
    'Reference Number',
    'Package Qty',
    'Suggested Price',
    'Quantity'
];

// Fullscreen Helper Functions
function requestFullscreen(element) {
    if (element.requestFullscreen) {
        return element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) { /* Safari */
        return element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { /* IE11 */
        return element.msRequestFullscreen();
    } else {
        return Promise.reject(new Error('Fullscreen API is not supported'));
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        return document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
        return document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
        return document.msExitFullscreen();
    } else {
        return Promise.reject(new Error('Fullscreen API is not supported'));
    }
}

function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
}

async function initScanner() {
    if (scannerInitialized) {
        console.log('Scanner is already initialized.');
        return;
    }
    scannerInitialized = true;

    try {
        cvRouter = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
        cameraView = await Dynamsoft.DCE.CameraView.createInstance(document.getElementById('camera-view-container'));
        cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);

        cvRouter.setInput(cameraEnhancer);

        const dceSelCamera = cameraView.getUIElement('dce-sel-camera');

        // console.log(dceSelCamera);
        // dceSelCamera.classList.add('dropdown'); // Corrected 'dropdowm' to 'dropdown'

        cvRouter.addResultReceiver({
            onDecodedBarcodesReceived: (result) => {
                processDetectedBarcode(result);
            }
        });

        let filter = new Dynamsoft.Utility.MultiFrameResultCrossFilter();
        filter.enableResultCrossVerification("barcode", true);
        filter.enableResultDeduplication("barcode", true);
        await cvRouter.addResultFilter(filter);

        await cameraEnhancer.open();
        await cvRouter.startCapturing("ReadBarcodes_Balance");

        // Initialize UI event listeners
        initializeUI();

        // Initialize Zoom Capabilities
        await initializeZoomCapabilities();
    } catch (error) {
        console.error('Error initializing scanner:', error);
    }
}

async function initializeZoomCapabilities() {
    if (!cameraEnhancer) {
        console.error('Camera Enhancer is not initialized.');
        return;
    }

    try {
        const capabilities = await cameraEnhancer.getCapabilities();
        console.log('Camera Zoom Capabilities:', capabilities.zoom);

        minZoom = capabilities.zoom.min || 1;
        maxZoom = capabilities.zoom.max || 5;

        // Optionally, set initial zoom to the minimum or a default value within the range
        currentZoomLevel = Math.max(minZoom, Math.min(currentZoomLevel, maxZoom));
        await cameraEnhancer.setZoom({factor: currentZoomLevel});
        updateZoomDisplay();
    } catch (error) {
        console.error('Error retrieving camera capabilities:', error);
    }
}

function initializeUI() {
    // Fullscreen Button
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default behavior
            toggleFullscreen();
        });
        console.log('Fullscreen button event listener attached.');
    } else {
        console.error('Fullscreen button not found.');
    }

    // Zoom Buttons
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');

    if (zoomInBtn && zoomOutBtn) {
        zoomInBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Zoom In button clicked.');
            adjustZoom(0.2);
        });
        zoomOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Zoom Out button clicked.');
            adjustZoom(-0.2);
        });
        console.log('Zoom buttons event listeners attached.');
    } else {
        console.error('Zoom buttons not found.');
    }

    // Initialize zoom display
    updateZoomDisplay();
}

function toggleFullscreen() {
    const scannerWrapper = document.getElementById('scanner-wrapper');
    const fullscreenBtnIcon = document.querySelector('#fullscreen-btn i');

    if (!getFullscreenElement()) {
        console.log('Attempting to enter fullscreen.');
        requestFullscreen(scannerWrapper).then(() => {
            console.log('Fullscreen mode activated.');
            if (fullscreenBtnIcon) {
                fullscreenBtnIcon.classList.remove('fa-expand');
                fullscreenBtnIcon.classList.add('fa-compress');
            }
            // Adjust scanner-wrapper height to fill the screen
            scannerWrapper.style.height = '100vh';
        }).catch(err => {
            console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
        });
    } else {
        console.log('Attempting to exit fullscreen.');
        exitFullscreen().then(() => {
            console.log('Fullscreen mode exited.');
            if (fullscreenBtnIcon) {
                fullscreenBtnIcon.classList.remove('fa-compress');
                fullscreenBtnIcon.classList.add('fa-expand');
            }
            // Reset scanner-wrapper height to initial value
            scannerWrapper.style.height = '25vh';
        }).catch(err => {
            console.error(`Error attempting to exit fullscreen mode: ${err.message}`);
        });
    }
}

async function startScanning() {
    if (!cvRouter) {
        console.error('Scanner is not initialized.');
        return;
    }
    await cvRouter.startCapturing("ReadBarcodes_Balance");
}

async function stopScanning() {
    if (!cvRouter) {
        console.error('Scanner is not initialized.');
        return;
    }
    await cvRouter.stopCapturing();
}


document.addEventListener('fullscreenchange', () => {
    console.log('Fullscreen state changed.');
    const fullscreenBtnIcon = document.querySelector('#fullscreen-btn i');
    if (getFullscreenElement()) {
        if (fullscreenBtnIcon) {
            fullscreenBtnIcon.classList.remove('fa-expand');
            fullscreenBtnIcon.classList.add('fa-compress');
        }
    } else {
        if (fullscreenBtnIcon) {
            fullscreenBtnIcon.classList.remove('fa-compress');
            fullscreenBtnIcon.classList.add('fa-expand');
        }
    }
});

// For Safari on iOS which uses webkitfullscreenchange
document.addEventListener('webkitfullscreenchange', () => {
    console.log('webkitFullscreen state changed.');
    const fullscreenBtnIcon = document.querySelector('#fullscreen-btn i');
    if (getFullscreenElement()) {
        if (fullscreenBtnIcon) {
            fullscreenBtnIcon.classList.remove('fa-expand');
            fullscreenBtnIcon.classList.add('fa-compress');
        }
    } else {
        if (fullscreenBtnIcon) {
            fullscreenBtnIcon.classList.remove('fa-compress');
            fullscreenBtnIcon.classList.add('fa-expand');
        }
    }
});

function adjustZoom(delta) {
    if (!cameraEnhancer) {
        console.error('Camera Enhancer is not initialized.');
        return;
    }

    // Update zoom level
    currentZoomLevel += delta;
    currentZoomLevel = Math.max(minZoom, Math.min(currentZoomLevel, maxZoom)); // Limit zoom between min and max

    console.log(`Attempting to set zoom to: ${currentZoomLevel}x`);

    // Prepare settings object
    const zoomSettings = {factor: currentZoomLevel};
    console.log('Zoom Settings:', zoomSettings);

    // Apply zoom
    cameraEnhancer.setZoom(zoomSettings)
        .then(() => {
            console.log(`Zoom level successfully set to ${currentZoomLevel}x`);
            updateZoomDisplay();
        })
        .catch(err => {
            console.error('Error setting zoom level:', err);
        });
}

function updateZoomDisplay() {
    const zoomDisplay = document.getElementById('zoom-level');
    zoomDisplay.textContent = `Zoom: ${currentZoomLevel.toFixed(1)}x`;
}


function triggerHapticFeedback() {
    if (navigator.vibrate) {
        navigator.vibrate(200); // Vibrate for 200 milliseconds
    } else {
        console.log("Vibration API not supported.");
    }
}

function processDetectedBarcode(result) {
    console.log(result);
    result.barcodeResultItems.forEach(item => {
        let code = item.text.replace(/\u001d/g, '');
        let parsedResult = parseGS1Barcode(code);
        displayDetectedBarcode(code, parsedResult);
        triggerHapticFeedback();
        // const element = document.getElementById('results');

        // // Scroll to the element
        // element.scrollIntoView({
        //     behavior: 'smooth', // Options: 'auto' or 'smooth'. Smooth adds a nice scrolling animation
        //     block: 'start',     // Options: 'start', 'center', 'end', or 'nearest'
        //     inline: 'nearest'   // Similar options for inline scrolling ('start', 'center', 'end', 'nearest')
        // });
    });
}

const aiOptions = [
    {label: 'GTIN/UDI', value: '01'},
    {label: 'Lot Number', value: '10'},
    {label: 'Production Date', value: '11'},
    {label: 'Expiration Date', value: '17'},
    {label: 'Reference Number', value: 'ref'},
    {label: 'Package Qty', value: '30'},
    {label: 'Not Needed', value: 'unknown'},
    {label: 'Suggested Price', value: 'suggested_price'}

];

function displayDetectedBarcode(code, parsedResult) {
    const barcodeResults = document.getElementById('results-container');
    const existingSelections = new Set();

    // Collect existing selections to avoid duplicates
    const existingRows = barcodeResults.querySelectorAll('.mapping-row');
    existingRows.forEach(row => {
        const selectedValue = row.querySelector('select').value;
        existingSelections.add(selectedValue);
    });

    const resultDiv = document.createElement('div');
    resultDiv.classList.add('mapping-table');
    resultDiv.id = 'mapping-table';

    // Create a mapping from lowercased labels to options for easier matching
    const aiOptionsMap = {};
    aiOptions.forEach(option => {
        aiOptionsMap[option.label.toLowerCase()] = option;
    });

    for (const [key, value] of Object.entries(parsedResult)) {
        // Normalize the key for matching
        const normalizedKey = key.trim().toLowerCase();

        // Find the matching option
        const matchingOption = aiOptionsMap[normalizedKey];

        if (matchingOption && !existingSelections.has(matchingOption.value)) {
            const displayValue = (normalizedKey === 'production date' || normalizedKey === 'expiration date') ? convertDate(value) : value;

            const row = createMappingRow(matchingOption.value, displayValue);

            existingSelections.add(matchingOption.value); // Add to the set of selected values

            resultDiv.appendChild(row);
        } else {
            // If there's no matching option, you can decide whether to display it or not
            console.warn(`No matching option found for key: ${key}`);
        }
    }

    barcodeResults.appendChild(resultDiv);
}

function addSuggestedPriceRow(suggestedPrice) {
    const mappingTable = document.querySelector('.mapping-table');

    const row = createMappingRow('suggested_price', suggestedPrice);

    // Append the row to the mapping table
    mappingTable.appendChild(row);
}

function addReferenceNumberRow(referenceNumber) {
    const mappingTable = document.querySelector('.mapping-table');

    // Use the helper function to create the mapping row
    const row = createMappingRow('ref', referenceNumber);

    // Insert the new row before the quantity row if you have one
    const quantityRow = mappingTable.querySelector('.mapping-row input[type="number"]');
    if (quantityRow) {
        mappingTable.insertBefore(row, quantityRow.parentElement);
    } else {
        mappingTable.appendChild(row);
    }
}

function createMappingRow(selectedValue, displayValue) {
    const row = document.createElement('div');
    row.classList.add('mapping-row');

    const leftCell = document.createElement('div');
    leftCell.classList.add('mapping-cell');

    const select = document.createElement('select');
    select.classList.add('form-control');

    // Populate the select options
    aiOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.innerText = option.label;
        if (option.value === selectedValue) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });

    leftCell.appendChild(select);

    const arrowCell = document.createElement('div');
    arrowCell.classList.add('arrow');
    arrowCell.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';

    const rightCell = document.createElement('div');
    rightCell.classList.add('mapping-cell');
    rightCell.textContent = displayValue;

    row.appendChild(leftCell);
    row.appendChild(arrowCell);
    row.appendChild(rightCell);

    return row;
}

function parseGS1Barcode(code) {
    console.log(code);
    code = code.replace('{GS}', '').replace(/\u001d/g, '');

    const aiMap = {
        '00': 'SSCC',
        '01': 'GTIN/UDI',
        '10': 'Lot Number',
        '11': 'Production Date',
        '17': 'Expiration Date',
        '21': 'Serial Number',
        '240': 'Additional Product Identification', // Reference Number
        '310': 'Net Weight (kg)',
        '320': 'Net Weight (lb)',
        '30': 'Count of Trade Items / Variable Measure Quantity'
    };

    const fixedLengths = {
        '00': 18,
        '01': 14,
        '11': 6,
        '17': 6
    };

    let index = 0;
    const parsedResult = {};

    while (index < code.length) {
        let aiLength = 2;
        let ai = code.substring(index, index + aiLength);
        let aiInfo = aiMap[ai];

        if (!aiInfo) {
            aiLength = 3;
            ai = code.substring(index, index + aiLength);
            aiInfo = aiMap[ai];
        }

        if (aiInfo) {
            index += aiLength;
            let value;

            if (fixedLengths[ai]) {
                value = code.substring(index, index + fixedLengths[ai]);
                index += fixedLengths[ai];
            } else {
                // Variable length, terminated by FNC1 or end of string
                let endIndex = code.indexOf('\u001d', index);
                if (endIndex === -1) endIndex = code.length;
                value = code.substring(index, endIndex);
                index = endIndex;
            }

            value = value.replace(/[^0-9A-Za-z]/g, "");
            parsedResult[aiInfo] = value;
        } else {
            // If AI not found, skip to next character
            index++;
        }
        fetchDeviceData(code);
    }

    console.log(parsedResult);
    return parsedResult;
}

function convertDate(dateString) {
    // Assuming the date format is YYMMDD
    let year = '20' + dateString.substring(0, 2);
    let month = dateString.substring(2, 4);
    let day = dateString.substring(4, 6);
    return `${year}-${month}-${day}`;
}

function fetchDeviceData(code) {
    let prefix = '';
    let fullCode = prefix + code;
    console.log('Code', code);
    fetch(`https://accessgudid.nlm.nih.gov/api/v3/devices/lookup.json?udi=${code}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            // Return the parsed JSON data
            return response.json();
        })
        .then(data => {
            console.log("Device data from AccessGUDID:", data);
            document.getElementById('product-name').value = data.productCodes[0].deviceName;

        })
        .catch(error => {
            console.error('Error fetching device data:', error);
        });
}

function fetchSuggestedPrice(referenceNumber) {
    return fetch(`/api/suggest_price/${encodeURIComponent(referenceNumber)}/`)
        .then(response => {
            if (response.ok) {
                return response.json(); // Properly parse JSON
            } else {
                throw new Error('No suggested price available.');
            }
        })
        .then(data => {
            // Format the suggested price with comma separators
            const formattedSuggestedPrice = data.suggested_price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            console.log('Suggested Price:', formattedSuggestedPrice);
            return formattedSuggestedPrice;
        });
}

initScanner().catch(err => {
    console.error('Failed to initialize scanner:', err);
});

document.getElementById('scanNextBtn').addEventListener('click', function () {
    // Check if "Reference Number" is present
    const mappingRows = document.querySelectorAll('.mapping-row');
    let referenceNumberPresent = false;
    let referenceNumberValue = '';

    mappingRows.forEach(row => {
        const select = row.querySelector('select');
        if (select && select.value === 'ref') {
            referenceNumberPresent = true;
            const valueCell = row.querySelector('.mapping-cell:last-child');
            if (valueCell) {
                referenceNumberValue = valueCell.textContent.trim();
            }
        }
    });

    if (!referenceNumberPresent) {
        // Show SweetAlert2 modal to ask the user to add a Reference Number
        Swal.fire({
            title: 'Reference Number Missing',
            text: 'Would you like to add a reference number?',
            input: 'text',
            inputPlaceholder: 'Enter Reference Number',
            showCancelButton: true,
            confirmButtonText: 'Add',
            cancelButtonText: 'Cancel',
            customClass: {
                confirmButton: 'btn btn-primary',
                cancelButton: 'btn btn-secondary'
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const referenceNumber = result.value;

                // Add a new mapping row with the Reference Number
                addReferenceNumberRow(referenceNumber);

                // Fetch the suggested price using the reference number
                fetchSuggestedPrice(referenceNumber)
                    .then(formattedSuggestedPrice => {
                        // Add a new mapping row with the suggested price
                        addSuggestedPriceRow(formattedSuggestedPrice);

                        // Proceed with the rest of the scan next functionality
                        proceedToScanNext();
                    })
                    .catch(error => {
                        console.error('Error getting suggested price:', error);
                        // Proceed anyway
                        proceedToScanNext();
                    });
            } else {
                // User cancelled or didn't provide a reference number
                proceedToScanNext();
            }
        });
    } else {
        // Reference Number is present, fetch suggested price
        fetchSuggestedPrice(referenceNumberValue)
            .then(formattedSuggestedPrice => {
                // Add a new mapping row with the suggested price
                addSuggestedPriceRow(formattedSuggestedPrice);

                // Proceed with the rest of the scan next functionality
                proceedToScanNext();
            })
            .catch(error => {
                console.error('Error getting suggested price:', error);
                // Proceed anyway
                proceedToScanNext();
            });
    }
});



function proceedToScanNext() {
    // Initialize currentData with all required fields set to null
    const currentData = {};
    requiredFields.forEach(field => {
        currentData[field] = null; // or use '' for empty string
    });

    // Get product name
    const productNameElement = document.getElementById('product-name');
    const productName = productNameElement.value || productNameElement.innerText || 'Unknown Product';
    currentData['Product Name'] = productName;

    // Get mapping rows within the results-container
    const mappingRows = document.querySelectorAll('#results-container .mapping-row');

    mappingRows.forEach(row => {
        const select = row.querySelector('select');
        const valueCell = row.querySelector('.mapping-cell:last-child');

        if (select && valueCell) {
            const key = select.options[select.selectedIndex].text; // Get the label from the selected option
            const value = valueCell.tagName === 'INPUT' ? valueCell.value : valueCell.textContent.trim();
            currentData[key] = value;
        }
    });

    // Get quantity
    const quantityInput = document.querySelector('.mapping-row input[type="number"]');
    const quantity = quantityInput ? quantityInput.value : '1';
    currentData['Quantity'] = quantity;

    // Store the data
    scannedItems.push(currentData);

    console.log('Current Scanned Items:', scannedItems);
    // Clear the fields for the next scan
    clearFields();
}


function clearFields() {
    // Clear product name
    const productNameElement = document.getElementById('product-name');
    if (productNameElement.tagName === 'INPUT') {
        productNameElement.value = '';
    } else {
        productNameElement.innerText = '';
    }

    // Remove all mapping rows from the results-container
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '';

    // Clear quantity input
    const quantityInput = document.querySelector('.mapping-row input[type="number"]');
    if (quantityInput) {
        quantityInput.value = '1';
    }
}

document.getElementById('exportBtn').addEventListener('click', function () {
    if (scannedItems.length === 0) {
        alert('No scanned items to export.');
        return;
    }

    // Prepare data for SheetJS
    const worksheetData = scannedItems.map((item, index) => {
        const rowData = {
            'No.': index + 1
        };

        requiredFields.forEach(field => {
            rowData[field] = item[field] !== undefined && item[field] !== null ? item[field] : ''; // Use empty string if value is null
        });

        return rowData;
    });

    // Create and export the Excel file
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scanned Items');
    XLSX.writeFile(workbook, 'Scanned_Items.xlsx');
});



Dynamsoft.License.LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzMDA4ODA4LTEwMzIwMTcyMCIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21sdHMuZHluYW1zb2Z0LmNvbS8iLCJvcmdhbml6YXRpb25JRCI6IjEwMzAwODgwOCIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NsdHMuZHluYW1zb2Z0LmNvbS8iLCJjaGVja0NvZGUiOjg3Njc1NzAyNn0=");
Dynamsoft.Core.CoreModule.loadWasm(["dbr"]);

let cvRouter;
let cameraView;
let cameraEnhancer;
let scannerInitialized = false;
let currentZoomLevel = 1; // Initialize zoom level
let minZoom = 1; // Default values
let maxZoom = 5; // Default values

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

        console.log(dceSelCamera);
        dceSelCamera.classList.add('dropdown'); // Corrected 'dropdowm' to 'dropdown'

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

// // Initialize the scanner when the page loads
// window.addEventListener('DOMContentLoaded', initScanner);


function processDetectedBarcode(result) {
    console.log(result);
    result.barcodeResultItems.forEach(item => {
        let code = item.text.replace(/\u001d/g, '');
        let parsedResult = parseGS1Barcode(code);
        displayDetectedBarcode(code, parsedResult);
        triggerHapticFeedback();
        const element = document.getElementById('results');

        // Scroll to the element
        element.scrollIntoView({
            behavior: 'smooth', // Options: 'auto' or 'smooth'. Smooth adds a nice scrolling animation
            block: 'start',     // Options: 'start', 'center', 'end', or 'nearest'
            inline: 'nearest'   // Similar options for inline scrolling ('start', 'center', 'end', 'nearest')
        });
    });
}

function triggerHapticFeedback() {
    if (navigator.vibrate) {
        navigator.vibrate(200); // Vibrate for 200 milliseconds
    } else {
        console.log("Vibration API not supported.");
    }
}

const aiOptions = [
    {label: 'GTIN/UDI', value: '01'},
    {label: 'Lot Number', value: '10'},
    {label: 'Production Date', value: '11'},
    {label: 'Expiration Date', value: '17'},
    {label: 'Reference Number', value: 'ref'},
    {label: 'Package Qty', value: '30'},
    {label: 'Not Needed', value: 'unknown'}
];

function displayDetectedBarcode(code, parsedResult) {
    const barcodeResults = document.getElementById('barcode-results');
    const existingSelections = new Set();
    console.log(parsedResult);
    // Collect existing selections to avoid duplicates
    const existingRows = barcodeResults.querySelectorAll('.mapping-row');
    existingRows.forEach(row => {
        const selectedValue = row.querySelector('select').value;
        existingSelections.add(selectedValue);
    });

    const resultDiv = document.createElement('div');
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
            const row = document.createElement('div');
            row.classList.add('mapping-row');

            const leftCell = document.createElement('div');
            leftCell.classList.add('mapping-cell');
            const select = document.createElement('select');
            select.classList.add('form-control');

            aiOptions.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.innerText = option.label;
                if (option.value === matchingOption.value) {
                    opt.selected = true;
                    existingSelections.add(option.value); // Add to the set of selected values
                }
                select.appendChild(opt);
            });

            leftCell.appendChild(select);

            const arrowCell = document.createElement('div');
            arrowCell.classList.add('arrow');
            arrowCell.innerHTML = `<i class="fa-solid fa-arrow-right"></i>`;

            const rightCell = document.createElement('div');
            rightCell.classList.add('mapping-cell');
            rightCell.innerText = (normalizedKey === 'production date' || normalizedKey === 'expiration date') ? convertDate(value) : value;

            row.appendChild(leftCell);
            row.appendChild(arrowCell);
            row.appendChild(rightCell);

            resultDiv.appendChild(row);
        } else {
            // If there's no matching option, you can decide whether to display it or not
            console.warn(`No matching option found for key: ${key}`);
        }
    }

    barcodeResults.appendChild(resultDiv);
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
        '20': 'Product Variant',
        '21': 'Serial Number',
        '240': 'Additional Product Identification',
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
        let ai = code.substring(index, index + 2);
        let aiInfo = aiMap[ai];

        if (!aiInfo) {
            ai = code.substring(index, index + 3);
            aiInfo = aiMap[ai];
        }

        if (aiInfo) {
            index += ai.length;
            let value;
            if (fixedLengths[ai]) {
                value = code.substring(index, index + fixedLengths[ai]);
                index += fixedLengths[ai];
            } else {
                let endIndex = code.indexOf(',', index);
                if (endIndex === -1) endIndex = code.length;
                value = code.substring(index, endIndex);
                index = endIndex + 1;
            }
            parsedResult[aiInfo] = value.replace(/[^0-9A-Za-z]/g, "");
        } else {
            let endIndex = code.indexOf(',', index);
            if (endIndex === -1) endIndex = code.length;
            const unknownValue = code.substring(index, endIndex);
            parsedResult['Not Needed'] = unknownValue.replace(/[^0-9A-Za-z]/g, "");
            index = endIndex + 1;
        }
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



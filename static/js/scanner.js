Dynamsoft.License.LicenseManager.initLicense("DLS2eyJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSJ9");
Dynamsoft.Core.CoreModule.loadWasm(["dbr"]);
(async () => {
    let cvRouter = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();

    let cameraView = await Dynamsoft.DCE.CameraView.createInstance();
    let cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);
    document.querySelector("#camera-view-container").append(cameraView.getUIElement());
    cvRouter.setInput(cameraEnhancer);

    const resultsContainer = document.querySelector("#results");
    cvRouter.addResultReceiver({
        onDecodedBarcodesReceived: (result) => {
            processDetectedBarcode(result);
            if (result.barcodeResultItems.length > 0) {
                {
                    resultsContainer.textContent = '';

                }
                for (let item of result.barcodeResultItems) {
                    resultsContainer.textContent += `${item.formatString}: ${item.text}\n\n`;
                }
            }
        }
    });

    let filter = new Dynamsoft.Utility.MultiFrameResultCrossFilter();
    filter.enableResultCrossVerification("barcode", true);
    filter.enableResultDeduplication("barcode", true);
    await cvRouter.addResultFilter(filter);

    await cameraEnhancer.open();
    await cvRouter.startCapturing("ReadBarcodes_Balance");
})();


function processDetectedBarcode(result) {
    const code = result.text;
    const format = formatMap[result.format];

    if (!scannedBarcodes.find(item => item.code === code)) {
        const parsedResult = format === 'QR Code' || format === 'Data Matrix'
            ? parseQRCode(code)
            : parseGS1Barcode(code);

        scannedBarcodes.push({code: code, format: format, parsed: parsedResult});
        displayDetectedBarcode(code, format, parsedResult);
        triggerHapticFeedback(); // Trigger haptic feedback
    }
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
    {label: 'Batch or Lot Number', value: '10'},
    {label: 'Production Date', value: '11'},
    {label: 'Expiration Date', value: '17'},
    {label: 'Reference Number', value: 'ref'},
    {label: 'Package Qty', value: '30'},
    {label: 'Unknown/Not Needed', value: 'Unknown'}
];

function displayDetectedBarcode(code, format, parsedResult) {
    const barcodeResults = document.getElementById('barcode-results');
    const resultDiv = document.createElement('div');
    resultDiv.id = 'mapping-table';

    for (const [key, value] of Object.entries(parsedResult)) {
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
            if (option.label === key) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

        leftCell.appendChild(select);

        const arrowCell = document.createElement('div');
        arrowCell.classList.add('arrow');
        arrowCell.innerHTML = `<i class="fa-solid fa-arrow-right"></i>`;

        const rightCell = document.createElement('div');
        rightCell.classList.add('mapping-cell');
        let formattedDate;
        if (key === 'Production Date' || key === 'Expiration Date') {
            formattedDate = convertDate(value);
        } else {
            formattedDate = value;
        }
        rightCell.innerText = formattedDate;

        row.appendChild(leftCell);
        row.appendChild(arrowCell);
        row.appendChild(rightCell);

        resultDiv.appendChild(row);
    }

    barcodeResults.appendChild(resultDiv);
}

function parseQRCode(code) {
    const sanitizedCode = code.replace(/[^ -~]+/g, ""); // Remove non-printable ASCII characters
    const aiPatterns = {
        "01": "GTIN",
        "10": "Batch or Lot Number",
        "11": "Production Date",
        "17": "Expiration Date",
        '21': 'Serial Number',
        '310': 'Net Weight (kg)',
        '320': 'Net Weight (lb)',
        '30': 'Count of Trade Items / Variable Measure Quantity',

    };
    const parsedResult = {};
    let remainingCode = sanitizedCode;
    while (remainingCode.length > 0) {
        const ai = remainingCode.substring(0, 2);
        if (aiPatterns[ai]) {
            const field = aiPatterns[ai];
            let length;
            if (ai === "01") length = 14; // GTIN length
            else if (ai === "10") length = 20; // Lot Number max length
            else length = 6; // Dates length
            const value = remainingCode.substring(2, 2 + length).replace(/[^0-9A-Za-z]/g, "");
            parsedResult[field] = value;
            remainingCode = remainingCode.substring(2 + length);
        } else {
            remainingCode = remainingCode.substring(2);
        }
    }
    console.log(parsedResult);
    return parsedResult;
}

function parseGS1Barcode(code) {
    const aiMap = {
        '00': 'SSCC',
        '01': 'GTIN',
        '10': 'Batch or Lot Number',
        '11': 'Production Date',
        '17': 'Expiration Date',
        '21': 'Serial Number',
        '310': 'Net Weight (kg)',
        '320': 'Net Weight (lb)',
        '30': 'Count of Trade Items / Variable Measure Quantity',

    };

    const fixedLengths = {
        '00': 18,
        '01': 14,
        '11': 6,
        '17': 6
    };

    let index = 0;
    const length = code.length;
    const parsedResult = {};
    let unknownIndex = 1;

    while (index < length) {
        let ai = code.substring(index, index + 2);
        let aiInfo = aiMap[ai];

        if (!aiInfo) {
            ai = code.substring(index, index + 3);
            aiInfo = aiMap[ai];
        }

        if (aiInfo) {
            index += ai.length;

            // Determine length of the value
            let value;
            if (fixedLengths[ai]) {
                value = code.substring(index, index + fixedLengths[ai]);
                index += fixedLengths[ai];
            } else {
                let endIndex = code.indexOf(',', index);
                if (endIndex === -1) {
                    endIndex = length;
                }
                value = code.substring(index, endIndex);
                index = endIndex + 1;
            }

            parsedResult[aiInfo] = value.replace(/[^0-9A-Za-z]/g, "");
        } else {
            // Handle unknown AI
            let endIndex = code.indexOf(',', index);
            if (endIndex === -1) {
                endIndex = length;
            }
            const unknownValue = code.substring(index, endIndex);
            parsedResult[`Unknown/Not Needed`] = unknownValue.replace(/[^0-9A-Za-z]/g, "");
            index = endIndex + 1;
        }
    }

    console.log(parsedResult);
    return parsedResult;
}
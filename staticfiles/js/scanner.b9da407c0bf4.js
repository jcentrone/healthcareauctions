

Dynamsoft.License.LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAzMDA4ODA4LTEwMzIwMTcyMCIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21sdHMuZHluYW1zb2Z0LmNvbS8iLCJvcmdhbml6YXRpb25JRCI6IjEwMzAwODgwOCIsInN0YW5kYnlTZXJ2ZXJVUkwiOiJodHRwczovL3NsdHMuZHluYW1zb2Z0LmNvbS8iLCJjaGVja0NvZGUiOjg3Njc1NzAyNn0=");
Dynamsoft.Core.CoreModule.loadWasm(["dbr"]);

(async () => {
    let cvRouter = await Dynamsoft.CVR.CaptureVisionRouter.createInstance();
    let cameraView = await Dynamsoft.DCE.CameraView.createInstance(document.getElementById('camera-view-container'));
    let cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance(cameraView);

    cvRouter.setInput(cameraEnhancer);

    const dceSelCamera = cameraView.getUIElement('dce-sel-camera') ;

    console.log(dceSelCamera);
    dceSelCamera.classList.add('dropdowm');

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



    console.log(cameraView.getUIElement());
})();

function processDetectedBarcode(result) {
    console.log(result);
    result.barcodeResultItems.forEach(item => {
        let code = item.text.replace(/\u001d/g, '');
        let parsedResult = parseGS1Barcode(code);
        displayDetectedBarcode(code, parsedResult);
        triggerHapticFeedback();

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
    { label: 'GTIN/UDI', value: '01' },
    { label: 'Batch or Lot Number', value: '10' },
    { label: 'Production Date', value: '11' },
    { label: 'Expiration Date', value: '17' },
    { label: 'Reference Number', value: 'ref' },
    { label: 'Package Qty', value: '30' },
    { label: 'Unknown/Not Needed', value: 'Unknown' }
];

function displayDetectedBarcode(code, parsedResult) {
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
        rightCell.innerText = (key === 'Production Date' || key === 'Expiration Date') ? convertDate(value) : value;

        row.appendChild(leftCell);
        row.appendChild(arrowCell);
        row.appendChild(rightCell);

        resultDiv.appendChild(row);
    }

    barcodeResults.appendChild(resultDiv);
}

function parseGS1Barcode(code) {
    console.log(code);
    code = code.replace('{GS}', '').replace(/\u001d/g, '');

    const aiMap = {
        '00': 'SSCC',
        '01': 'GTIN',
        '10': 'Batch or Lot Number',
        '11': 'Production Date',
        '17': 'Expiration Date',
        '21': 'Serial Number',
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
            parsedResult['Unknown/Not Needed'] = unknownValue.replace(/[^0-9A-Za-z]/g, "");
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




const importModal = new bootstrap.Modal(document.getElementById('importModal'));


// Handle file selection and process the Excel file
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => processFile(e);
        reader.readAsArrayBuffer(file);
    }
}

// Process the uploaded file and update the UI
function processFile(event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

    generatePreviewTable(json);
    generateMappingTable(json);
    updateStep1UI();
}

// Update UI to reflect Step 1 completion
function updateStep1UI() {
    const step1 = document.getElementById('step1');
    const step1Icon = document.getElementById('step1-icon');
    step1.style.backgroundColor = '#d4edda';
    step1Icon.classList.remove('fa-file-excel');
    step1Icon.classList.add('fa-check-circle');
    step1.querySelector('h5').innerText = 'Step 1: Excel File Added';
    step1.querySelector('p').innerText = 'File added. Select another to start over.';
    document.getElementById('import-mapping').style.display = 'none';
    document.getElementById('import-button').style.display = 'block';
}

// Handle the Map Columns button click
function handleMapColumnsClick() {
    document.getElementById('mappingModal').style.display = 'block';
    document.getElementById('import-mapping').style.display = 'none';
    document.getElementById('importModalLabel').innerText = 'Step 2: Map Your Data';
    importModal.show();
    document.getElementById('addImgBtn').disabled = false;
}

// Close the import modal
function closeImportModal() {
    importModal.hide();
    // if (validateImportData()) { // Call your validation function here
    //
    // }
}

// Generate the preview table from the uploaded data
function generatePreviewTable(data) {
    const previewTableHead = document.getElementById('previewTableHead');
    const previewTableBody = document.getElementById('previewTableBody');
    previewTableHead.innerHTML = '';
    previewTableBody.innerHTML = '';

    const headerRow = createHeaderRow(data[0]);
    previewTableHead.appendChild(headerRow);

    data.slice(1, 6).forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        processRowData(row, rowIndex, tr);
        previewTableBody.appendChild(tr);
    });

    document.getElementById('previewContainer').style.display = 'block';
}

// Create header row for the preview table
function createHeaderRow(headers) {
    const headerRow = document.createElement('tr');
    const fetchedDataHeaders = ['Auction Title', 'Description', 'Category', 'Category ID', 'Manufacturer', 'Package Type', 'Sterile', 'Implantable'];

    fetchedDataHeaders.forEach(header => {
        const th = document.createElement('th');
        th.innerText = header;
        headerRow.appendChild(th);
    });

    headers.forEach(header => {
        const th = document.createElement('th');
        th.innerText = header;
        headerRow.appendChild(th);
    });

    const imageHeader = document.createElement('th');
    imageHeader.innerText = 'Images';
    headerRow.appendChild(imageHeader);

    return headerRow;
}

// Process each row of data and create corresponding table cells
function processRowData(row, rowIndex, tr) {
    const sku = row[0];
    fetchDeviceData(sku)
        .then(deviceData => fetchClassificationData(deviceData.gudid.device.productCodes.fdaProductCode[0].productCode))
        .then(classificationData => {
            const fetchedDataValues = prepareFetchedDataValues(deviceData, classificationData);
            appendFetchedDataToRow(fetchedDataValues, tr);
            appendUserDataToRow(row, tr);
            appendImageUploadButton(rowIndex, tr);
            setupHoverModal(tr, fetchedDataValues, row);
        })
        .catch(error => handleRowError(tr, row, rowIndex));
}

// Prepare the fetched data values for the preview table
function prepareFetchedDataValues(deviceData, classificationData) {
    const auctionTitle = deviceData.gudid.device.deviceDescription || 'No title available';
    const manufacturer = deviceData.gudid.device.companyName || 'Unknown';
    const packageType = deviceData.gudid.device.identifiers.identifier[0].pkgType || 'Unknown';
    const deviceSterile = deviceData.gudid.device.sterilization.deviceSterile ? 'Yes' : 'No';
    const implantable = deviceData.gudid.device.gmdnTerms.gmdn[0].implantable ? 'Yes' : 'No';
    const description = classificationData.description || 'No description available';
    const category = classificationData.category || 'No category';
    const categoryId = classificationData.category_id || 'N/A';
    return [auctionTitle, description, category, categoryId, manufacturer, packageType, deviceSterile, implantable];
}

// Append fetched data cells to the row
function appendFetchedDataToRow(fetchedDataValues, tr) {
    fetchedDataValues.forEach(value => {
        const td = document.createElement('td');
        td.innerText = value;
        tr.appendChild(td);
    });
}

// Append user data cells to the row
function appendUserDataToRow(row, tr) {
    row.forEach((cellValue, colIndex) => {
        const td = document.createElement('td');
        td.innerText = (typeof cellValue === 'number' && isExcelDate(cellValue)) ? formatDate(cellValue) : cellValue || '';
        tr.appendChild(td);
    });
}

// Append image upload button to the row
function appendImageUploadButton(rowIndex, tr) {
    const td = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('btn', 'btn-info');
    button.innerText = 'Add';
    button.setAttribute('data-row-index', rowIndex);
    button.addEventListener('click', () => showImageUploadModal(rowIndex));
    td.appendChild(button);
    tr.appendChild(td);
}

// Handle errors when processing a row
function handleRowError(tr, row, rowIndex) {
    const errorValues = ['Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error'];
    appendFetchedDataToRow(errorValues, tr);
    appendUserDataToRow(row, tr);
    appendImageUploadButton(rowIndex, tr);
}

// Show the image upload modal
function showImageUploadModal(rowIndex) {
    const imageUploadContainer = document.getElementById('imageUploadContainer');
    imageUploadContainer.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
        const div = createImageUploadField(rowIndex, i);
        imageUploadContainer.appendChild(div);
    }

    const modal = document.getElementById('imageUploadModal');
    modal.style.display = 'block';
}

// Create an image upload field
function createImageUploadField(rowIndex, i) {
    const div = document.createElement('div');
    div.classList.add('form-group', 'mb-2');

    const label = document.createElement('label');
    label.innerText = `Image ${i}`;
    div.appendChild(label);

    const input = document.createElement('input');
    input.type = 'file';
    input.classList.add('form-control');
    input.name = `images_${rowIndex}_${i}`;
    div.appendChild(input);

    return div;
}

function openAddImagesStep() {
    // Hide the mapping section and show the import-mapping section
    document.getElementById('import-mapping').style.display = 'block';
    document.getElementById('mappingModal').style.display = 'none';

    // Enable the import button
    document.getElementById('import-button').disabled = false;

    // Update the modal title for Step 3
    document.getElementById('importModalLabel').innerText = 'Step 3: Add Images';

    // Get the instance of the modal and show it
    let importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
    importModal.show();
}


// Hide the image upload modal
function hideImageUploadModal() {
    const modal = document.getElementById('imageUploadModal');
    modal.style.display = 'none';
}

// Event listeners for buttons and file input
document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('mapColumnsBtn').addEventListener('click', handleMapColumnsClick);
document.getElementById('closeMappingModal').addEventListener('click', closeImportModal);
document.getElementById('closeAddImgBtn').addEventListener('click', closeImportModal);
document.getElementById('import-button').addEventListener('click', () => document.getElementById('importForm').submit());
document.getElementById('closeImageModal').addEventListener('click', hideImageUploadModal);
document.getElementById('addImgBtn').addEventListener('click', openAddImagesStep);

window.addEventListener('click', function (event) {
    const modal = document.getElementById('imageUploadModal');
    if (event.target === modal) {
        hideImageUploadModal();
    }
});

// Other helper functions: isExcelDate, formatDate, fetchDeviceData, fetchClassificationData, getCsrfToken


// Determine if is excel date
function isExcelDate(value) {
    return value > 25569;
}

//Format date
function formatDate(excelDate) {
    const date = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

// Fetch Device Data
function fetchDeviceData(code) {
    return fetch(`https://accessgudid.nlm.nih.gov/api/v3/devices/lookup.json?udi=${code}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok for device code: ${code}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Device data from AccessGUDID:", data);
            return data;
        })
        .catch(error => {
            console.error('Error fetching device data:', error);
            return null; // Handle error by returning null or a default object
        });
}

function fetchClassificationData(code) {
    return fetch(`https://api.fda.gov/device/classification.json?search=product_code:${code}&limit=5`)
        .then(response => response.json())
        .then(data => {
            console.log("Device data from AccessGUDID Classification:", data);

            if (data.results && data.results.length > 0) {
                let classificationData = {
                    medical_specialty_description: data.results[0].medical_specialty_description,
                    device_class: data.results[0].device_class,
                    device_name: data.results[0].device_name,
                    definition: data.results[0].definition
                };

                // Combine title and definition for the description
                let description = `${classificationData.device_name}: ${classificationData.definition}`;

                // Fetch the category based on classification data
                return fetch('/api/classify-device/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()  // Function to get CSRF token
                    },
                    body: JSON.stringify(classificationData)
                })
                    .then(response => response.json())
                    .then(result => {
                        classificationData.category = result.category.category_name;
                        classificationData.category_id = result.category.value;
                        classificationData.description = description;
                        return classificationData;
                    });
            } else {
                throw new Error(`No classification data found for product code: ${code}`);
            }
        })
        .catch(error => {
            console.error('Error fetching classification data:', error);
            return null;  // Return null to indicate failure
        });
}



// Ensure all fields are correctly mapped
function checkAllFieldsMapped() {
    const mappingTable = document.getElementById('mappingTable');
    let allFieldsMapped = true;

    mappingTable.querySelectorAll('select').forEach(select => {
        if (select.value === 'na') {
            allFieldsMapped = false;
        }
    });

    updateStep2UI(allFieldsMapped);
}
// Get the CSRF Toekn from template
function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}

// Update UI for Step 2 based on mapping status
function updateStep2UI(allFieldsMapped) {
    const step2 = document.getElementById('step2');
    const step2Icon = document.getElementById('step2-icon');
    const mapColumnsBtn = document.getElementById('mapColumnsBtn');
    const addImgBtn = document.getElementById('addImgBtn');

    if (allFieldsMapped) {
        addImgBtn.disabled = false;
        step2.style.backgroundColor = '#d4edda';
        step2Icon.classList.remove('fa-arrows-alt');
        step2Icon.classList.add('fa-check-circle');
        step2.querySelector('h5').innerText = 'Step 2: Columns Mapped';
        step2.querySelector('p').innerText = 'All columns auto-mapped, nothing to do here.';
        mapColumnsBtn.disabled = true;
    } else {
        addImgBtn.disabled = true;
        step2.style.backgroundColor = '';
        step2Icon.classList.remove('fa-check-circle');
        step2Icon.classList.add('fa-arrows-alt');
        step2.querySelector('h5').innerText = 'Step 2: Map Your Columns';
        step2.querySelector('p').innerText = 'Match your Excel columns to the auction fields.';
        mapColumnsBtn.disabled = false;
    }
}

// Generate the mapping table
function generateMappingTable(data) {
    const headers = data[0];
    const formFields = [
        { label: 'SKU', value: 'sku' },
        { label: 'Reference Number', value: 'reference_number' },
        { label: 'Lot Number', value: 'lot_number' },
        { label: 'Production Date', value: 'production_date' },
        { label: 'Expiration Date', value: 'expiration_date' },
        { label: 'Quantity Available', value: 'quantity_available' },
        { label: 'Auction Type', value: 'auction_type' },
        { label: 'Starting Bid', value: 'starting_bid' },
        { label: 'Reserve Bid', value: 'reserve_bid' },
        { label: 'Sale Price', value: 'buyItNowPrice' },
        { label: 'Auction Duration', value: 'auction_duration' },
        { label: 'Not Applicable', value: 'na' }
    ];

    const mappingTable = document.getElementById('mappingTable');
    mappingTable.innerHTML = '';

    headers.forEach(header => {
        const row = document.createElement('tr');

        const fileHeaderCell = document.createElement('td');
        fileHeaderCell.innerText = header;
        row.appendChild(fileHeaderCell);

        const arrowCell = document.createElement('td');
        arrowCell.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
        row.appendChild(arrowCell);

        const formFieldCell = document.createElement('td');
        const select = document.createElement('select');
        select.classList.add('form-control');
        let isMapped = false;

        formFields.forEach(field => {
            const option = document.createElement('option');
            option.value = field.value;
            option.innerText = field.label;
            if (field.label.toLowerCase() === header.toLowerCase()) {
                option.selected = true;
                isMapped = true;
            }
            select.appendChild(option);
        });

        if (!isMapped) {
            allFieldsMapped = false;
        }

        formFieldCell.appendChild(select);
        row.appendChild(formFieldCell);
        mappingTable.appendChild(row);

        select.addEventListener('change', checkAllFieldsMapped);
    });

    checkAllFieldsMapped();
    document.getElementById('mappingContainer').style.display = 'block';
    document.getElementById('mappingModal').style.display = 'block';
}

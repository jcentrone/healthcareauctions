function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1, raw: true});

            generatePreviewTable(json);
            generateMappingTable(json);
            document.getElementById('import-mapping').style.display = 'none';
            document.getElementById('import-button').style.display = 'block';

            document.getElementById('mapColumnsBtn').disabled = false;


        };
        reader.readAsArrayBuffer(file);
    }
}

document.getElementById('mapColumnsBtn').addEventListener('click', function (event) {
    document.getElementById('mappingModal').style.display = 'block';
    document.getElementById('import-mapping').style.display = 'none';
    document.getElementById('importModalLabel').innerText = 'Step 2: Map Your Data';
    const importModal = new bootstrap.Modal(document.getElementById('importModal'));
    importModal.show();
    document.getElementById('addImgBtn').disabled = false;
})


function closeImportModal() {
    let importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
    importModal.hide();

}

// Example usage: Close the modal when the "Okay" button is clicked.
document.getElementById('closeMappingModal').addEventListener('click', closeImportModal);
document.getElementById('closeAddImgBtn').addEventListener('click', closeImportModal);


document.getElementById('addImgBtn').addEventListener('click', function (event) {
    document.getElementById('import-mapping').style.display = 'block';
    document.getElementById('mappingModal').style.display = 'none';
    document.getElementById('import-button').disabled = false;
    document.getElementById('importModalLabel').innerText = 'Step 3: Add Images';
    let importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
    importModal.show();

})

// Import button
document.getElementById('import-button').addEventListener('click', function () {
    document.getElementById('importForm').submit();
});

function generatePreviewTable(data) {
    const previewTableHead = document.getElementById('previewTableHead');
    const previewTableBody = document.getElementById('previewTableBody');
    previewTableHead.innerHTML = '';
    previewTableBody.innerHTML = '';

    // Create table header
    const headerRow = document.createElement('tr');

    // Add headers for the fetched fields first
    const fetchedDataHeaders = ['Auction Title', 'Description', 'Category', 'Category ID', 'Manufacturer', 'Package Type', 'Sterile', 'Implantable'];
    fetchedDataHeaders.forEach(header => {
        const th = document.createElement('th');
        th.innerText = header;
        headerRow.appendChild(th);
    });

    // Add headers from the user's file
    data[0].forEach(header => {
        const th = document.createElement('th');
        th.innerText = header;
        headerRow.appendChild(th);
    });

    // Add header for Images upload
    const imageHeader = document.createElement('th');
    imageHeader.innerText = 'Images';
    headerRow.appendChild(imageHeader);

    previewTableHead.appendChild(headerRow);

    // Create table body
    data.slice(1, 6).forEach((row, rowIndex) => {
        const tr = document.createElement('tr');

        // Initialize a variable to keep track of the first td
        let firstTd = null;

        // Fetch data for the given SKU (assumed to be in the first column)
        const sku = row[0];
        fetchDeviceData(sku)
            .then(deviceData => {
                if (deviceData) {
                    const auctionTitle = deviceData.gudid.device.deviceDescription || 'No title available';
                    const manufacturer = deviceData.gudid.device.companyName || 'Unknown';
                    const packageType = deviceData.gudid.device.identifiers.identifier[0].pkgType || 'Unknown';
                    const deviceSterile = deviceData.gudid.device.sterilization.deviceSterile ? 'Yes' : 'No';
                    const implantable = deviceData.gudid.device.gmdnTerms.gmdn[0].implantable ? 'Yes' : 'No';

                    function createModalEL(key, value) {
                        let rowEL = document.createElement('div');
                        rowEL.classList.add('row')

                        let labelEL = document.createElement('div');
                        labelEL.classList.add('col-md-4');
                        labelEL.classList.add('fw-bold');
                        labelEL.innerText = key;
                        rowEL.appendChild(labelEL);

                        let valueEL = document.createElement('div');
                        valueEL.innerText = value;
                        valueEL.classList.add('col-md-8');
                        rowEL.appendChild(valueEL);

                        return rowEL;
                    }

                    fetchClassificationData(deviceData.gudid.device.productCodes.fdaProductCode[0].productCode)
                        .then(classificationData => {
                            if (classificationData) {
                                const description = classificationData.description || 'No description available';
                                const category = classificationData.category || 'No category';
                                const categoryId = classificationData.category_id || 'N/A';
                                const fetchedDataValues = [auctionTitle, description, category, categoryId, manufacturer, packageType, deviceSterile, implantable];

                                // Create the hidden div with the full data for the modal
                                const modalContentDiv = document.createElement('div');
                                modalContentDiv.classList.add('hover-modal-content');
                                modalContentDiv.appendChild(createModalEL('Auction Title', auctionTitle));
                                modalContentDiv.appendChild(createModalEL('Description', description));
                                modalContentDiv.appendChild(createModalEL('Category', category));
                                modalContentDiv.appendChild(createModalEL('Manufacturer', manufacturer));
                                modalContentDiv.appendChild(createModalEL('Package Type:', packageType));
                                modalContentDiv.appendChild(createModalEL('Sterile', deviceSterile));
                                modalContentDiv.appendChild(createModalEL('Implantable', implantable));

                                // Add cells for the fetched data first
                                fetchedDataValues.forEach((value, index) => {
                                    const td = document.createElement('td');
                                    td.innerText = value;
                                    tr.appendChild(td);

                                    if (index === 0) {
                                        // This is the first td, so store a reference to it
                                        firstTd = td;
                                    }


                                });

                                // Add cells for the user's file data
                                data[0].forEach((header, colIndex) => {
                                    const td = document.createElement('td');
                                    let cellValue = row[colIndex];

                                    // Check if the cell value is a date and format it if necessary
                                    if (typeof cellValue === 'number' && isExcelDate(cellValue)) {
                                        cellValue = formatDate(cellValue);
                                    }

                                    td.innerText = cellValue !== undefined ? cellValue : '';  // Handle null or undefined values
                                    tr.appendChild(td);
                                    modalContentDiv.appendChild(createModalEL(header, cellValue));
                                });

                                // Add modal control for image upload fields
                                const td = document.createElement('td');
                                const button = document.createElement('button');
                                button.type = 'button';
                                button.classList.add('btn', 'btn-info');
                                button.innerText = 'Add';
                                button.setAttribute('data-row-index', rowIndex);
                                button.addEventListener('click', () => showImageUploadModal(rowIndex));
                                td.appendChild(button);
                                tr.appendChild(td);
                                tr.appendChild(modalContentDiv);

                                // Add event listeners to show/hide the modal on hover
                                firstTd.addEventListener('mouseenter', function (e) {
                                    modalContentDiv.style.display = 'block';
                                    modalContentDiv.style.top = `${e.clientY + 20}px`; // Adjust vertical offset if necessary
                                    modalContentDiv.style.left = `${e.clientX + 20}px`; // Adjust horizontal offset if necessary
                                });

                                firstTd.addEventListener('mousemove', function (e) {
                                    modalContentDiv.style.top = `${e.clientY + 20}px`;
                                    modalContentDiv.style.left = `${e.clientX + 20}px`;
                                });

                                firstTd.addEventListener('mouseleave', function () {
                                    modalContentDiv.style.display = 'none';
                                });


                                previewTableBody.appendChild(tr);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching classification data:', error);
                            // Handle the error and show something in the row
                            const errorValues = ['Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error'];
                            errorValues.forEach(value => {
                                const td = document.createElement('td');
                                td.innerText = value;
                                tr.appendChild(td);
                            });

                            // Add cells for the user's file data
                            data[0].forEach((header, colIndex) => {
                                const td = document.createElement('td');
                                let cellValue = row[colIndex];

                                // Check if the cell value is a date and format it if necessary
                                if (typeof cellValue === 'number' && isExcelDate(cellValue)) {
                                    cellValue = formatDate(cellValue);
                                }

                                td.innerText = cellValue !== undefined ? cellValue : '';  // Handle null or undefined values
                                tr.appendChild(td);
                            });

                            // Add modal control for image upload fields
                            const td = document.createElement('td');
                            const button = document.createElement('button');
                            button.type = 'button';
                            button.classList.add('btn', 'btn-secondary');
                            button.innerText = 'Upload Images';
                            button.setAttribute('data-row-index', rowIndex);
                            button.addEventListener('click', () => showImageUploadModal(rowIndex));
                            td.appendChild(button);
                            tr.appendChild(td);

                            previewTableBody.appendChild(tr);
                        });
                }
            })
            .catch(error => {
                console.error('Error fetching device data:', error);
                // Handle the error and show something in the row
                const errorValues = ['Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'Error'];
                errorValues.forEach(value => {
                    const td = document.createElement('td');
                    td.innerText = value;
                    tr.appendChild(td);
                });

                // Add cells for the user's file data
                data[0].forEach((header, colIndex) => {
                    const td = document.createElement('td');
                    let cellValue = row[colIndex];

                    // Check if the cell value is a date and format it if necessary
                    if (typeof cellValue === 'number' && isExcelDate(cellValue)) {
                        cellValue = formatDate(cellValue);
                    }

                    td.innerText = cellValue !== undefined ? cellValue : '';  // Handle null or undefined values
                    tr.appendChild(td);
                });

                // Add modal control for image upload fields
                const td = document.createElement('td');
                const button = document.createElement('button');
                button.type = 'button';
                button.classList.add('btn', 'btn-secondary');
                button.innerText = 'Upload Images';
                button.setAttribute('data-row-index', rowIndex);
                button.addEventListener('click', () => showImageUploadModal(rowIndex));
                td.appendChild(button);
                tr.appendChild(td);

                previewTableBody.appendChild(tr);
            });
    });
    document.getElementById('previewContainer').style.display = 'block';
}

function showImageUploadModal(rowIndex) {
    const imageUploadContainer = document.getElementById('imageUploadContainer');
    imageUploadContainer.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
        const div = document.createElement('div');
        div.classList.add('form-group');
        div.classList.add('mb-2');

        const label = document.createElement('label');
        label.innerText = `Image ${i}`;
        div.appendChild(label);

        const input = document.createElement('input');
        input.type = 'file';
        input.classList.add('form-control');
        input.name = `images_${rowIndex}_${i}`;
        div.appendChild(input);

        imageUploadContainer.appendChild(div);
    }

    const modal = document.getElementById('imageUploadModal');
    modal.style.display = 'block';
}

function hideImageUploadModal() {
    const modal = document.getElementById('imageUploadModal');
    modal.style.display = 'none';
}

document.getElementById('closeImageModal').addEventListener('click', hideImageUploadModal);

window.addEventListener('click', function (event) {
    const modal = document.getElementById('imageUploadModal');
    if (event.target == modal) {
        hideImageUploadModal();
    }
});

function generateMappingTable(data) {
    const headers = data[0];
    const formFields = [
        {label: 'SKU', value: 'sku'},
        {label: 'Reference Number', value: 'reference_number'},
        {label: 'Lot Number', value: 'lot_number'},
        {label: 'Production Date', value: 'production_date'},
        {label: 'Expiration Date', value: 'expiration_date'},
        {label: 'Quantity Available', value: 'quantity_available'},
        {label: 'Auction Type', value: 'auction_type'},
        {label: 'Starting Bid', value: 'starting_bid'},
        {label: 'Reserve Bid', value: 'reserve_bid'},
        {label: 'Sale Price', value: 'buyItNowPrice'},
        {label: 'Auction Duration', value: 'auction_duration'},
        {label: 'Not Applicable', value: 'na'}
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
        formFields.forEach(field => {
            const option = document.createElement('option');
            option.value = field.value;
            option.innerText = field.label;
            if (field.label.toLowerCase() === header.toLowerCase()) option.selected = true;
            select.appendChild(option);
        });
        formFieldCell.appendChild(select);
        row.appendChild(formFieldCell);

        mappingTable.appendChild(row);
    });

    document.getElementById('mappingContainer').style.display = 'block';
    document.getElementById('mappingModal').style.display = 'block';
}

function isExcelDate(value) {
    return value > 25569;
}

function formatDate(excelDate) {
    const date = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

// Listen for file selection
document.getElementById('fileInput').addEventListener('change', handleFileSelect);

// Submit The Form
document.getElementById('importForm').addEventListener('submit', function (event) {
    event.preventDefault();

    let formData = new FormData(this);
    let auction_data = [];

    // Collect auction data from the preview table
    document.querySelectorAll('#previewTableBody tr').forEach((row, rowIndex) => {
        let rowData = {};
        row.querySelectorAll('td').forEach((cell, cellIndex) => {
            if (cellIndex < row.children.length - 1) { // Ignore the image modal control cell
                rowData[`column_${cellIndex}`] = cell.innerText;
            }
        });
        auction_data.push(rowData);
    });

    formData.append('auction_data', JSON.stringify(auction_data));

    // Append image files from each row
    document.querySelectorAll('.image-input').forEach(input => {
        if (input.files[0]) {
            formData.append(input.name, input.files[0]);
        }
    });

    fetch('/import_excel/', {
        method: 'POST',
        body: formData,
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('Success:', data);
                // Optionally redirect to another page or show a success message
                alert('Import successful!');
            } else {
                console.error('Import failed:', data);
                alert('Import failed. Please try again.');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        });
});


function fetchDeviceData(code) {
    return fetch(`https://accessgudid.nlm.nih.gov/api/v3/devices/lookup.json?udi=${code}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
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

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
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
                        // console.log(result);
                        classificationData.category = result.category.category_name;
                        classificationData.category_id = result.category.value;
                        classificationData.description = description;
                        return classificationData;
                    });
            } else {
                throw new Error('No classification data found');
            }
        })
        .catch(error => {
            console.error('Error fetching classification data:', error);
            return null;
        });
}
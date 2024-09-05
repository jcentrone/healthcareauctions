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

            const step1 = document.getElementById('step1');
            const step1Icon = document.getElementById('step1-icon');
            step1.style.backgroundColor = '#d4edda';

            step1Icon.classList.remove('fa-file-excel');
            step1Icon.classList.add('fa-check-circle');

            step1.querySelector('h5').innerText = 'Step 1: Excel File Added';
            step1.querySelector('p').innerText = 'File added. Select another to start over.';


            document.getElementById('import-mapping').style.display = 'none';
            document.getElementById('import-button').style.display = 'block';

            // document.getElementById('mapColumnsBtn').disabled = false;


        };
        reader.readAsArrayBuffer(file);
    }
}

const importModal = new bootstrap.Modal(document.getElementById('importModal'));


document.getElementById('mapColumnsBtn').addEventListener('click', function (event) {
    document.getElementById('mappingModal').style.display = 'block';
    document.getElementById('import-mapping').style.display = 'none';
    document.getElementById('importModalLabel').innerText = 'Step 2: Map Your Data';
    // importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
    importModal.show();
    document.getElementById('addImgBtn').disabled = false;
})


function closeImportModal(validateImg = true) {

    const messageContainer = document.getElementById('modalMessages');
    const message = document.getElementById('modalMessage');

    if (validateImg) {
        const allImagesValid = validateImages();

        if (!allImagesValid) {
            return; // Do not close the modal if validation fails
        }

        const importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
        importModal.hide();

        const step3 = document.getElementById('step3');
        const step3Icon = document.getElementById('step3-icon');
        step3.style.backgroundColor = '#d4edda';

        step3Icon.classList.remove('fa-image');
        step3Icon.classList.add('fa-check-circle');

        step3.querySelector('h5').innerText = 'Step 3: Images Added';
        step3.querySelector('p').innerText = 'Each listings has at least 1 Image.';
        step3.querySelector('button').innerText = 'Edit Images';
    } else {
        const importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
        importModal.hide();

        // Indicate that Step 2 is complete
        const step2 = document.getElementById('step2');
        const step2Icon = document.getElementById('step2-icon');

        step2.style.backgroundColor = '#d4edda'; // Greenish background to indicate success
        step2Icon.classList.remove('fa-arrows-alt');
        step2Icon.classList.add('fa-check-circle');

        step2.querySelector('h5').innerText = 'Step 2: Columns Mapped';
        step2.querySelector('p').innerText = 'All columns auto-mapped, nothing to do here.';
        step2.querySelector('button').innerText = 'Edit Mapping';
    }
}

function validateImages() {
    const previewTableBody = document.getElementById('previewTableBody');
    const rows = previewTableBody.querySelectorAll('tr');
    let allRowsValid = true;

    rows.forEach(row => {
        const imageInputs = row.querySelectorAll('input[type="file"]');
        let hasImage = false;

        imageInputs.forEach(input => {
            if (input.files.length > 0) {
                hasImage = true;
            }
        });

        if (!hasImage) {
            allRowsValid = false;
            row.classList.add('table-danger'); // Highlight the row if no images are selected
        } else {
            row.classList.remove('table-danger'); // Remove highlight if images are selected
        }


        const messageContainer = document.getElementById('modalMessages');
        const message = document.getElementById('modalMessage');


        if (!allRowsValid) {
            messageContainer.classList.remove('alert-success'); // Remove any other alert type classes
            messageContainer.classList.add('alert-danger', 'show'); // Add danger and show classes
            message.innerText = 'Please ensure each row has at least one image selected.';
            messageContainer.style.display = 'block'; // Ensure the alert is visible
        } else {
            // Hide the message container if validation passes
            messageContainer.classList.remove('alert-danger', 'show');
            message.innerText = '';
            messageContainer.style.display = 'none';
        }
    });

    return allRowsValid;
}


// Example usage: Close the modal when the "Okay" button is clicked.
document.getElementById('closeMappingModal').addEventListener('click', function () {
    let validateImg = false;
    closeImportModal(validateImg);

});
document.getElementById('closeAddImgBtn').addEventListener('click', function () {
    let validateImg = true;
    closeImportModal(validateImg);

});

document.getElementById('addImgBtn').addEventListener('click', function (event) {
    document.getElementById('import-mapping').style.display = 'block';
    document.getElementById('mappingModal').style.display = 'none';
    document.getElementById('import-button').disabled = false;
    document.getElementById('importModalLabel').innerText = 'Step 3: Add Images';
    let importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
    importModal.show();

})

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

                                for (let i = 1; i <= 5; i++) {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.classList.add('form-control');
                                    input.classList.add('mb-1');
                                    input.name = `images_${rowIndex}_${i}`;

                                    // Optionally, add the input element to a parent container
                                    td.appendChild(input);
                                    tr.appendChild(td);

                                    // If we want to check in real time
                                    // input.addEventListener('input', function () {
                                    //     validateImages();
                                    // })
                                }

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

                            for (let i = 1; i <= 5; i++) {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.classList.add('form-control');
                                input.classList.add('mb-1');
                                input.name = `images_${rowIndex}_${i}`;

                                // Optionally, add the input element to a parent container
                                td.appendChild(input);
                                tr.appendChild(td);
                            }
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

                /// Add modal control for image upload fields
                const td = document.createElement('td');

                for (let i = 1; i <= 5; i++) {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.classList.add('form-control');
                    input.classList.add('mb-1');
                    input.name = `images_${rowIndex}_${i}`;

                    // Optionally, add the input element to a parent container
                    td.appendChild(input);
                    tr.appendChild(td);
                }

                previewTableBody.appendChild(tr);
            });
    });
    document.getElementById('previewContainer').style.display = 'block';
}


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
        {label: 'Not Mapped', value: 'nm'},
        {label: 'Not Applicable', value: 'na'},
    ];

    const mappingTable = document.getElementById('mappingTable');
    mappingTable.innerHTML = '';

    let allFieldsMapped = true;  // Initialize flag

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

        select.addEventListener('change', function () {
            select.setAttribute('data-mapped', select.value !== 'na' ? 'true' : 'false');
            checkAllFieldsMapped();
        });

        let isMapped = false;  // Flag for each header

        formFields.forEach(field => {
            const option = document.createElement('option');
            option.value = field.value;
            option.innerText = field.label;

            // Automatically map if the header matches a form field
            if (field.label.toLowerCase() === header.toLowerCase()) {
                option.selected = true;
                isMapped = true;
                select.setAttribute('data-mapped', 'true');  // Mark as mapped
            }

            select.appendChild(option);
        });

        if (!isMapped) {
            select.value = 'nm';
            select.setAttribute('data-mapped', 'false');  // Mark as not mapped
        }

        formFieldCell.appendChild(select);
        row.appendChild(formFieldCell);

        // Add event listener to track changes
        select.addEventListener('change', () => {
            checkAllFieldsMapped();
        });

        mappingTable.appendChild(row);
    });

    document.getElementById('mappingContainer').style.display = 'block';
    document.getElementById('mappingModal').style.display = 'block';

    // Initial check on page load
    checkAllFieldsMapped();

    function checkAllFieldsMapped() {
        allFieldsMapped = true;

        // Iterate over all selects to verify that each has been explicitly mapped
        mappingTable.querySelectorAll('select').forEach(select => {
            if (select.value === 'nm' || select.getAttribute('data-mapped') === 'false') {
                allFieldsMapped = false;
                select.classList.add('is-invalid');  // Add Bootstrap error class
            } else {
                select.classList.remove('is-invalid');  // Remove the error class if mapped correctly
            }
        });

        // React based on the allFieldsMapped flag
        if (allFieldsMapped) {
            document.getElementById('addImgBtn').disabled = false; // Enable import button
            console.log('All fields are correctly mapped.');

            // Indicate that Step 2 is complete
            const step2 = document.getElementById('step2');
            const step2Icon = document.getElementById('step2-icon');

            step2.style.backgroundColor = '#d4edda'; // Greenish background to indicate success
            step2Icon.classList.remove('fa-arrows-alt');
            step2Icon.classList.add('fa-check-circle');

            step2.querySelector('h5').innerText = 'Step 2: Columns Mapped';
            step2.querySelector('p').innerText = 'All columns auto-mapped, nothing to do here.';
            document.getElementById('mapColumnsBtn').disabled = false; // Disable the button
        } else {
            document.getElementById('addImgBtn').disabled = true; // Disable import button
            console.log('Please complete the mapping of all fields.');

            // Reset Step 2 to its default state
            const step2 = document.getElementById('step2');
            step2.style.backgroundColor = ''; // Reset background color
            step2.querySelector('h5').innerText = 'Step 2: Map Your Columns';
            step2.querySelector('p').innerText = 'Match your Excel columns to the auction fields.';
            document.getElementById('mapColumnsBtn').disabled = false; // Enable the button
        }
    }
}

function isExcelDate(value) {
    return value > 25569;
}

function formatDate(excelDate) {
    const date = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

// Listen for file selection
document.getElementById('fileInput').addEventListener('change', handleFileSelect);

// Import Records
document.getElementById('import-button').addEventListener('click', function (event) {
    event.preventDefault(); // Prevent the default form submission

    // Get the form element
    const form = document.getElementById('importForm');
    let formData = new FormData(form); // Pass the form element to FormData
    let auction_data = [];

    // Function to convert empty strings to null
    function toNullIfEmpty(value) {
        return value === "" ? null : value;
    }

    // Function to convert "Yes"/"No" to true/false
    function toBoolean(value) {
        if (value.toLowerCase() === "yes") return true;
        if (value.toLowerCase() === "no") return false;
        return null; // Handle cases where the value is neither "Yes" nor "No"
    }

    // Collect auction data from the preview table
    document.querySelectorAll('#previewTableBody tr').forEach((row, rowIndex) => {
        let rowData = {
            title: row.querySelector('td:nth-child(1)').innerText.trim(),                // Auction Title
            description: row.querySelector('td:nth-child(2)').innerText.trim(),          // Description
            category_id: row.querySelector('td:nth-child(4)').innerText.trim(),          // Category ID
            manufacturer: row.querySelector('td:nth-child(5)').innerText.trim(),         // Manufacturer
            package_type: row.querySelector('td:nth-child(6)').innerText.trim(),         // Package Type
            deviceSterile: toBoolean(row.querySelector('td:nth-child(7)').innerText.trim()),        // Sterile
            implantable: toBoolean(row.querySelector('td:nth-child(8)').innerText.trim()),          // Implantable
            sku: row.querySelector('td:nth-child(9)').innerText.trim(),                  // SKU
            reference_number: row.querySelector('td:nth-child(10)').innerText.trim(),    // Reference Number
            lot_number: row.querySelector('td:nth-child(11)').innerText.trim(),          // Lot Number
            production_date: row.querySelector('td:nth-child(12)').innerText.trim(),     // Production Date
            expiration_date: row.querySelector('td:nth-child(13)').innerText.trim(),     // Expiration Date
            quantity_available: toNullIfEmpty(row.querySelector('td:nth-child(14)').innerText.trim()),  // Quantity Available
            auction_type: row.querySelector('td:nth-child(15)').innerText.trim(),        // Auction Type
            starting_bid: toNullIfEmpty(row.querySelector('td:nth-child(16)').innerText.trim()),        // Starting Bid
            reserve_bid: toNullIfEmpty(row.querySelector('td:nth-child(17)').innerText.trim()),         // Reserve Bid
            buyItNowPrice: toNullIfEmpty(row.querySelector('td:nth-child(18)').innerText.trim()),       // Sale Price (Buy It Now)
            auction_duration: row.querySelector('td:nth-child(19)').innerText.trim(),    // Auction Duration
        };

        // Log each row's data for debugging
        console.log('Row Data:', rowData);
        auction_data.push(rowData);
    });

    formData.append('auction_data', JSON.stringify(auction_data));

    document.querySelectorAll('.image-input').forEach(input => {
        if (input.files[0]) {
            formData.append(input.name, input.files[0]);
        }
    });

    // Update the UI to indicate processing
    const step4Icon = document.getElementById('step4-icon');
    const step4Title = document.getElementById('step4-title');
    const step4Description = document.getElementById('step4-description');

    step4Icon.classList.remove('fa-check');
    step4Icon.classList.add('fa-spinner', 'fa-spin');
    step4Title.innerText = 'Step 4: Working!';
    step4Description.innerText = 'Your auctions are being imported...';

    // Send the form data via fetch
    fetch('/import_excel/', {
        method: 'POST',
        body: formData,
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                step4Icon.classList.remove('fa-spinner', 'fa-spin');
                step4Icon.classList.add('fa-check');
                step4Title.innerText = 'Step 4: Success!';
                step4Description.innerText = 'Your auctions have been imported!';
                document.getElementById('step4').style.backgroundColor = '#d4edda'; // Change background color to greenish
                this.style.display = 'none';
                document.getElementById('dashboard-btn').style.display = '';
            } else {
                step4Icon.classList.remove('fa-spinner', 'fa-spin');
                step4Icon.classList.add('fa-exclamation-triangle');
                step4Title.innerText = 'Step 4: Error';
                step4Description.innerText = `An error occurred: ${data.message}`;
                document.getElementById('step4').style.backgroundColor = '#f8d7da'; // Change background color to reddish
            }
        })
        .catch((error) => {
            step4Icon.classList.remove('fa-spinner', 'fa-spin');
            step4Icon.classList.add('fa-exclamation-triangle');
            step4Title.innerText = 'Step 4: Error';
            step4Description.innerText = `An error occurred: ${error.message}`;
            document.getElementById('step4').style.backgroundColor = '#f8d7da'; // Change background color to reddish
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


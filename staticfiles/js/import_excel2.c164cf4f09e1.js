const deviceDataCache = {};
const auctionTypeOptions = [
    "Auction",
    "Sale",
]
const packageTypeOptions = {
    'BAG': 'Bag',
    'BOT': 'Bottle',
    'BOX': 'Box',
    'CAR': 'Cartridge',
    'CA': 'Case',
    'CTN': 'Carton',
    'DRM': 'Drum',
    'JAR': 'Jar',
    'PKG': 'Package',
    'PKT': 'Packet',
    'ROL': 'Roll',
    'SAK': 'Sack',
    'SET': 'Set',
    'TRY': 'Tray',
    'TUB': 'Tub',
    'VIAL': 'Vial',
    'OTHER': 'Other',
};
const medicalSpecialtyOptions = {
    'AN': 'Anesthesiology',
    'CV': 'Cardiovascular',
    'CH': 'Clinical Chemistry',
    'DE': 'Dental',
    'EN': 'Ear, Nose, Throat',
    'GU': 'Gastroenterology, Urology',
    'HO': 'General Hospital',
    'HE': 'Hematology',
    'IM': 'Immunology',
    'MG': 'Medical Genetics',
    'MI': 'Microbiology',
    'NE': 'Neurology',
    'OB': 'Obstetrics/Gynecology',
    'OP': 'Ophthalmic',
    'OR': 'Orthopedic',
    'PA': 'Pathology',
    'PM': 'Physical Medicine',
    'RA': 'Radiology',
    'SU': 'General, Plastic Surgery',
    'TX': 'Clinical Toxicology',
};
const requiredHeaders = [
    // 'SKU',
    // 'Reference Number',
    'Lot Number',
    'Production Date',
    'Expiration Date',
    'Quantity Available',
    'Listing Type',
    'Starting Bid',
    'Reserve Bid',
    'Sale Price',
    'Auction Duration'
];
const columns = [
    {
        title: "#",
        formatter: "rownum",
        hozAlign: "center",
        headerSort: false,
        width: 50
    },
    {
        title: "Images",
        field: "images",
        formatter: function (cell, formatterParams, onRendered) {
            const rowData = cell.getRow().getData();
            // console.log('Formatter rowData.images:', rowData.images); // For debugging
            const images = rowData.images || [];
            const imagesCount = images.filter(image => image !== undefined && image !== null).length;
            if (imagesCount > 0) {
                return `<button class="btn btn-sm btn-success"><i class="fa-regular fa-image me-2"></i>Edit</button>`;
            } else {
                return '<button class="btn btn-sm btn-primary"><i class="fa-regular fa-image me-2"></i>Add</button>';
            }
        },
        visible: true,
        cellClick: function (e, cell) {
            const rowData = cell.getRow().getData();
            openImageUploadModal(cell.getRow(), rowData);
        }
    },
    {
        title: "SKU",
        field: "SKU",
        editor: reprocessEditor,
        formatter: validateCell,
    },
    {
        title: "Reference Number",
        field: "listing_title",
        editor: reprocessEditor,
        formatter: validateCell,
    },
    {
        title: "Lot Number",
        field: "Lot Number",
        editor: "input",
    },
    {
        title: "Production Date",
        field: "Production Date",
        sorter: "date",
        editor: dateEditor,
        formatter: dateFormatter,
    },
    {
        title: "Expiration Date",
        field: "Expiration Date",
        sorter: "date",
        editor: dateEditor,
        formatter: dateFormatter,
    },
    {
        title: "Quantity Available",
        field: "Quantity Available",
        editor: "input",
        formatter: validateCell,
    },
    {
        title: "Listing Type",
        field: "Listing Type",
        editor: "list",
        editorParams: {
            values: ["Auction", "Sale"],
        },
        formatter: validateCell,
    },
    {
        title: "Starting Bid",
        field: "Starting Bid",
        editor: currencyEditor,
        formatter: currencyFormatterWithConditional,
        formatterParams: {precision: 2},
    },
    {
        title: "Reserve Bid",
        field: "Reserve Bid",
        editor: currencyEditor,
        formatter: currencyFormatterWithConditional,
        formatterParams: {precision: 2},
    },
    {
        title: "Sale Price",
        field: "Sale Price",
        editor: currencyEditor,
        formatter: currencyFormatterWithConditional,
        formatterParams: {precision: 2},
    },
    {
        title: "Auction Duration",
        field: "Auction Duration",
        editor: "list",
        editorParams: {
            values: ["1", "3", "5", "7", "10"],
        },
        formatter: auctionDurationFormatter,
    },
    {
        title: "Package Type",
        field: "packageType",
        editor: "list",
        editorParams: {
            values: packageTypeOptions,
        },
        visible: false,
    },
    {
        title: "Device Name",
        field: "deviceName",
        editor: "input",
        formatter: validateCell,
        visible: true,
    },
    {
        title: "Manufacturer",
        field: "manufacturer",
        editor: "input",
        formatter: validateCell,
        visible: true,
    },
    {
        title: "Description",
        field: "description",
        editor: "textarea",
        width: 200,
        formatter: validateCell,
        visible: true,
    },
    {
        title: "Medical Specialty Description",
        field: "medicalSpecialtyDescription",
        editor: "list",
        editorParams: {
            values: Object.values(medicalSpecialtyOptions),
        },
        formatter: validateCell,
        visible: true, // Hide the column but keep the data
    },
    {
        title: "Medical Specialty Code",
        field: "medicalSpecialtyCode",
        editor: "list",
        editorParams: {
            values: medicalSpecialtyOptions,
        },
        formatter: validateCell,
        visible: true, // Hide the column but keep the data
    },
    {
        title: "Category",
        field: "category",
        editor: false,
        formatter: validateCell,
        visible: true, // Hide the column but keep the data
    },
    {
        title: "Category ID",
        field: "categoryId",
        editor: false,
        formatter: validateCell,
        visible: true, // Hide the column but keep the data
    },
    {
        title: "Device Sterile",
        field: "deviceSterile",
        editor: "tickCross",
        formatter: "tickCross",
        visible: false, // Hide the column but keep the data
    },
    {
        title: "Implantable",
        field: "implantable",
        editor: "tickCross",
        formatter: "tickCross",
        visible: false, // Hide the column but keep the data
    },
    {
        title: "Error",
        field: "error",
        editor: false,
        visible: false, // Hide the column but keep the data
    },
    {
        title: "fatalError",
        field: "fatalError",
        editor: "tickCross",
        formatter: "tickCross",
        visible: false,
    },

];

let goodRecords = [];
let badRecords = [];

// Helper Functions
function parseExcelDate(value) {
    if (typeof value === 'number') {
        const date = excelDateToJSDate(value);
        // Format the date as yyyy-mm-dd
        return date.toISOString().split('T')[0];
    } else if (typeof value === 'string') {
        // Assume it's already a valid date string
        return value;
    } else {
        return null;
    }
}

function excelDateToJSDate(serial) {
    const utc_days = serial - 25569;
    const utc_value = utc_days * 86400; // Convert to seconds
    const date_info = new Date(utc_value * 1000);

    // Adjust for time zone offset
    date_info.setTime(date_info.getTime() + (date_info.getTimezoneOffset() * 60000));

    return date_info;
}

// Custom date editor using input type="date"
function dateEditor(cell, onRendered, success, cancel) {
    // Create and style input
    const input = document.createElement("input");
    input.setAttribute("type", "date");
    input.style.width = "100%";
    input.style.boxSizing = "border-box";

    // Set initial value
    input.value = cell.getValue();

    onRendered(function () {
        input.focus();
        input.style.height = "100%";
    });

    // Handle value change
    input.addEventListener("change", function () {
        success(input.value);
    });

    input.addEventListener("blur", function () {
        success(input.value);
    });

    // Cancel on ESC key
    input.addEventListener("keydown", function (e) {
        if (e.keyCode === 27) {
            cancel();
        }
    });

    return input;
}

function dateFormatter(cell, formatterParams, onRendered) {
    const value = cell.getValue();
    if (value) {
        // Assuming the value is in yyyy-mm-dd format
        return value;
    } else {
        return "";
    }
}

function reprocessEditor(cell, onRendered, success, cancel) {
    const cellValue = cell.getValue();
    const input = document.createElement("input");

    input.type = "text";
    input.value = cellValue;

    onRendered(() => {
        input.focus();
        input.select();
    });

    input.addEventListener("blur", async () => {
        const newValue = input.value;

        // Update cell with new value
        cell.setValue(newValue);

        // Reprocess the row using the shared function
        const row = cell.getRow().getData();
        const {record, isValid} = await processSingleRecord(row);

        if (isValid) {
            cell.getRow().update(record); // Update row with new values
        } else {
            console.error(`Error processing record: ${record.error}`);
            // Optionally update the row to reflect an error state
        }

        success(newValue);
    });

    return input;
}

function currencyEditor(cell, onRendered, success, cancel) {
    // Create an input element
    const input = document.createElement("input");
    input.type = "number";
    input.value = cell.getValue() || 0;

    // Style the input for better user experience
    input.style.width = "100%";
    input.style.padding = "5px";
    input.style.boxSizing = "border-box";

    // Focus on the input when it’s rendered
    onRendered(() => {
        input.focus();
        input.select();
    });

    // Handle saving the value when editing ends
    function handleSave() {
        success(parseFloat(input.value) || 0); // Save as float or 0 if empty
    }

    input.addEventListener("blur", handleSave);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            cancel();
        }
    });

    return input;
}

function currencyFormatterWithConditional(cell) {
    const value = cell.getValue();
    const rowData = cell.getRow().getData();
    const listingType = rowData['Listing Type']?.trim().toLowerCase();
    let shouldHighlight = false;

    // Conditional Formatting Logic
    if (cell.getField() === 'Starting Bid' || cell.getField() === 'Auction Duration') {
        if (listingType === 'auction') {
            if (!value || value === 'Unknown' || value === 'N/A') {
                shouldHighlight = true;
            }
        }
    } else if (cell.getField() === 'Sale Price') {
        if (listingType === 'sale') {
            if (!value || value === 'Unknown' || value === 'N/A') {
                shouldHighlight = true;
            }
        }
    }

    // Apply Conditional Highlighting Styles
    const cellElement = cell.getElement();
    if (shouldHighlight) {
        cellElement.style.backgroundColor = '#f8d7da'; // Light red background
        cellElement.style.color = '#721c24'; // Dark red text
    } else {
        cellElement.style.backgroundColor = ''; // Reset to default
        cellElement.style.color = ''; // Reset to default
    }

    // Currency Formatting Logic
    if (value != null) {
        return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(value);
    }
    return value;
}

function auctionDurationFormatter(cell) {
    const value = cell.getValue();
    const rowData = cell.getRow().getData();
    const listingType = rowData['Listing Type']?.trim().toLowerCase();
    let shouldHighlight = false;

    // Conditional Formatting Logic for Auction Duration
    if (listingType === 'auction') {
        // Highlight if value is not in allowed set
        if (![1, 3, 5, 7, 10].includes(parseInt(value, 10))) {
            shouldHighlight = true;
        }
    }

    // Apply or Reset Conditional Highlighting Styles
    const cellElement = cell.getElement();
    if (shouldHighlight) {
        cellElement.style.backgroundColor = '#f8d7da'; // Light red background
        cellElement.style.color = '#721c24'; // Dark red text
    } else {
        // Explicitly reset styles to default
        cellElement.style.backgroundColor = '';
        cellElement.style.color = '';
    }

    return value; // Return the original value to display it properly
}

function cleanCode(code) {
    return code.replace(/\s+/g, '').trim();
}

function isGTIN(code) {
    const gtin14Regex = /^\d{14}$/;
    return gtin14Regex.test(code);
}

function isUDI(code) {
    // GS1 AI format
    const gs1AICodeRegex = /^\(01\)\d{14}/;
    // HIBCC format
    const hibccCodeRegex = /^\+.+/;
    // ICCBBA format
    const iccbbaCodeRegex = /^=.*/;

    return gs1AICodeRegex.test(code) || hibccCodeRegex.test(code) || iccbbaCodeRegex.test(code);
}

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}

function transformOpenFdaData(result) {
    // Transform the OpenFDA data to match the format expected by the rest of the code
    return {
        gudid: {
            device: {
                brandName: result.brand_name,
                catalogNumber: result.catalog_number,
                companyName: result.company_name,
                versionModelNumber: result.version_or_model_number,
                deviceDescription: result.device_description,
                sterilization: result.sterilization,
                identifiers: {
                    identifier: result.identifiers
                },
                productCodes: {
                    fdaProductCode: result.product_codes.map(pc => ({
                        productCode: pc.code,
                        productCodeName: pc.name,
                        // Include openFDA data if needed
                        productCodeOpenfda: pc.openfda
                    }))
                },
                gmdnTerms: {
                    gmdn: result.gmdn_terms
                },
                // Include any other fields required by your code
            },
            // Include other properties if needed
        }
    };
}

function validateCell(cell) {
    const value = cell.getValue();
    if (value === null || value === undefined || value === '' || value === 'Unknown' || value === 'N/A') {
        // Apply styles to highlight the cell
        cell.getElement().style.backgroundColor = '#f8d7da';
        cell.getElement().style.color = '#721c24';
    } else {
        // Reset styles if value is valid
        cell.getElement().style.backgroundColor = '';
        cell.getElement().style.color = '';
    }
    return value;
}

function openImageUploadModal(row, rowData) {
    // Create a container for the modal content
    const modalContent = document.createElement('div');

    // Create a container for image slots
    const slotsContainer = document.createElement('div');
    slotsContainer.style.display = 'flex';
    slotsContainer.style.flexWrap = 'wrap';
    slotsContainer.style.justifyContent = 'center';
    slotsContainer.style.marginTop = '10px';

    // Initialize images array in rowData if not present
    if (!rowData.images) {
        rowData.images = [];
    }

    // Function to create an image slot
    function createImageSlot(index) {
        const slot = document.createElement('div');
        slot.style.width = '100px';
        slot.style.height = '100px';
        slot.style.border = '2px dashed #ccc';
        slot.style.borderRadius = '8px';
        slot.style.display = 'flex';
        slot.style.alignItems = 'center';
        slot.style.justifyContent = 'center';
        slot.style.marginBottom = '10px';
        slot.style.position = 'relative';
        slot.style.cursor = 'pointer';
        slot.style.marginRight = '10px';
        slot.style.background = '#F5F5F5'

        // Drag-and-Drop Styling
        slot.style.transition = 'background-color 0.2s ease';

        // Check if an image exists in this slot
        if (rowData.images[index]) {
            // Display the image
            const img = document.createElement('img');
            img.src = rowData.images[index].data;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            slot.appendChild(img);

            // Add remove icon
            const removeIcon = document.createElement('span');
            removeIcon.innerHTML = '&times;';
            removeIcon.style.position = 'absolute';
            removeIcon.style.top = '5px';
            removeIcon.style.right = '5px';
            removeIcon.style.color = '#fff';
            removeIcon.style.backgroundColor = 'rgba(0,0,0,0.5)';
            removeIcon.style.borderRadius = '50%';
            removeIcon.style.width = '20px';
            removeIcon.style.height = '20px';
            removeIcon.style.display = 'flex';
            removeIcon.style.alignItems = 'center';
            removeIcon.style.justifyContent = 'center';
            removeIcon.style.cursor = 'pointer';

            removeIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                // Remove image from rowData without shifting indices
                rowData.images[index] = undefined;
                console.log('Image removed. Updated images array:', rowData.images);
                // Re-render slots
                renderImageSlots();
                // Update the table
                row.update({images: rowData.images});
                // Re-render the cell to update the formatter
                row.getCell('images').render();
            });


            slot.appendChild(removeIcon);
        } else {
            // Display upload icon
            const uploadIcon = document.createElement('i');
            uploadIcon.className = 'fa-solid fa-cloud-arrow-up';
            uploadIcon.style.fontSize = '48px';
            uploadIcon.style.color = '#aaa';
            slot.appendChild(uploadIcon);
        }

        // Add click event to upload or replace image
        slot.addEventListener('click', () => {
            // Create a file input dynamically
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*'; // Accept images only

            fileInput.addEventListener('change', function () {
                const file = fileInput.files[0];
                if (file) {
                    handleFileUpload(file, index);
                }
            });

            // Trigger the file input click
            fileInput.click();
        });

        // Drag-and-Drop Event Handlers
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.style.backgroundColor = '#f0f0f0';
        });

        slot.addEventListener('dragleave', (e) => {
            e.preventDefault();
            slot.style.backgroundColor = '';
        });

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.style.backgroundColor = '';
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    handleFileUpload(file, index);
                } else {
                    Swal.fire({
                        title: 'Invalid File Type',
                        text: 'Please upload an image file.',
                        icon: 'error',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            }
        });

        return slot;
    }


    // Function to render the image slots
    function renderImageSlots() {
        slotsContainer.innerHTML = ''; // Clear previous slots

        for (let i = 0; i < 5; i++) {
            const slot = createImageSlot(i);
            slotsContainer.appendChild(slot);
        }
    }

    function handleFileUpload(file, index) {
        const reader = new FileReader();
        reader.onload = function (e) {
            // Store the image data in rowData at the correct index
            rowData.images[index] = {
                name: file.name,
                data: e.target.result
            };
            console.log('Updated images array:', rowData.images);
            // Re-render slots
            renderImageSlots();
            // Update the table
            row.update({images: rowData.images});
            // Re-render the cell to update the formatter
            row.getCell('images').render();
        };
        reader.readAsDataURL(file);
    }

    // Initial rendering of image slots
    renderImageSlots();

    // Append elements to the modal content
    modalContent.appendChild(slotsContainer);

    // Show the modal using SweetAlert2
    Swal.fire({
        title: 'Upload Images',
        html: modalContent,
        showCancelButton: true,
        confirmButtonText: 'Done',
        cancelButtonText: 'Cancel',
        width: '650px',
        customClass: {
            confirmButton: 'btn btn-primary me-2',
            cancelButton: 'btn btn-secondary ms-2',
        },
        buttonsStyling: false,
        preConfirm: () => {
            // Filter out undefined entries
            const imagesCount = rowData.images.filter(image => image !== undefined && image !== null).length;
            if (imagesCount > 5) {
                Swal.showValidationMessage('You can upload up to 5 images per listing.');
                return false;
            }
            return true;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Images are already updated in rowData; nothing else to do here
            Swal.fire({
                title: 'Images Updated',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
}

// Records Processing
document.getElementById('fileInput').addEventListener('change', handleFileSelect);

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, {type: 'binary'});
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Extract headers and data
            const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1, raw: true});
            const headers = jsonData[0];
            const dataRows = jsonData.slice(1);
            console.log('JSON Data', jsonData);

            // Create data objects
            const dataObjects = dataRows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            });

            const missingHeaders = await validateAndMapHeaders(headers);

            // Proceed to header validation and mapping
            if (missingHeaders) {
                await promptHeaderMapping(headers, dataObjects);
            } else {
                // Convert date fields
                jsonData.forEach(record => {
                    if (record['Production Date']) {
                        record['Production Date'] = parseExcelDate(record['Production Date']);
                    }
                    if (record['Expiration Date']) {
                        record['Expiration Date'] = parseExcelDate(record['Expiration Date']);
                    }
                });
                ({goodRecords, badRecords} = await processRecords(dataObjects));
                await processingComplete(goodRecords, badRecords);

            }
        };
        reader.readAsBinaryString(file);
    }
}

async function validateAndMapHeaders(extractedHeaders) {
    const missingHeaders = [];

    // Ensure at least one of 'SKU' or 'Reference Number' is present
    if (!extractedHeaders.includes('SKU') && !extractedHeaders.includes('Reference Number')) {
        missingHeaders.push("'SKU' or 'Reference Number'");
    }

    // Check for other missing required headers
    const otherMissingHeaders = requiredHeaders.filter(header => !extractedHeaders.includes(header));
    missingHeaders.push(...otherMissingHeaders);

    if (missingHeaders.length === 0) {
        // All required headers are present
        return null;
    } else {
        console.log('Missing Headers:', missingHeaders);
        // Headers don't match, prompt user to map headers
        return missingHeaders;
    }
}

async function promptHeaderMapping(extractedHeaders, dataObjects) {
    return new Promise((resolve, reject) => {
        // Prepare mapping data
        const mappingData = requiredHeaders.map(requiredHeader => {
            return {
                requiredHeader,
                userHeader: extractedHeaders.includes(requiredHeader) ? requiredHeader : null
            };
        });

        // Create the mapping table
        const mappingDiv = document.createElement('div');
        mappingDiv.id = 'header-mapping-table';

        const columns = [
            {title: "Required Field", field: "requiredHeader", editor: false},
            {
                title: "Your File's Header",
                field: "userHeader",
                editor: "list",
                editorParams: {
                    values: extractedHeaders
                },
                formatter: function (cell, formatterParams, onRendered) {
                    const value = cell.getValue();
                    if (!value) {
                        cell.getElement().style.backgroundColor = "#f8d7da"; // Light red background
                        cell.getElement().style.color = "#721c24"; // Dark red text
                    } else {
                        cell.getElement().style.backgroundColor = "";
                        cell.getElement().style.color = "";
                    }
                    return value;
                }
            }
        ];

        const table = new Tabulator(mappingDiv, {
            data: mappingData,
            columns: columns,
            layout: "fitColumns",
        });

        // Add cellEdited event listener
        table.on("cellEdited", function (cell) {
            const value = cell.getValue();
            if (cell.getField() === "userHeader") {
                if (!value) {
                    cell.getElement().style.backgroundColor = "#f8d7da";
                    cell.getElement().style.color = "#721c24";
                } else {
                    cell.getElement().style.backgroundColor = "";
                    cell.getElement().style.color = "";
                }
            }
        });

        // Display the mapping interface in a modal
        Swal.fire({
            title: 'Map Your Headers',
            html: mappingDiv,
            showCancelButton: false,
            showConfirmButton: true,
            confirmButtonText: 'Confirm Mapping',
            customClass: {
                confirmButton: 'btn btn-primary' // We'll address styling in the next section
            },
            buttonsStyling: false, // Disable default SweetAlert2 styling for buttons
            preConfirm: async () => {
                const updatedMappingData = table.getData();
                const headerMapping = {};
                let mappingValid = true;
                const userHeadersUsed = new Set();

                updatedMappingData.forEach(mapping => {
                    if (!mapping.userHeader) {
                        mappingValid = false;
                    } else {
                        if (userHeadersUsed.has(mapping.userHeader)) {
                            mappingValid = false;
                        } else {
                            userHeadersUsed.add(mapping.userHeader);
                            headerMapping[mapping.userHeader] = mapping.requiredHeader;
                        }
                    }
                });

                if (!mappingValid) {
                    Swal.showValidationMessage('Please ensure all required headers are mapped and there are no duplicate mappings.');
                    return false;
                }

                // Apply mapping to dataObjects
                const mappedDataObjects = dataObjects.map(record => {
                    const newRecord = {};
                    Object.keys(record).forEach(userHeader => {
                        const requiredHeader = headerMapping[userHeader];
                        if (requiredHeader) {
                            newRecord[requiredHeader] = record[userHeader];
                        }
                    });
                    return newRecord;
                });

                // Proceed to process records with mapped headers
                ({goodRecords, badRecords} = await processRecords(mappedDataObjects));

                await processingComplete(goodRecords, badRecords);
            }
        }).then((result) => {
            if (result.isConfirmed) {
                resolve();
            } else {
                reject();
            }
        });
    });
}

async function processRecords(records) {
    let goodRecords = [];
    let badRecords = [];
    const totalRecords = records.length;

    // Initialize the SweetAlert modal with enhanced styling
    Swal.fire({
        title: 'Getting Ready...',
        text: 'Gathering data and preparing for processing. Please hold on a moment!',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    for (let i = 0; i < totalRecords; i++) {
        const {record, isValid} = await processSingleRecord(records[i]);
        if (isValid) {
            goodRecords.push(record);
        } else {
            badRecords.push(record);
        }


        // Calculate progress percentage
        const progressPercent = Math.round(((i + 1) / totalRecords) * 100);

        // Update the SweetAlert modal with progress and counts
        Swal.update({
            title: 'Processing Listings',
            html: `
                <div style="width: 100%; background: #e9ecef; margin-bottom: 20px; border-radius: 10px;">
                    <div id="progress-bar" style="width: ${progressPercent}%; height: 15px; background: #0A54C1; border-radius: 10px;"></div>
                </div>
                <div style="font-size: 1.1em; margin-bottom: 20px;">
                    <p>Processing record <b>${i + 1}</b> of ${totalRecords}</p>
                    <div style="display: flex; gap: 20px; justify-content: center; font-size: 1.1em; margin-bottom: 20px;">
                        <div style="margin-right: 15px;">
                            Ready: <b style="color: #1d8348;">${goodRecords.length}</b>
                        </div>
                        <div>
                            Not Ready: <b style="color: #CD5C5C;">${badRecords.length}</b>
                        </div>
                    </div>
                </div>
                
            `
        });
    }

    // Close the SweetAlert modal when done
    Swal.close();

    return {goodRecords, badRecords};
}

async function processSingleRecord(record) {
    let mergedRecord = {
        ...record,
        fatalError: false,
    }; // Start with the original user data

    try {
        // Fetch deviceData
        const sku = record.SKU || record['SKU'];
        const refNumb = record['Reference Number'];
        if (!sku && !refNumb) {
            mergedRecord.fatalError = true;
            throw new Error('Either SKU or Reference Number must be provided');

        }
        // if (!sku && refNumb) {
        //     ('SKU is missing');
        // }

        const deviceData = await fetchDeviceData(sku, refNumb);

        console.log('Ref Numb', refNumb);
        console.log('Device Data', deviceData);

        if (!deviceData || !deviceData.gudid) {
            mergedRecord.fatalError = true;
            if (refNumb) {
                mergedRecord.listing_title = refNumb;
            }
            if (sku) {
                mergedRecord.SKU = sku;
            }

            throw new Error('Device not found via GTIN/SKU or Reference Number. Try changing either or both to resolve. We cannot import this listing until it error is resolved.');
        }

        // Extract deviceData fields
        const listing_title = refNumb || deviceData.gudid.device.catalogNumber || deviceData.gudid.device.versionModelNumber;
        const manufacturer = deviceData.gudid.device.companyName;
        const packageType = deviceData.gudid.device.identifiers?.identifier?.[0]?.pkgType || 'Unknown';
        const deviceSterile = deviceData.gudid.device.sterilization?.deviceSterile || false;
        const implantable = deviceData.gudid.device.gmdnTerms?.gmdn?.[0]?.implantable ;
        const gmdnTerms = deviceData.gudid.device.gmdnTerms?.gmdn?.[0]?.gmdnPTDefinition || '';

        // Merge deviceData into the record
        mergedRecord = {
            ...mergedRecord,
            listing_title,
            manufacturer,
            packageType,
            deviceSterile,
            implantable,
        };

        // Fetch classificationData
        const productCode = deviceData.gudid.device.productCodes?.fdaProductCode?.[0]?.productCode;
        if (!productCode) {
            throw new Error(`Product code not found for SKU: ${sku}`);
        }

        const classificationData = await fetchClassificationData(productCode);
        if (!classificationData) {
            throw new Error(`Classification data not found for product code: ${productCode}`);
        }

        // Extract classificationData fields
        const description = `${classificationData.description}\n\n${gmdnTerms}` || 'No description available';
        const category = classificationData.category || '';
        const categoryId = classificationData.category_id || '';
        const medicalSpecialtyCode = classificationData.medical_specialty_code || '';
        const deviceName = classificationData.device_name || '';
        const medicalSpecialtyDescription = classificationData.medical_specialty_description || '';

        if (!categoryId && !medicalSpecialtyCode) {
            mergedRecord.fatalError = true;
            throw new Error('Device not found via GTIN/SKU or Reference Number. Try changing either or both to resolve. We cannot import this listing until it error is resolved.');

        }

        // Merge classificationData into the record
        mergedRecord = {
            ...mergedRecord,
            description,
            category,
            categoryId,
            medicalSpecialtyCode,
            deviceName,
            medicalSpecialtyDescription,
        };

        console.log('Merged Record', mergedRecord);

        // Validation Logic
        const quantityAvailable = parseInt(mergedRecord['Quantity Available'], 10);
        if (!quantityAvailable || quantityAvailable <= 0) {
            throw new Error('Quantity Available must be greater than 0');
        }

        const listingType = mergedRecord['Listing Type']?.trim().toLowerCase();
        if (!listingType) {
            throw new Error('Listing Type is missing');
        }

        if (listingType === 'auction') {
            const startingBid = parseFloat(mergedRecord['Starting Bid']);
            if (!startingBid || startingBid <= 0) {
                throw new Error('Starting Bid must be greater than 0 for Auction listings');
            }

            const auctionDuration = parseInt(mergedRecord['Auction Duration'], 10);
            if (![1, 3, 5, 7, 10].includes(auctionDuration)) {
                throw new Error('Auction Duration must be one of 1, 3, 5, 7, or 10 for Auction listings');
            }
        } else if (listingType === 'sale') {
            const salePrice = parseFloat(mergedRecord['Sale Price']);
            if (!salePrice || salePrice <= 0) {
                throw new Error('Sale Price must be greater than 0 for Sale listings');
            }
        } else {
            throw new Error('Invalid Listing Type. Must be "Auction" or "Sale"');
        }


        return {record: mergedRecord, isValid: true};
    } catch (error) {
        mergedRecord.error = error.message;
        return {record: mergedRecord, isValid: false};
    }
}

async function processingComplete(goodRecords, badRecords) {

    // Create and save tables for global use
    window.goodRecordsTable = await createTabulatorTable(goodRecords, '#good-records-table');
    window.badRecordsTable = await createTabulatorTable(badRecords, '#bad-records-table');

    // console.log('Good Records', window.goodRecordsTable.getData());
    // console.log('Bad Records', window.badRecordsTable.getData());

    if (badRecords.length > 0) {
        Swal.fire({
            title: 'Processing Complete',
            text: `Processing complete. Found ${badRecords.length} record(s) that are not ready for import. Let's get them fixed.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Fix',
            cancelButtonText: 'Download and Fix Later',
            customClass: {
                confirmButton: 'btn btn-primary',
                cancelButton: 'btn btn-warning'
            },
        }).then((result) => {
            if (result.isConfirmed) {
                // Show the bad records in the main table
                displayBadRecords();
            } else {
                // Download xlsx
                window.badRecordsTable.download("xlsx", "error_records.xlsx");

                // Display good records
                displayGoodRecords();
            }
            document.getElementById('upload-sheet-container').style.display = 'none';
        });
    } else {
        Swal.fire({
            title: 'Processing Complete',
            text: 'All records processed successfully.',
            icon: 'success',
            customClass: {
                confirmButton: 'btn btn-primary',
            },
        });
        document.getElementById('upload-sheet-container').style.display = 'none';
        displayGoodRecords();
    }
}

//Display Records
function displayBadRecords() {
    const recordsContainer = document.getElementById('records-container');
    recordsContainer.style.display = 'block';
    const badRecordsContainer = document.getElementById('bad-records-container');
    badRecordsContainer.style.display = 'block';
    const goodRecordsContainer = document.getElementById('good-records-container');
    goodRecordsContainer.style.display = 'none';
}

function displayGoodRecords() {
    const recordsContainer = document.getElementById('records-container');
    recordsContainer.style.display = 'block';
    const goodRecordsContainer = document.getElementById('good-records-container');
    goodRecordsContainer.style.display = 'block';
    const badRecordsContainer = document.getElementById('bad-records-container');
    badRecordsContainer.style.display = 'none';
}

async function createTabulatorTable(records, selector) {
    let pxHeight;
    if (records.length > 9) {
        pxHeight = `${(11 * 48) + 90}px`;
    } else {
        pxHeight = `${((records.length + 1) * 48) + 90}px`;
    }

    let modifiedColumns;

    // Make a copy of the columns to modify for the bad records table
    if (selector === '#bad-records-table') {
        modifiedColumns = columns.map(col => {
            if (col.field === 'images') {
                // Hide the 'images' column in the bad records table
                return {...col, visible: false};
            }
            return col;
        });
    } else {
        modifiedColumns = columns;
    }
    console.log('Records', records);

    try {
        const table = new Tabulator(selector, {
            data: records,
            theme: "bootstrap5",
            layout: "fitData",
            columns: modifiedColumns,
            height: pxHeight,
            pagination: "local",
            paginationSize: 10,
            rowFormatter: function (row) {
                const rowData = row.getData();

                // Check if there's an error in the row data
                if (rowData.error) {
                    // Define the tooltip message
                    let tooltipMessage = rowData.error;

                    // Check if the error is fatal to customize the tooltip
                    const fatalError = rowData.fatalError;
                    if (fatalError) {
                        tooltipMessage = 'Device not found via GTIN/SKU or Reference Number. Try changing either or both to resolve. We cannot import this listing until the error is resolved.';

                        // Apply styling for fatal errors
                        const rowElement = row.getElement();
                        rowElement.style.backgroundColor = "#FFF3CD"; // Light yellow background

                        // Style specific cells
                        ['SKU', 'Reference Number'].forEach(field => {
                            const cell = row.getCell(field);
                            if (cell) {
                                cell.getElement().style.backgroundColor = "#f8d7da"; // Light red background
                                cell.getElement().style.color = "#721c24"; // Dark red text
                            }
                        });
                    } else {
                        // Non-fatal errors can have different styling if needed
                        const rowElement = row.getElement();
                        rowElement.style.backgroundColor = "";
                        ['SKU', 'Reference Number'].forEach(field => {
                            const cell = row.getCell(field);
                            if (cell) {
                                cell.getElement().style.backgroundColor = "";
                                cell.getElement().style.color = "";
                            }
                        });
                    }

                    // Add Bootstrap tooltip attributes
                    const rowElement = row.getElement();
                    rowElement.setAttribute('data-bs-toggle', 'tooltip');
                    rowElement.setAttribute('data-bs-placement', 'left');
                    rowElement.setAttribute('title', tooltipMessage);
                } else {
                    // Remove tooltip attributes if there's no error
                    const rowElement = row.getElement();
                    rowElement.removeAttribute('data-bs-toggle');
                    rowElement.removeAttribute('data-bs-placement');
                    rowElement.removeAttribute('title');

                    // Reset any styling
                    rowElement.style.backgroundColor = "";
                    ['SKU', 'Reference Number'].forEach(field => {
                        const cell = row.getCell(field);
                        if (cell) {
                            cell.getElement().style.backgroundColor = "";
                            cell.getElement().style.color = "";
                        }
                    });
                }
            }

        });

        // console.log('Table', table.getData());

        table.on("cellEdited", function (cell) {
            const row = cell.getRow();
            cellEditor(cell);
            initializeBootstrapTooltip(row);
        })

        // Event listener for when a row is added
        // table.on("rowAdded", function (row) {
        //     initializeBootstrapTooltip(row);
        // });

        // Event listener for when a row is updated
        table.on("rowUpdated", function (row) {
            initializeBootstrapTooltip(row);
        });

        // Initialize tooltips after the table has been fully rendered
        table.on("renderComplete", function () {
            // console.log("Render complete. Initializing tooltips...");
            table.getRows().forEach(row => {
                initializeBootstrapTooltip(row);
            });
        });

        // Function to initialize Bootstrap tooltip on a row if it has tooltip attributes
        function initializeBootstrapTooltip(row) {
            const rowElement = row.getElement();
            if (rowElement.hasAttribute('data-bs-toggle') && rowElement.getAttribute('data-bs-toggle') === 'tooltip') {
                // Initialize tooltip using Bootstrap's Tooltip constructor
                new bootstrap.Tooltip(rowElement);
            }
        }

        return table;

    } catch (error) {
        console.error('Error creating table:', error);
    }
    return null;
}

async function fetchDeviceData(rawCode, refNumb) {
    const code = rawCode;
    const referenceNumber = refNumb;

    // Check if data is cached
    // if (deviceDataCache[code]) {
    //     return deviceDataCache[code];
    // }

    let data = null;

    // Attempt to fetch via DI or UDI
    try {
        data = await fetchDeviceDataByCode(code);
        if (data) {
            deviceDataCache[code] = data; // Cache the result
            return data; // Return data if found
        }
    } catch (error) {
        console.error('Error fetching device data by code:', error);
    }

    // If DI/UDI fetch failed, attempt to fetch via catalog number
    if (referenceNumber) {
        try {
            data = await fetchDeviceDataByCatalogNumber(referenceNumber);
            if (data) {
                deviceDataCache[code] = data; // Cache the result
                return data; // Return data if found
            }
        } catch (error) {
            console.error('Error fetching device data via catalog number:', error);
        }

        // Attempt to fetch via version or model number if catalog number fails
        try {
            data = await fetchDeviceDataByVersionModelNumber(referenceNumber);
            if (data) {
                deviceDataCache[code] = data; // Cache the result
                return data; // Return data if found
            }
        } catch (error) {
            console.error('Error fetching device data via version or model number:', error);
        }
    }

    // If all fetch attempts fail, return null
    return null;
}

async function fetchDeviceDataByCode(code) {
    let url;

    if (isGTIN(code)) {
        // It's a DI
        url = `https://accessgudid.nlm.nih.gov/api/v3/devices/lookup.json?di=${code}`;
    } else if (isUDI(code)) {
        // It's a UDI
        url = `https://accessgudid.nlm.nih.gov/api/v3/devices/lookup.json?udi=${encodeURIComponent(code)}`;
    } else {
        return null; // Not a valid DI or UDI
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Device not found via DI or UDI');
    }
    const data = await response.json();
    console.log("Device data from AccessGUDID:", data);
    return data;
}

async function fetchDeviceDataByCatalogNumber(referenceNumber) {
    const openFdaUrl = `https://api.fda.gov/device/udi.json?search=catalog_number.exact:${encodeURIComponent(referenceNumber)}&limit=1`;
    try {
        const response = await fetch(openFdaUrl);
        if (!response.ok) {
            console.warn('Device not found via catalog number:', referenceNumber);
            return null; // Return null if the response is not OK
        }
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            return transformOpenFdaData(data.results[0]);
        } else {
            console.warn('No results found in OpenFDA data for catalog number:', referenceNumber);
            return null; // Return null if no results are found
        }
    } catch (error) {
        console.error('Error fetching device data by catalog number:', error);
        return null; // Return null on error
    }
}

async function fetchDeviceDataByVersionModelNumber(referenceNumber) {
    const openFdaUrl = `https://api.fda.gov/device/udi.json?search=version_or_model_number.exact:${encodeURIComponent(referenceNumber)}&limit=1`;
    console.log('Fetching device data via version or model number:', openFdaUrl);

    try {
        const response = await fetch(openFdaUrl);
        if (!response.ok) {
            console.warn('Device not found via version or model number:', referenceNumber);
            return null; // Return null if the response is not OK
        }
        const data = await response.json();
        console.log("Device data from OpenFDA UDI API:", data);

        if (data.results && data.results.length > 0) {
            return transformOpenFdaData(data.results[0]);
        } else {
            console.warn('No results found in OpenFDA data for version or model number:', referenceNumber);
            return null; // Return null if no results are found
        }
    } catch (error) {
        console.error('Error fetching device data via version or model number:', error);
        return null; // Return null on error
    }
}

async function fetchClassificationData(code) {
    // console.log('Code', code);
    return fetch(`https://api.fda.gov/device/classification.json?search=product_code:${code}&limit=5`)
        .then(response => response.json())
        .then(data => {
            // console.log("Device data from AccessGUDID Classification:", data);

            if (data.results && data.results.length > 0) {
                let classificationData = {
                    medical_specialty_code: data.results[0].medical_specialty,
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
                // FDA API returned no results; try fetching from local database
                console.warn('FDA API returned no results, fetching from local database.');
                return fetchClassificationDataFromLocalDB(code);
            }
        })
        .catch(error => {
            console.error('Error fetching classification data from FDA API:', error);
            // Fetch from local database on error
            return fetchClassificationDataFromLocalDB(code);
        });
}

async function fetchClassificationDataFromLocalDB(code) {
    try {
        const response = await fetch('/api/get-classification-data/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(), // Ensure CSRF token is included
            },
            body: JSON.stringify({product_code: code}),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch classification data from local database');
        }

        const result = await response.json();

        if (result.classification_data) {
            const classificationData = result.classification_data;

            // Combine title and definition for the description
            let description = `${classificationData.device_name}: ${classificationData.definition}`;
            classificationData.description = description;

            return classificationData;
        } else {
            throw new Error(result.error || 'No classification data found');
        }
    } catch (error) {
        console.error('Error fetching classification data from local database:', error);
        return null;
    }
}

async function revalidateRecords(records) {
    const recordPromises = records.map(async (record) => {
        try {
            // Validate required fields
            const requiredFields = ['listing_title', 'manufacturer', 'description', 'category'];
            for (const field of requiredFields) {
                if (!record[field] || record[field].toString().trim() === '') {
                    throw new Error(`Field ${field} is missing or empty`);
                }
            }

            // Validate date fields
            const dateFields = ['Production Date', 'Expiration Date'];
            for (const field of dateFields) {
                const dateValue = record[field];
                if (dateValue) {
                    // Check if the date is in yyyy-mm-dd format
                    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
                    if (!datePattern.test(dateValue)) {
                        throw new Error(`Field ${field} must be in yyyy-mm-dd format`);
                    }
                }
            }

            // **Validation Logic Starts Here**

            // Rule 1: Quantity Available > 0
            const quantityAvailable = parseInt(record['Quantity Available'], 10);
            if (!quantityAvailable || quantityAvailable <= 0) {
                throw new Error('Quantity Available must be greater than 0');
            }

            // Rule 2 & 4: Listing Type validation
            const listingType = record['Listing Type']?.trim().toLowerCase();
            if (!listingType) {
                throw new Error('Listing Type is missing');
            }

            if (listingType === 'auction') {
                // Rule 2: Auction validation
                const startingBid = parseFloat(record['Starting Bid']);
                if (!startingBid || startingBid <= 0) {
                    throw new Error('Starting Bid must be greater than 0 for Auction listings');
                }

                const auctionDuration = parseInt(record['Auction Duration'], 10);
                if (![1, 3, 5, 7, 10].includes(auctionDuration)) {
                    throw new Error('Auction Duration must be one of 1, 3, 5, 7, or 10 for Auction listings');
                }
            } else if (listingType === 'sale') {
                // Rule 4: Sale validation
                const salePrice = parseFloat(record['Sale Price']);
                if (!salePrice || salePrice <= 0) {
                    throw new Error('Sale Price must be greater than 0 for Sale listings');
                }
            } else {
                throw new Error('Invalid Listing Type. Must be "Auction" or "Sale"');
            }

            // If all validations pass
            return {status: 'good', data: record};
        } catch (error) {
            // Add error details to the record
            return {status: 'bad', data: {...record, error: error.message}};
        }
    });

    const results = await Promise.all(recordPromises);

    const goodRecords = results.filter(result => result.status === 'good').map(result => result.data);
    const badRecords = results.filter(result => result.status === 'bad').map(result => result.data);

    return {goodRecords, badRecords};
}


function cellEditor(cell) {
    const field = cell.getField();
    const row = cell.getRow();
    const rowData = row.getData();

    // Re-apply the formatter to update cell highlighting
    const formatter = cell.getColumn().getDefinition().formatter;
    if (formatter) {
        formatter(cell);
    }

    if (field === 'Listing Type') {
        // When 'Listing Type' changes, re-validate related fields
        ['Starting Bid', 'Auction Duration', 'Sale Price'].forEach(f => {
            const relatedCell = row.getCell(f);
            if (relatedCell) {
                const relatedFormatter = relatedCell.getColumn().getDefinition().formatter;
                if (relatedFormatter) {
                    relatedFormatter(relatedCell);
                }
            }
        });
    }

    if (field === 'medicalSpecialtyCode') {
        // Update the description based on the code
        const code = cell.getValue();
        const description = medicalSpecialtyOptions[code] || '';
        row.update({medicalSpecialtyDescription: description});
    } else if (field === 'medicalSpecialtyDescription') {
        // Update the code based on the description
        const description = cell.getValue();
        const code = Object.keys(medicalSpecialtyOptions).find(key => medicalSpecialtyOptions[key] === description) || '';
        row.update({medicalSpecialtyCode: code});
    }

    // Update tooltip
    if (rowData.error) {
        row.getElement().setAttribute('title', rowData.error);
    } else {
        row.getElement().removeAttribute('title');
    }
}

// Handle Save Changes button click
document.getElementById('saveBadRecordsBtn').addEventListener('click', async () => {
    let updatedBadRecords = window.badRecordsTable.getData();
    console.log('Updated Bad Records', updatedBadRecords);

    // Parse date fields before revalidation
    updatedBadRecords.forEach(record => {
        if (record['Production Date']) {
            record['Production Date'] = parseExcelDate(record['Production Date']);
        }
        if (record['Expiration Date']) {
            record['Expiration Date'] = parseExcelDate(record['Expiration Date']);
        }
    });

    // Revalidate records
    const {goodRecords: newGoodRecords, badRecords: remainingBadRecords} = await revalidateRecords(updatedBadRecords);

    // Check if all remaining bad records have a fatal error
    const allFatalErrors = remainingBadRecords.length > 0 && remainingBadRecords.every(record => record.fatalError === true);

    // Merge new good records and display them
    // goodRecords = goodRecords.concat(newGoodRecords);
    window.goodRecordsTable.addData(newGoodRecords);
    window.goodRecordsTable.redraw(true);

    if (remainingBadRecords.length > 0) {
        if (allFatalErrors) {
            // All remaining bad records have fatal errors
            Swal.fire({
                title: 'Some Records Still Need Attention',
                html: `
                <p>We successfully validated and moved <strong>${newGoodRecords.length}</strong> record(s) to ready to import.</p>
                <p>However, <strong>${remainingBadRecords.length}</strong> record(s) still contain errors that prevent them from being imported.</p>
                <p>Please download the bad records to review them, then proceed with importing the valid records.</p>
            `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-download"></i> Download and Proceed',
                cancelButtonText: 'Cancel',
                customClass: {
                    confirmButton: 'btn btn-warning me-2', // Bootstrap warning button style for confirm
                    cancelButton: 'btn btn-secondary ms-2', // Bootstrap secondary button style for cancel
                },
                buttonsStyling: false // Disable default SweetAlert2 button styling to use Bootstrap
            }).then((result) => {
                if (result.isConfirmed) {
                    // Update the bad records table with remaining bad records
                    window.badRecordsTable.replaceData(remainingBadRecords);
                    // Optionally, refresh the table to re-apply formatters
                    window.badRecordsTable.redraw(true);

                    // Download the remaining bad records as an Excel file
                    const table = window.badRecordsTable;
                    table.download("xlsx", "error_records.xlsx");

                    // Hide the bad records and show the good records tables
                    displayGoodRecords();
                }
            });
        } else {
            // Still some bad records without fatal errors
            Swal.fire({
                title: 'Validation Result',
                text: `${remainingBadRecords.length} record(s) still have errors.`,
                icon: 'warning',
                confirmButtonText: 'OK'
            });
            // Update the bad records table with remaining bad records
            window.badRecordsTable.replaceData(remainingBadRecords);
            // Optionally, refresh the table to re-apply formatters
            window.badRecordsTable.redraw(true);


        }
    } else {
        // All records are valid
        Swal.fire({
            title: 'All Records Validated',
            text: 'All records have been fixed and moved to good records.',
            icon: 'success',
            confirmButtonText: 'OK'
        }).then(() => {
            // Hide the bad records and show the good records tables
            displayGoodRecords();
        });
    }

});

document.querySelectorAll('.startOverBtn').forEach(button => {
    button.addEventListener('click', function () {
        location.reload(); // This will reload the page
    });
});

document.getElementById('fixLaterBtn').addEventListener('click', async () => {
    // Download xlsx
    const table = window.badRecordsTable;
    table.download("xlsx", "error_records.xlsx");

    displayGoodRecords();
});

// Import the listings
document.getElementById('fixNowBtn').addEventListener('click', function (event) {
    displayBadRecords();
});

document.getElementById('importGoodRecordsBtn').addEventListener('click', function (event) {
    displayGoodRecords();
});

document.getElementById('import-button').addEventListener('click', function (event) {
    event.preventDefault(); // Prevent the default form submission
    // Call the function to handle the import
    handleImport();
});

function handleImport() {
    const auction_data = prepareAuctionData();
    console.log('Auction Data', auction_data);
    const formData = new FormData();

    // Append auction_data as a JSON string
    formData.append('auction_data', JSON.stringify(auction_data));

    // Iterate over auction_data to append images
    auction_data.forEach((auctionInfo, rowIndex) => {
        if (auctionInfo.images && auctionInfo.images.length > 0) {
            auctionInfo.images.forEach((image, imgIndex) => {
                const file = dataURLtoFile(image.data, image.name);
                // Create a unique key for each image
                const imageKey = `images_${rowIndex}_${imgIndex}`;
                formData.append(imageKey, file);
            });
        }
        // Remove images from auctionInfo to avoid sending base64 data in the JSON
        delete auctionInfo.images;
    });

    // Now that images are removed from auctionInfo, update the auction_data in FormData
    formData.set('auction_data', JSON.stringify(auction_data));

    // Send the data to the server
    sendDataToServer(formData, auction_data.length);


}


// Function to convert empty strings to null
function toNullIfEmpty(value) {
    if (value === undefined || value === null) return null;
    return value === "" ? null : value;
}

function formatDate(dateValue) {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
}

function prepareAuctionData() {
    // console.log('Type of goodRecordsTable:', typeof window.goodRecordsTable);
    // console.log('goodRecordsTable:', window.goodRecordsTable);

    const listingsData = window.goodRecordsTable.getData();
    const auction_data = [];

    console.log('Listing Data', listingsData);

    listingsData.forEach((record, index) => {
        let auctionInfo = {
            title: record['Reference Number'] ? record['Reference Number'] : '',
            description: record['description'] ? record['description'].trim() : '',
            category_id: record['categoryId'] || null,
            manufacturer: record['manufacturer'] ? record['manufacturer'].trim() : '',
            package_type: record['packageType'] ? record['packageType'].trim() : '',
            deviceSterile: record['deviceSterile'],
            implantable: record['implantable'],
            medicalSpecialtyCode: record['medicalSpecialtyCode'] || '',
            medicalSpecialtyDescription: record['medicalSpecialtyDescription'] || '',
            deviceName: record['deviceName'] || '',

            sku: record['SKU'] ? record['SKU'].trim() : null,
            reference_number: record['Reference Number'] ? record['Reference Number'] : null,
            lot_number: record['Lot Number'] ? record['Lot Number'] : null,
            production_date: formatDate(record['Production Date']),
            expiration_date: formatDate(record['Expiration Date']),
            quantity_available: toNullIfEmpty(record['Quantity Available']),
            auction_type: record['Listing Type'] ? record['Listing Type'].trim() : '',
            starting_bid: toNullIfEmpty(record['Starting Bid']),
            reserve_bid: toNullIfEmpty(record['Reserve Bid']),
            buyItNowPrice: toNullIfEmpty(record['Sale Price']),
            auction_duration: record['Auction Duration'] ? record['Auction Duration'].toString().trim() : null,
            images: record.images || [], // Include images array
        };

        auction_data.push(auctionInfo);
    });


    return auction_data;
}

function sendDataToServer(formData, recordCount) {
    // Show a loading message using SweetAlert2
    Swal.fire({
        title: 'Importing Listings',
        text: 'Please wait while we import your listings...',
        icon: 'info',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    fetch('/import_excel/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCsrfToken(), // Ensure CSRF token is included
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                Swal.fire({
                    title: 'Import Complete',
                    text: `${recordCount} listing(s) have been successfully imported.`,
                    icon: 'success',
                    confirmButtonText: 'OK',
                    customClass: {
                        confirmButton: 'btn btn-primary',
                    }
                }).then(() => {
                    window.goodRecordsTable.clearData();
                    document.getElementById('next-steps-container').classList.remove('d-none');
                    document.getElementById('records-container').style.display = 'none';
                });
            } else {
                Swal.fire({
                    title: 'Import Failed',
                    text: `An error occurred: ${data.message}`,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        })
        .catch((error) => {
            Swal.fire({
                title: 'Import Failed',
                text: `An error occurred: ${error.message}`,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        });
}

function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type: mime});
}





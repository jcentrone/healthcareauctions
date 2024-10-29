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
    'SKU',
    'Reference Number',
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
        title: "SKU",
        field: "SKU",
        editor: "input",
        formatter: validateCell,
    },
    {
        title: "Listing Title",
        field: "listing_title",
        editor: "input",
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
        editor: "input",
        formatter: validateCellConditional,
    },
    {
        title: "Reserve Bid",
        field: "Reserve Bid",
        editor: "input",
    },
    {
        title: "Sale Price",
        field: "Sale Price",
        editor: "input",
        formatter: validateCellConditional,
    },
    {
        title: "Auction Duration",
        field: "Auction Duration",
        editor: "input",
        formatter: validateCellConditional,
    },
    {
        title: "Package Type",
        field: "packageType",
        editor: "list",
        editorParams: {
            values: packageTypeOptions,
        },
    },
    {
        title: "Device Name",
        field: "deviceName",
        editor: "input",
        formatter: validateCell,
    },
    {
        title: "Manufacturer",
        field: "manufacturer",
        editor: "input",
        formatter: validateCell,
    },
    {
        title: "Description",
        field: "description",
        editor: "textarea",
        width: 200,
        formatter: validateCell,
    },
    {
        title: "Medical Specialty Description",
        field: "medicalSpecialtyDescription",
        editor: "list",
        editorParams: {
            values: Object.values(medicalSpecialtyOptions),
        },
        formatter: validateCell,
    },
    {
        title: "Medical Specialty Code",
        field: "medicalSpecialtyCode",
        editor: "list",
        editorParams: {
            values: medicalSpecialtyOptions,
        },
        formatter: validateCell,
    },
    {
        title: "Category",
        field: "category",
        editor: false,
        formatter: validateCell,
    },
    {
        title: "Category ID",
        field: "categoryId",
        editor: false,
        formatter: validateCell,
    },
    {
        title: "Device Sterile",
        field: "deviceSterile",
        editor: "tickCross",
        formatter: "tickCross",
    },
    {
        title: "Implantable",
        field: "implantable",
        editor: "tickCross",
        formatter: "tickCross",
    },
    {
        title: "Error",
        field: "error",
        editor: false,
        visible: false, // Hide the column but keep the data
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

function downloadBadRecords(badRecords) {
    // Create a temporary Tabulator table (not displayed) to use its download function
    const table = new Tabulator("#temp-table", {
        data: badRecords,
        columns: columns,
    });

    // Download data as CSV
    table.download("csv", "bad_records.csv");

    // Clean up the temporary table
    table.destroy();
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

function validateCellConditional(cell) {
    const value = cell.getValue();
    const rowData = cell.getRow().getData();
    const listingType = rowData['Listing Type']?.trim().toLowerCase();

    let shouldHighlight = false;

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

    if (shouldHighlight) {
        cell.getElement().style.backgroundColor = '#f8d7da';
        cell.getElement().style.color = '#721c24';
    } else {
        cell.getElement().style.backgroundColor = '';
        cell.getElement().style.color = '';
    }
    return value;
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
                displayRecords(badRecords, '#bad-records-table');

                // Display good records
                displayGoodRecords(goodRecords);
            }
        };
        reader.readAsBinaryString(file);
    }
}

async function validateAndMapHeaders(extractedHeaders) {
    const missingHeaders = requiredHeaders.filter(header => !extractedHeaders.includes(header));
    if (missingHeaders.length === 0) {
        // All required headers are present
        return null;
    } else {
        console.log('Missing Headers', missingHeaders);
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

                // Display good records
                displayGoodRecords(goodRecords);

                // Display bad records if any
                if (badRecords.length > 0) {
                    displayRecords(badRecords, '#bad-records-table');
                }
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

    // Initialize the SweetAlert modal with placeholders for counts
    Swal.fire({
        title: 'Processing Records',
        html: `
            <p>Processing record <b>0</b> of ${totalRecords}</p>
            <p>Good Records: <b>0</b></p>
            <p>Bad Records: <b>0</b></p>
        `,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    for (let i = 0; i < totalRecords; i++) {
        let record = records[i];
        let mergedRecord = {...record}; // Start with the original user data

        try {
            // Fetch deviceData
            const sku = record.SKU || record['SKU'];
            const refNumb = record['Reference Number'];
            if (!sku) {
                throw new Error('SKU is missing');
            }

            const deviceData = await fetchDeviceData(sku, refNumb);
            if (!deviceData || !deviceData.gudid) {
                throw new Error(`Device data not found for SKU: ${sku}`);
            }

            // Extract deviceData fields
            const listing_title = deviceData.gudid.device.catalogNumber || deviceData.gudid.device.versionModelNumber;
            const manufacturer = deviceData.gudid.device.companyName;
            const packageType = deviceData.gudid.device.identifiers?.identifier?.[0]?.pkgType || 'Unknown';
            const deviceSterile = deviceData.gudid.device.sterilization?.deviceSterile;
            const implantable = deviceData.gudid.device.gmdnTerms?.gmdn?.[0]?.implantable;
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
            const category = classificationData.category || 'No category';
            const categoryId = classificationData.category_id || 'N/A';
            const medicalSpecialtyCode = classificationData.medical_specialty_code || '';
            const deviceName = classificationData.device_name || '';
            const medicalSpecialtyDescription = classificationData.medical_specialty_description || '';

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

            // **Validation Logic Starts Here**

            // Rule 1: Quantity Available > 0
            const quantityAvailable = parseInt(mergedRecord['Quantity Available'], 10);
            if (!quantityAvailable || quantityAvailable <= 0) {
                throw new Error('Quantity Available must be greater than 0');
            }

            // Rule 2 & 4: Listing Type validation
            const listingType = mergedRecord['Listing Type']?.trim().toLowerCase();
            if (!listingType) {
                throw new Error('Listing Type is missing');
            }

            if (listingType === 'auction') {
                // Rule 2: Auction validation
                const startingBid = parseFloat(mergedRecord['Starting Bid']);
                if (!startingBid || startingBid <= 0) {
                    throw new Error('Starting Bid must be greater than 0 for Auction listings');
                }

                const auctionDuration = parseInt(mergedRecord['Auction Duration'], 10);
                if (![1, 3, 5, 7, 10].includes(auctionDuration)) {
                    throw new Error('Auction Duration must be one of 1, 3, 5, 7, or 10 for Auction listings');
                }
            } else if (listingType === 'sale') {
                // Rule 4: Sale validation
                const salePrice = parseFloat(mergedRecord['Sale Price']);
                if (!salePrice || salePrice <= 0) {
                    throw new Error('Sale Price must be greater than 0 for Sale listings');
                }
            } else {
                throw new Error('Invalid Listing Type. Must be "Auction" or "Sale"');
            }

            // All validations passed, classify as good record
            goodRecords.push(mergedRecord);

        } catch (error) {
            // Handle errors and classify record as bad
            mergedRecord.error = error.message;
            badRecords.push(mergedRecord);
        }

        // Update the SweetAlert modal with progress and counts
        Swal.update({
            html: `
                <p>Processing record <b>${i + 1}</b> of ${totalRecords}</p>
                <p>Good Records: <b>${goodRecords.length}</b></p>
                <p>Bad Records: <b>${badRecords.length}</b></p>
            `
        });
    }

    // Close the SweetAlert modal when done
    Swal.close();

    return {goodRecords, badRecords};
}


async function fetchDeviceData(rawCode, refNumb) {
    const code = rawCode;
    const referenceNumber = refNumb;
    if (deviceDataCache[code]) {
        return Promise.resolve(deviceDataCache[code]);
    }

    let data = null;

    // Attempt to fetch via DI or UDI
    try {
        data = await fetchDeviceDataByCode(code);
        if (data) {
            deviceDataCache[code] = data;
            return data;
        }
    } catch (error) {
        console.error('Error fetching device data by code:', error);
    }

    // If DI/UDI fetch failed or code is not DI/UDI, try fetching via catalog number
    if (referenceNumber) {
        try {
            data = await fetchDeviceDataByCatalogNumber(referenceNumber);
            if (data) {
                deviceDataCache[code] = data;
                return data;
            }
        } catch (error) {
            console.error('Error fetching device data via catalog number:', error);
        }

        // If fetching via catalog number failed, try fetching via version or model number
        try {
            data = await fetchDeviceDataByVersionModelNumber(referenceNumber);
            if (data) {
                deviceDataCache[code] = data;
                return data;
            } else {
                throw new Error('Device not found via version or model number');
            }
        } catch (error) {
            console.error('Error fetching device data via version or model number:', error);
            throw error; // Propagate the error
        }
    } else {
        throw new Error('No valid code or reference number provided');
    }
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
    console.log('Fetching device data via catalog number:', openFdaUrl);

    const response = await fetch(openFdaUrl);
    if (!response.ok) {
        throw new Error('Device not found via catalog number');
    }
    const data = await response.json();
    console.log("Device data from OpenFDA UDI API:", data);

    if (data.results && data.results.length > 0) {
        return transformOpenFdaData(data.results[0]);
    } else {
        throw new Error('No results found in OpenFDA data');
    }
}

async function fetchDeviceDataByVersionModelNumber(referenceNumber) {
    const openFdaUrl = `https://api.fda.gov/device/udi.json?search=version_or_model_number.exact:${encodeURIComponent(referenceNumber)}&limit=1`;
    console.log('Fetching device data via version or model number:', openFdaUrl);

    const response = await fetch(openFdaUrl);
    if (!response.ok) {
        throw new Error('Device not found via version or model number');
    }
    const data = await response.json();
    console.log("Device data from OpenFDA UDI API:", data);

    if (data.results && data.results.length > 0) {
        return transformOpenFdaData(data.results[0]);
    } else {
        throw new Error('No results found in OpenFDA data');
    }
}

async function fetchClassificationData(code) {
    console.log('Code', code);
    return fetch(`https://api.fda.gov/device/classification.json?search=product_code:${code}&limit=5`)
        .then(response => response.json())
        .then(data => {
            console.log("Device data from AccessGUDID Classification:", data);

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
                        console.log(result);
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

//Display Records
function displayRecords(records, tableSelector = "#bad-records-table") {
    const recordsContainer = document.getElementById('records-container');
    recordsContainer.style.display = 'block';

    const table = new Tabulator(tableSelector, {
        data: records,
        theme: "bootstrap5",
        renderHorizontal: "virtual",
        layout: "fitData",
        columns: columns, // Use the global columns variable
        height: "400px",
        pagination: "local",
        paginationSize: 10,
        rowFormatter: function (row) {
            const rowData = row.getData();
            if (rowData.error) {
                row.getElement().setAttribute('title', rowData.error);
            } else {
                row.getElement().removeAttribute('title');
            }
        }
    });

    table.on("cellEdited", function (cell) {
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
            row.update({ medicalSpecialtyDescription: description });
        } else if (field === 'medicalSpecialtyDescription') {
            // Update the code based on the description
            const description = cell.getValue();
            const code = Object.keys(medicalSpecialtyOptions).find(key => medicalSpecialtyOptions[key] === description) || '';
            row.update({ medicalSpecialtyCode: code });
        }

        // Update tooltip
        if (rowData.error) {
            row.getElement().setAttribute('title', rowData.error);
        } else {
            row.getElement().removeAttribute('title');
        }
    });

    // Store the table instance globally if needed
    if (tableSelector === '#bad-records-table') {
        window.badRecordsTable = table;
    } else if (tableSelector === '#good-records-table') {
        window.goodRecordsTable = table;
    }
}

function displayBadRecordsModal(badRecords) {
    // Initialize the table in the modal
    displayRecords(badRecords, '#bad-records-table-modal');

    // Show the modal
    var badRecordsModal = new bootstrap.Modal(document.getElementById('badRecordsModal'), {
        backdrop: 'static',
        keyboard: false
    });
    badRecordsModal.show();


}


// Handle Save Changes button click
document.getElementById('saveBadRecordsBtn').addEventListener('click', async () => {
    const updatedBadRecords = window.badRecordsTable.getData();
    const {goodRecords: newGoodRecords, badRecords: remainingBadRecords} = await revalidateRecords(updatedBadRecords);

    // Merge new good records
    goodRecords = goodRecords.concat(newGoodRecords);

    if (remainingBadRecords.length > 0) {
        // Still some bad records
        Swal.fire({
            title: 'Validation Result',
            text: `${remainingBadRecords.length} record(s) still have errors.`,
            icon: 'warning',
            confirmButtonText: 'OK'
        });
        // Update the table with remaining bad records
        window.badRecordsTable.replaceData(remainingBadRecords);
    } else {
        Swal.fire({
            title: 'All Records Validated',
            text: 'All records have been fixed and moved to good records.',
            icon: 'success',
            confirmButtonText: 'OK'
        }).then(() => {
            // Close the modal
            badRecordsModal.hide();
            // Refresh good records table
            displayGoodRecords(goodRecords);
        });
    }
});


function displayGoodRecords(goodRecords) {
    const table = new Tabulator("#good-records-table", {
        data: goodRecords,
        theme: "bootstrap5",
        renderHorizontal: "virtual",
        layout: "fitData",
        columns: columns,
        height: "400px",
        pagination: "local",
        paginationSize: 10,
    });

    table.on("cellEdited", function (cell) {
        const field = cell.getField();
        const row = cell.getRow();

        if (field === 'medicalSpecialtyCode') {
            // Update the description based on the code
            const code = cell.getValue(); // Get the new code value
            const description = medicalSpecialtyOptions[code] || '';
            row.update({medicalSpecialtyDescription: description});
        } else if (field === 'medicalSpecialtyDescription') {
            // Update the code based on the description
            const description = cell.getValue(); // Get the new description value
            const code = Object.keys(medicalSpecialtyOptions).find(key => medicalSpecialtyOptions[key] === description) || '';
            row.update({medicalSpecialtyCode: code});
        }
    })

    // Store the table instance globally if needed
    window.badRecordsTable = table;
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




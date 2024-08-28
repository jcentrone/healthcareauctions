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
            document.getElementById('sample-file').style.display = 'none';
            document.getElementById('file-input').style.display = 'none';
            document.getElementById('import-button').style.display = 'block';
        };
        reader.readAsArrayBuffer(file);
    }
}

function generatePreviewTable(data) {
    const previewTableHead = document.getElementById('previewTableHead');
    const previewTableBody = document.getElementById('previewTableBody');
    previewTableHead.innerHTML = '';
    previewTableBody.innerHTML = '';

    const headerRow = document.createElement('tr');
    data[0].forEach(header => {
        const th = document.createElement('th');
        th.innerText = header;
        headerRow.appendChild(th);
    });
    const imageHeader = document.createElement('th');
    imageHeader.innerText = 'Images';
    headerRow.appendChild(imageHeader);
    previewTableHead.appendChild(headerRow);

    data.slice(1, 6).forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            td.innerText = typeof cell === 'number' && isExcelDate(cell) ? formatDate(cell) : cell;
            tr.appendChild(td);
        });

        // Add modal control for image upload fields
        const td = document.createElement('td');
        const button = document.createElement('button');
        button.classList.add('btn', 'btn-secondary');
        button.innerText = 'Upload Images';
        button.setAttribute('data-row-index', rowIndex);
        button.addEventListener('click', () => showImageUploadModal(rowIndex));
        td.appendChild(button);
        tr.appendChild(td);

        previewTableBody.appendChild(tr);
    });

    document.getElementById('previewContainer').style.display = 'block';
}

function showImageUploadModal(rowIndex) {
    const imageUploadContainer = document.getElementById('imageUploadContainer');
    imageUploadContainer.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
        const div = document.createElement('div');
        div.classList.add('form-group');

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
        {label: 'Product Name', value: 'title'},
        {label: 'Description', value: 'description'},
        {label: 'Category', value: 'category'},
        {label: 'Starting Bid', value: 'starting_bid'},
        {label: 'Reserve Bid', value: 'reserve_bid'},
        {label: 'Auction Duration', value: 'auction_duration'},
        {label: 'Manufacturer', value: 'manufacturer'},
        {label: 'Reference Number', value: 'reference_number'},
        {label: 'Lot Number', value: 'lot_number'},
        {label: 'Expiration Date', value: 'expiration_date'},
        {label: 'Package Type', value: 'package_type'},
        {label: 'Package Quantity', value: 'package_quantity'},
        {label: 'Device Sterile', value: 'deviceSterile'},
        {label: 'Full Package', value: 'fullPackage'}
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

document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('closeMappingModal').addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('mappingModal').style.display = 'none';
});

document.getElementById('importForm').addEventListener('submit', function (event) {
    event.preventDefault();

    let formData = new FormData(this);
    let auction_data = [];

    // Collect auction data
    document.querySelectorAll('#previewTableBody tr').forEach((row, rowIndex) => {
        let rowData = {};
        row.querySelectorAll('td').forEach((cell, cellIndex) => {
            if (cellIndex < row.children.length - 1) { // Ignore image modal control cell
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
            console.log('Success:', data);
            // Handle success such as redirecting to another page
        })
        .catch((error) => {
            console.error('Error:', error);
        });
});
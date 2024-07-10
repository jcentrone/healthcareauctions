document.querySelector('.bid-form').addEventListener('click', function (event) {
    event.preventDefault();
});

document.getElementById('time-filter').addEventListener('change', function () {
    document.getElementById('filter-form').submit();
});

document.getElementById('sort-by').addEventListener('change', function () {
    document.getElementById('filter-form').submit();
});

document.getElementById('mfg-filter').addEventListener('change', function () {
    document.getElementById('filter-form').submit();
});

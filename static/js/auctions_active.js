document.querySelector('.bid-form').addEventListener('click', function (event) {
    // event.preventDefault();
});
//
// document.getElementById('time-filter').addEventListener('change', function () {
//     document.getElementById('filter-form').submit();
// });
//
// document.getElementById('sort-by').addEventListener('change', function () {
//     document.getElementById('filter-form').submit();
// });
//
// document.getElementById('mfg-filter').addEventListener('change', function () {
//     document.getElementById('filter-form').submit();
// });

document.querySelectorAll('.dropdown-menu a').forEach(item => {
        item.addEventListener('click', function() {
            const button = this.closest('.dropdown').querySelector('.dropdown-toggle');
            button.textContent = this.textContent;
            button.dataset.value = this.dataset.value;

            const hiddenInput = button.nextElementSibling;
            hiddenInput.value = this.dataset.value;
        });
    });

document.addEventListener('DOMContentLoaded', function () {
    // Update the hidden input and submit the form when a dropdown item is clicked
    document.querySelectorAll('#auction-filter-form .dropdown-menu a').forEach(item => {
        item.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent default link behavior

            const button = this.closest('.dropdown').querySelector('.dropdown-toggle');
            const hiddenInput = document.getElementById(button.id + '-value');

            console.log(`Selected ${button.id}: ${this.textContent} (value: ${this.dataset.value})`); // Debugging

            button.textContent = this.textContent;
            hiddenInput.value = this.dataset.value;

            console.log(`Updated hidden input ${hiddenInput.id}: ${hiddenInput.value}`); // Debugging

            document.getElementById('auction-filter-form').submit();
        });
    });
});
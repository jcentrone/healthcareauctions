// document.addEventListener(" DOMContentLoaded", function () {
//     // Target the 'Next' button on the "Contact & Shipping" tab
//     document.querySelector("#contact .btn-primary").addEventListener("click", function () {
//         var nextTab = new bootstrap.Tab(document.querySelector('#confirmation-tab'));
//         nextTab.show();
//     });
//
//     // Target the 'Back' and 'Next' buttons on the "Order Confirmation" tab
//     document.querySelector("#confirmation .btn-secondary").addEventListener("click", function () {
//         var prevTab = new bootstrap.Tab(document.querySelector('#contact-tab'));
//         prevTab.show();
//     });
//
//     document.querySelector("#confirmation .btn-primary").addEventListener("click", function () {
//         var nextTab = new bootstrap.Tab(document.querySelector('#payment-tab'));
//         nextTab.show();
//     });
//
//     // Target the 'Back' button on the "Payment & Submit" tab
//     document.querySelector("#payment .btn-secondary").addEventListener("click", function () {
//         var prevTab = new bootstrap.Tab(document.querySelector('#confirmation-tab'));
//         prevTab.show();
//     });
//     // Payment method change
//     document.getElementById('payment_method').addEventListener('change', function () {
//         let selectedMethod = this.value;
//         document.querySelectorAll('.payment-form').forEach(function (form) {
//             form.style.display = 'none';
//         });
//         document.getElementById(selectedMethod + '-form').style.display = 'block';
//     });
// });
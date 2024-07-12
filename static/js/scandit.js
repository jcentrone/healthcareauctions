 import * as ScanditSDK from "https://cdn.jsdelivr.net/npm/scandit-web-datacapture-barcode@6.25.0/build/engine/scandit-datacapture-sdk-barcode.js";

        document.addEventListener("DOMContentLoaded", function () {
            if (typeof ScanditSDK !== 'undefined') {
                initializeScandit();
            } else {
                document.querySelector('script[src="https://cdn.jsdelivr.net/npm/scandit-web-datacapture-barcode@6.25.0/build/engine/scandit-datacapture-sdk-barcode.js"]').addEventListener('load', initializeScandit);
            }
        });

        function initializeScandit() {
            const licenseKey = "AoI0dgM+JqUaM/oykwc9kQAOoFFnHmdgaxabYHoa6qztdvFtJ2rRZNh7ZfssS83WxEIWalpjApzsX0zHsjc2DHFCbLP1WGNbnBLmEwsiqdx0BWSQbkOuuqgnCRJmQJRyt0WVs+RDuGOnJg5E4F4ndzZvtuB3ReKQcHy/5bZqZJ87f22w6Ru2SsdGJaaRUwNs1SQvCGFHjKo3bI2y7GmFMw9oXiR9Tc6LcVqYdKIVYIqPS1VZNmu/1IpLIM3qZAEKPmhMFYdP//+BXipX8n8lQ0VhylImTH662kgAdPxugjzzb0CRVEZNtEp6ITMlbwrSK0F6PxNzBTyvYU5sb2gQ+j17r7ySftFGNE0eezpImTF7Tb4wvEXdhhUSLJlWeLYRYQjn4gVAln9KQ4qDoj7d180ULjqHQ93EAS/nfrhyE2HkX7B8rU3wGVUhp0h1PYfaeGXGDL8DLOo/TGlK+XphLs5LMUhPa90RWkbnv19PXYoJYY08YgRYUUtyD8X5CmoG0UoJeQl8v1XcaCf/LwHCnTQzo2MnkXJrg+GHL9ZMUTkvxf6d7lu+KmodG5lL1ywNZKxIbqcrB91PN29MIiELMDf4DR5WThOqnZIpQtUF5bZJrkv8N0iwtaeW2vtsJ9QxQjqQHr3puzU3fHK8IZZEoZ0xF2li9QRExErwo1x0U/x8EpD/WbVFgZHwzxrQ3MJbDDIt30ZlAfTxjSO50IazTMlT8CpGcb73SZViNuyWobkHRtKNEH9HQj2IUhHIthRXNXjd9W1EVnOFQe5FWSpJOL0B5WB2tjtQO0Jt9GJz/ZIyK7aVw/NT7R5wmXMUukHtP18lZm8ygnHj+f1HrvpJ8baJ6zvEDnY94UKTG9SvPgCnujeBR+qU66vQlm1EcLgP9WiGd3ztsVI5lKV8/QvA7p+Q+1GnPpC9kFevAiDHvmqUtq54xtHRSQXoB15aqhu1OkLhRhgFi6VzPf0sxaQi32h2l698bbi9i/eRWBcC8BOXCeaD/MgSxXChEMtclgG8g/UH9nCvGs4LsTU2udbaVw2tqXa5qeoeIGIJFJqsiAhTQgAODMRABU0m0dZM7ocPQ8Ntat7hAAcz3Wc5Vs4Z1HcQTME67cGHJqYFshO6Ae5GTVMY9uiqbkrlYedEHpXRpBIxcsHZ5SrbkqcmKWE8f8UokhrmVeyHF3xmUo8wyQWVVLi69u0Jjd65F6eu40CMFw4=";

            // Configure the barcode picker
            ScanditSDK.configure({
                licenseKey: licenseKey,
                engineLocation: "https://cdn.jsdelivr.net/npm/scandit-web-datacapture-barcode@6.25.0/build/engine/"
            }).then(() => {
                ScanditSDK.BarcodePicker.create(document.getElementById("scandit-barcode-picker"), {
                    playSoundOnScan: true,
                    vibrateOnScan: true,
                }).then((barcodePicker) => {
                    const scanSettings = new ScanditSDK.ScanSettings({
                        enabledSymbologies: ["ean8", "ean13", "upca", "upce", "code128"],
                        codeDuplicateFilter: 1000,
                    });

                    barcodePicker.applyScanSettings(scanSettings);

                    // Enable MatrixScan
                    barcodePicker.setMatrixScanEnabled(true);

                    // Add event listener for scan events
                    barcodePicker.on("scan", (scanResult) => {
                        scanResult.barcodes.forEach((barcode) => {
                            console.log(barcode.symbology, barcode.data);
                            // Handle the scanned barcodes here
                        });
                    });

                    barcodePicker.on("matrixScan", (matrixScanResult) => {
                        console.log("MatrixScan results", matrixScanResult);
                        // Handle matrix scan results here
                    });
                });
            }).catch(error => {
                console.error("Scandit SDK configuration failed:", error);
            });
        }
// Function to show messages
function showMessage(messageId) {
    document.querySelectorAll('.message-content').forEach(function (content) {
        content.style.display = 'none';
    });
    document.querySelectorAll('.list-group-item').forEach(function (item) {
        item.classList.remove('active');
    });

    if (messageId) {
        document.getElementById('message-content-' + messageId).style.display = 'block';
        document.getElementById('message-' + messageId).classList.add('active');

        fetch(`/messages/mark-as-read/${messageId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
        }).then(response => {
            if (response.ok) {
                document.getElementById('message-' + messageId).classList.remove('new-message');
            }
        });
    } else {
        document.getElementById('customer-service-form').style.display = 'block';

        fetch(`/messages/mark-customer-service-read/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
        }).then(response => {
            if (response.ok) {
                // Update the UI if necessary
            }
        });
    }
}

// Function to contact customer service
function contactCustomerService() {
    document.querySelectorAll('.message-content').forEach(function (content) {
        content.style.display = 'none';
    });
    const csForm = document.getElementById('customer-service-form');
    if (csForm) {
        csForm.style.display = 'block';
    }
}

// Function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Function to handle form submission
document.querySelectorAll('.submitForm').forEach(function (form) {
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const textarea = form.querySelector('textarea[name="reply"]');
        const messageText = textarea.value;

        fetch(`/message/validate/${encodeURIComponent(messageText)}/`)
            .then(response => response.json())
            .then(data => {
                if (data.contains_pii) {
                    const highlightedMessage = data.validated_message.replace(/##(.*?)##/g, '<span style="background-color: yellow;">$1</span>').replace(/!!(.*?)!!/g, '<span>$1</span>');
                    Swal.fire({
                        title: 'Sensitive Information Detected',
                        html: `In accordance with our terms and conditions, this auction platform is blind, and sharing personally identifiable information (PII) is not permitted. Please review and remove the highlighted information before sending your message: <br><br>${highlightedMessage}`,
                        icon: 'warning',
                        confirmButtonText: 'OK, I will edit it',
                        customClass: {
                            confirmButton: 'btn btn-primary',
                        },
                    }).then((result) => {
                        if (result.isConfirmed) {
                            textarea.value = data.validated_message.replace(/##/g, '').replace(/!!/g, '');
                            const charCount = form.querySelector('.form-text');
                            charCount.textContent = `${textarea.value.length}/1000 characters used`;
                        }
                    });
                } else {
                    form.submit();
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    });
});

// Function to handle character count
document.addEventListener('DOMContentLoaded', function () {
    function updateCharCount(textarea, charCount) {
        const currentLength = textarea.value.length;
        charCount.textContent = `${currentLength}/1000 characters used`;
    }

    document.querySelectorAll('textarea.form-control').forEach(function (textarea) {
        const charCount = textarea.closest('form').querySelector('.form-text');

        textarea.addEventListener('input', function () {
            updateCharCount(textarea, charCount);
        });

        updateCharCount(textarea, charCount);
    });
});

// Initialize tooltips and archive buttons
document.addEventListener('DOMContentLoaded', function () {
    let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    document.querySelectorAll('.custom-archive-btn').forEach(function (button) {
        button.addEventListener('click', function (e) {
            e.stopPropagation();

            const messageId = this.getAttribute('data-message-id');

            fetch(`/messages/archive/${messageId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
            }).then(response => {
                if (response.ok) {
                    document.getElementById('message-' + messageId).style.display = 'none';
                }
            });
        });
    });
});

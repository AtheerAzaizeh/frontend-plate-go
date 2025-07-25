document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        const welcomeMessage = document.getElementById('welcome-message');
        const profilePicture = document.getElementById('profile-picture');

        welcomeMessage.textContent += user.firstName;
        profilePicture.src = user.img;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
 const reportDetails = urlParams.get('report');

try {
    if (reportDetails && reportDetails !== 'undefined') {
        const report = JSON.parse(decodeURIComponent(reportDetails));
        displayReportDetails(report);
        initializeMap(report.location);
    } else {
        throw new Error('Missing or invalid report parameter');
    }
} catch (err) {
    console.error('❌ Error loading report:', err.message);
    alert('Could not load the report details.');
}


    document.getElementById('delete-button').addEventListener('click', showDeleteModal);
    document.getElementById('cancel-delete').addEventListener('click', closeModal);
    document.getElementById('cancel-delete-btn').addEventListener('click', closeModal);
    document.getElementById('confirm-delete').addEventListener('click', confirmDelete);
    document.getElementById('close-success-modal').addEventListener('click', closeSuccessModal);
});

function displayReportDetails(report) {
    const reportDetailsElement = document.getElementById("report-details");
    reportDetailsElement.innerHTML = `
        <p><strong>Plate:</strong><br> ${report.plate} 
        <strong>Reason:</strong> <br>${report.reason}
        <p><strong>Location:</strong><br> ${report.location.city}, ${report.location.street} ${report.location.number}</p>
        <strong>Date:</strong><br> ${report.date}</p>
    `;
    const reportImageElement = document.getElementById("report-image");
    reportImageElement.innerHTML = `<img src="${report.image}" alt="Car Image" style="width: 100%;">`;
}

function initializeMap(location) {
    const map = L.map('report-map').setView([51.505, -0.09], 13); 

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = data[0].lat;
                const lon = data[0].lon;
                map.setView([lat, lon], 13);
                L.marker([lat, lon]).addTo(map)
                    .bindPopup(`Location: ${location}`)
                    .openPopup();
            } else {
                console.error('Location not found');
            }
        })
        .catch(error => console.error('Error fetching location coordinates:', error));
}

function showDeleteModal() {
    const modal = document.getElementById("confirmModal");
    modal.style.display = "block";
}

function closeModal() {
    const modal = document.getElementById("confirmModal");
    modal.style.display = "none";
}

function confirmDelete() {
    const urlParams = new URLSearchParams(window.location.search);
    const reportDetails = urlParams.get('report');
    const report = JSON.parse(decodeURIComponent(reportDetails));
    const reportID = report._id;
    const token = localStorage.getItem('token');

    fetch(`${BACKEND_URL}/api/reports/${reportID}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log(`Deleted report with ID: ${reportID}`);
        const successModal = document.getElementById("successModal");
        successModal.style.display = "block";
        closeModal();
    })
    .catch(error => console.error('Error deleting report:', error));
}

function closeSuccessModal() {
    const successModal = document.getElementById("successModal");
    successModal.style.display = "none";
    window.location.href = "report_history.html";
}

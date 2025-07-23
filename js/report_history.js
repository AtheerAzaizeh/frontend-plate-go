document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const welcomeMessage = document.getElementById('welcome-message');
        const profilePicture = document.getElementById('profile-picture');

        welcomeMessage.textContent += user.firstName;
        profilePicture.src = user.img;
    }

    fetchReportsFromBackend();
});

let reports = [];

function fetchReportsFromBackend() {
    console.log('Fetching reports...');
    const token = localStorage.getItem('token');

    fetch(`${BACKEND_URL}/api/reports`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Reports fetched:', data);
        reports = data;
        displayReports(reports);
    })
    .catch(error => console.error('Error fetching reports:', error));
}

function displayReports(reportList) {
    console.log('Displaying reports...', reportList);
    const reportListElement = document.getElementById("report-list");
    reportListElement.innerHTML = '';
    reportList.forEach((report) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <img src="${report.image}" alt="Car Image">
            <div class="report-details">
                <div class="info">
                    <p>${report.plate} <br> ${report.reason}</p>
                </div>
                <div class="pipe">
                    <span>&#124;</span>
                </div>
                <div class="location">
                    <p>${report.location}</p>
                </div>
                <div class="date">
                    <p>${report.date}</p>
                </div>
                <div class="status">
                    ${report.urgent ? '<span>⚠️</span>' : ''}
                </div>
            </div>
            <i class="fa fa-trash" data-id="${report.reportID}"></i>
        `;
        li.onclick = (event) => {
            if (!event.target.classList.contains('fa-trash')) {
                openReportDetails(report.reportID);
            }
        };
        reportListElement.appendChild(li);
    });

    document.querySelectorAll('.fa-trash').forEach(button => {
        button.addEventListener('click', (event) => {
            deleteReportFromHistory(event.target.dataset.id, event);
        });
    });
}

function openReportDetails(id) {
    const report = reports.find(r => r.reportID === parseInt(id));
    const reportDetails = JSON.stringify(report);
    window.location.href = `report_detail.html?report=${encodeURIComponent(reportDetails)}`;
}

function deleteReportFromHistory(id, event) {
    event.stopPropagation();
    const token = localStorage.getItem('token');

    fetch(`${BACKEND_URL}/api/reports/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (response.ok) {
            reports = reports.filter(r => r.reportID !== parseInt(id));
            displayReports(reports);
            console.log(`Deleted report with ID: ${id}`);
        } else {
            console.error('Failed to delete report');
        }
    })
    .catch(error => console.error('Error deleting report:', error));
}
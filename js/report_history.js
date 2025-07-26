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

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    document.getElementById('welcome-message').textContent += user.firstName;
    document.getElementById('profile-picture').src = user.img;
  }

  fetchReportsFromBackend();
});

let reports = [];

function fetchReportsFromBackend() {
  const token = localStorage.getItem('token');

  fetch(`${BACKEND_URL}/api/reports/my`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(response => response.json())
    .then(data => {
      reports = data.reports;
      displayReports(reports);
    })
    .catch(error => console.error('Error fetching reports:', error));
}

function displayReports(reportList) {
  const reportListElement = document.getElementById("report-list");
  reportListElement.innerHTML = '';
  reportList.forEach((report) => {
    const li = document.createElement("li");
    li.classList.add("report-item");

    const date = new Date(report.date);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = date.toLocaleDateString();

    li.innerHTML = `
      <img class="report-img" src="${report.image || 'images/default-car.png'}" alt="Car Image">
      <div class="report-info">
        <h4>${report.plate}</h4>
        <p>${report.reason}</p>
        <p><i class="fas fa-map-marker-alt"></i> ${report.location?.street || ''} ${report.location?.number || ''} - ${report.location?.city || ''}</p>
        <p>${dateString} <span>${timeString}</span></p>
      </div>
      <div class="report-status">
        ${report.reason.toLowerCase().includes("child") ? '<i class="fas fa-exclamation-triangle warning"></i>' : '<i class="fas fa-check-circle success"></i>'}
      </div>
    `;
    li.onclick = () => openReportDetails(report._id);
    reportListElement.appendChild(li);
  });
}

function openReportDetails(id) {
  const report = reports.find(r => r._id === id);
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
            reports = reports.filter(r => r._id !== id);
            displayReports(reports);
            console.log(`Deleted report with ID: ${id}`);
        } else {
            console.error('Failed to delete report');
        }
    })
    .catch(error => console.error('Error deleting report:', error));
}
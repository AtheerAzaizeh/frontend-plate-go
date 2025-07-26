document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const reportId = params.get('reportId');
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user) return location.href = 'index.html';

  document.getElementById('welcome-message').textContent += user.firstName;
  document.getElementById('profile-picture').src = user.img;

  if (!reportId) return alert('Report not found');

  fetch(`${BACKEND_URL}/api/reports/${reportId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      if (!data || !data.report) throw new Error('No report found');
      renderReport(data.report);
    })
    .catch(err => console.error(err));

  document.getElementById('contactBtn').addEventListener('click', createOrGoToChat);
});

let currentPlate = '';

function renderReport(report) {
  currentPlate = report.plate;

  document.getElementById('carNumber').textContent = `Car number: ${report.plate}`;
  document.getElementById('reportReason').textContent = `Report reason: ${report.reason}`;
  document.getElementById('reportStatus').textContent = `Status: ${report.status}`;
  document.getElementById('estimatedTime').textContent = `Estimated time: 5 min`; // optional
  document.getElementById('reportDate').textContent = `Date: ${formatDate(report.date)}`;
  document.getElementById('reportTime').textContent = `Time: ${formatTime(report.date)}`;
  document.getElementById('carImage').src = report.image || 'images/default-car.jpg';

  // Map
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    report.location?.street + ' ' + report.location?.city
  )}&z=15&output=embed`;
  document.getElementById('mapFrame').src = mapUrl;
}

function createOrGoToChat() {
  fetch(`${BACKEND_URL}/api/chat/create-or-get`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ plate: currentPlate }) 
  })
    .then(res => res.json())
    .then(data => {
      console.log('Chat response:', data); 
      if (data.chatId) {
        window.location.href = `chat.html?chatId=${data.chatId}`;
      } else {
        alert('Unable to start chat');
      }
    })
    .catch(err => console.error(err));
}


function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB');
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

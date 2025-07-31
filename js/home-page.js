// home-page.js

document.addEventListener('DOMContentLoaded', function () {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  // ✅ Modal message utility
  const showModalMessage = (msg) => {
    const modal = document.getElementById("modal");
    const msgBox = document.getElementById("modal-message");
    msgBox.textContent = msg;
    modal.classList.remove("hidden-r");
  };

  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  const volunteerToggle = document.getElementById('volunteer-updates-switch');
  const statusBadge = document.getElementById('availability-status');

  fetch(`${BACKEND_URL}/api/volunteer/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(response => response.json())
    .then(data => {
      if (data.isVolunteer) {
        volunteerToggle.checked = true;
        if (statusBadge) statusBadge.textContent = '🟢';
        fetchVolunteerUpdates();
      } else {
        volunteerToggle.checked = false;
        if (statusBadge) statusBadge.textContent = '🔴';
      }
    })
    .catch(error => console.error('Error fetching volunteer status:', error));

  volunteerToggle.addEventListener('change', () => {
    const available = volunteerToggle.checked;

    fetch(`${BACKEND_URL}/api/volunteer/update-status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ available })
    })
      .then(res => res.json())
      .then(data => {
        console.log('Availability updated:', data);
        if (statusBadge) statusBadge.textContent = available ? '🟢' : '🔴';
      })
      .catch(err => {
        console.error('Failed to update availability', err);
        showModalMessage('Error updating availability status');
      });
  });

  function fetchVolunteerUpdates() {
    fetch(`${BACKEND_URL}/api/volunteer/updates`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(err.message || 'Unknown error') });
        }
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('Expected array of updates');
        const updatesContainer = document.getElementById('volunteer-updates');

        data.forEach(update => {
          const updateDiv = document.createElement('div');
          updateDiv.classList.add('volunteer-update');
          updateDiv.innerHTML = `
            <span>${update.reason}, ${update.location} ${update.time}</span>
            <button class="info-button">i</button>
          `;
          updatesContainer.appendChild(updateDiv);
        });
      })
      .catch(error => console.error('Error fetching the updates:', error));
  }

  const map = L.map('map').setView([32.09007825320591, 34.80367638400265], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  function locateUser() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(success, error);
    } else {
      showModalMessage('Geolocation is not supported by this browser.');
    }
  }

  function success(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const apiKey = '400d2d81eb784ffeac2632a2082a4615';
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${apiKey}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          const location = data.results[0].formatted;
          const locationBox = document.getElementById('location');
          if (locationBox) locationBox.innerText = location;
          map.setView([lat, lon], 13);
          L.marker([lat, lon]).addTo(map)
            .bindPopup('You are here: ' + location)
            .openPopup();
        } else {
          console.error('No results found for the location');
        }
      })
      .catch(error => console.error('Error fetching the location:', error));
  }

  function error(err) {
    console.error(`ERROR(${err.code}): ${err.message}`);
    showModalMessage('Unable to retrieve your location.');
  }

  locateUser();

  const makeReportButton = document.getElementById('make-report-button');
  makeReportButton.addEventListener('click', () => {
    window.location.href = 'car-finder.html';
  });

  let reportMarkers = [];

  function fetchAndDisplayReportsOnMap() {
    fetch(`${BACKEND_URL}/api/reports/all`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(response => response.json())
      .then(data => {
        reportMarkers.forEach(marker => map.removeLayer(marker));
        reportMarkers = [];
        console.log(data.reports);

        data.reports.forEach(report => {
          if (report.coordinates && report.coordinates.lat && report.coordinates.lng) {
            const { lat, lng } = report.coordinates;

            const popupContent = `
              <strong>Reason:</strong> ${report.reason}<br>
              <strong>Plate:</strong> ${report.plate}<br>
              <strong>Reported By:</strong> ${report.sender?.firstName || 'Unknown'}
            `;

            const marker = L.marker([lat, lng]).addTo(map)
              .bindPopup(popupContent);

            reportMarkers.push(marker);
          }
        });
      })
      .catch(error => {
        console.error('Error loading reports:', error);
      });
  }

  const toggleMapButton = document.getElementById('toggle-map');
  const mapContainer = document.querySelector('.map');
  const makeReportBtn = document.getElementById('make-report-button');

  function activateMapButton() {
    toggleMapButton.classList.add("map-active");
    if (!toggleMapButton.querySelector('.back-arrow')) {
      toggleMapButton.innerHTML = `<span class="back-arrow">&#8592;</span> <i class="fa-solid fa-map"></i> Reports Map`;
    }
  }

  function deactivateMapButton() {
    toggleMapButton.classList.remove("map-active");
    toggleMapButton.innerHTML = `<i class="fa-solid fa-map"></i> Reports Map`;
  }

  toggleMapButton.addEventListener('click', () => {
    mapContainer.classList.toggle('map-fullscreen');
    const isFullscreen = mapContainer.classList.contains('map-fullscreen');

    makeReportBtn.style.display = isFullscreen ? 'none' : 'block';

    if (isFullscreen) {
      activateMapButton();
      fetchAndDisplayReportsOnMap && fetchAndDisplayReportsOnMap();
    } else {
      deactivateMapButton();
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  });

  toggleMapButton.addEventListener('click', function (e) {
    if (toggleMapButton.classList.contains('map-active') && e.target.classList.contains('back-arrow')) {
      mapContainer.classList.remove('map-fullscreen');
      deactivateMapButton();
      makeReportBtn.style.display = 'block';
      setTimeout(() => { map.invalidateSize(); }, 300);
      e.stopPropagation();
    }
  });
});

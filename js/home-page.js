// home-page.js

document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  if (user) {
    document.getElementById('welcome-message').textContent += user.firstName;
    document.getElementById('profile-picture').src = user.img;
    document.getElementById('profile-picture-menu').src = user.img;
    document.getElementById('profile-name').innerText = `${user.firstName} ${user.lastName}`;
    document.getElementById('profile-email').innerText = user.email;
  }

  fetch(`${BACKEND_URL}/api/volunteer/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(response => response.json())
  .then(data => {
    if (data.isVolunteer) {
      fetchVolunteerUpdates();
    }
  })
  .catch(error => console.error('Error fetching volunteer status:', error));

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
      alert('Geolocation is not supported by this browser.');
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
    alert('Unable to retrieve your location.');
  }

  locateUser();

  const makeReportButton = document.getElementById('make-report-button');
  makeReportButton.addEventListener('click', () => {
    window.location.href = 'car-finder.html';
  });

  const menuToggle = document.getElementById('menu-toggle');
  const sideMenu = document.getElementById('side-menu');
  const overlay = document.getElementById('overlay');

  menuToggle.addEventListener('click', () => {
    sideMenu.classList.toggle('open');
    overlay.classList.toggle('show');
    document.body.classList.toggle('menu-open');
  });

  overlay.addEventListener('click', () => {
    sideMenu.classList.remove('open');
    overlay.classList.remove('show');
    document.body.classList.remove('menu-open');
  });

  const volunteerLink = document.getElementById('volunteer-link');
  const volunteerText = document.getElementById('volunteer-text');

  volunteerLink.addEventListener('click', function(event) {
    event.preventDefault();

    fetch(`${BACKEND_URL}/api/volunteer/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to register as volunteer, status: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      volunteerText.textContent = 'I am a Volunteer';
      alert('You are now registered as a volunteer.');
    })
    .catch(error => {
      console.error('Error registering as volunteer:', error);
      alert('Failed to register as volunteer. Please try again later.');
    });
  });

  const availabilityBtn = document.getElementById('availability-toggle-btn');

if (availabilityBtn) {
  availabilityBtn.addEventListener('click', async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/toggle-availability`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await res.json();
      if (res.ok) {
        availabilityBtn.textContent = result.available
          ? '🟢 I’m Available'
          : '🔴 I’m Unavailable';
      } else {
        alert(result.message || 'Error updating availability.');
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
      alert('Something went wrong.');
    }
  });
}


  const logoutButton = document.getElementById('logout');
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
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

toggleMapButton.addEventListener('click', () => {
  const makeReportBtn = document.getElementById('make-report-button');
  mapContainer.classList.toggle('map-fullscreen');
  const isFullscreen = mapContainer.classList.contains('map-fullscreen');

  makeReportBtn.style.display = isFullscreen ? 'none' : 'block';
  toggleMapButton.style.left = isFullscreen ? '100px' : '50%';

  setTimeout(() => {
    map.invalidateSize();
  }, 300);

    if (isFullscreen) {
    fetchAndDisplayReportsOnMap();
  }
});
});

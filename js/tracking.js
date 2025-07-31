// js/tracking.js

document.addEventListener('DOMContentLoaded', () => {
  // 🔑 Get rescueId from URL
  const params   = new URLSearchParams(window.location.search);
  const rescueId = params.get('rescueId');
  if (!rescueId) return alert('No rescueId provided in query string.');

  // 🔑 Load user for role check & profile
  const user     = JSON.parse(localStorage.getItem('user') || '{}');
  const token    = localStorage.getItem('token') || '';
  const picEl    = document.getElementById('profile-picture');
  const welcome  = document.getElementById('welcome-message');
  if (user.firstName) welcome.textContent += ` ${user.firstName}`;
  if (user.img) picEl.src = user.img;

  // 1️⃣ Initialize Leaflet map
  const map = L.map('map', { zoomControl: false }).setView([32.09, 34.80], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // 2️⃣ Markers & icons
  const userIcon = L.icon({ iconUrl: 'images/user-pin.png',    iconSize:[36,36] });
  const volIcon  = L.icon({ iconUrl: 'images/volunteer-pin.png',iconSize:[36,36] });
  const requesterMarker = L.marker([0,0], { icon: userIcon }).addTo(map);
  const volunteerMarker = L.marker([0,0], { icon: volIcon  }).addTo(map);

  // 3️⃣ ETA control
  const etaControl = L.control({ position: 'bottomleft' });
  etaControl.onAdd = () => {
    const div = L.DomUtil.create('div','eta-box');
    div.innerText = 'ETA: calculating…';
    return div;
  };
  etaControl.addTo(map);

  // 4️⃣ Socket.IO setup
  const socket = io(BACKEND_URL, {
    withCredentials: true,
    transports: ['websocket'],
    auth: { token }
  });

  socket.on('connect', () => {
    socket.emit('joinRescue', rescueId);
    console.log('Joined room rescue_' + rescueId);
  });

  // 5️⃣ Listen for live location updates
  socket.on('rescueLocation', ({ lat, lng }) => {
    volunteerMarker.setLatLng([lat, lng]);
    updateETA([lat, lng]);
    // pan map if marker goes out of view
    if (!map.getBounds().contains([lat, lng])) {
      map.panTo([lat, lng], { animate: true, duration: 0.5 });
    }
  });

  // 6️⃣ If current user is volunteer → start sharing location
  if (user.role === 'volunteer' && user.available) {
    navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        socket.emit('rescueLocationUpdate', { rescueId, lat, lng });
        volunteerMarker.setLatLng([lat, lng]);
      },
      err => console.error('Geo error:', err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  }

  // 7️⃣ Fetch initial coords for smoother start
  fetch(`${BACKEND_URL}/api/rescue/${rescueId}/positions`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(({ requester, volunteer }) => {
      if (requester) {
        requesterMarker.setLatLng([requester.lat, requester.lng]);
        map.setView([requester.lat, requester.lng], 13);
      }
      if (volunteer) {
        volunteerMarker.setLatLng([volunteer.lat, volunteer.lng]);
        map.fitBounds(
          L.featureGroup([requesterMarker, volunteerMarker]).getBounds().pad(0.5)
        );
      }
    })
    .catch(() => {
      console.warn('Could not load initial positions');
    });

  // 8️⃣ Compute & display ETA
  function updateETA([vLat, vLng]) {
    const rPos = requesterMarker.getLatLng();
    const distance = map.distance(rPos, [vLat, vLng]); // meters
    const speed = 40 * 1000 / 3600; // 40 km/h → m/s
    const etaMin = Math.max(1, Math.round((distance / speed) / 60));
    const etaDiv = document.querySelector('.eta-box');
    etaDiv.textContent = `ETA: ~${etaMin} min`;
  }

  socket.on('disconnect', () => console.warn('Socket disconnected'));
});

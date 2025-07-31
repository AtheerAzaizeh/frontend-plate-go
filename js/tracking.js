// js/tracking.js

document.addEventListener('DOMContentLoaded', () => {
  // ── 1. Get rescueId & user ───────────────────────────────────────────────
  const params   = new URLSearchParams(window.location.search);
  const rescueId = params.get('rescueId');
  if (!rescueId) return alert('No rescueId provided.');

  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token') || '';
  const picEl = document.getElementById('profile-picture');
  const welEl = document.getElementById('welcome-message');
  if (user.firstName) welEl.textContent += ` ${user.firstName}`;
  if (user.img) picEl.src = user.img;

  // ── 2. Init Leaflet Map ──────────────────────────────────────────────────
  const map = L.map('map', { zoomControl: false }).setView([32.09, 34.80], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // ── 3. Markers ───────────────────────────────────────────────────────────
  const userIcon = L.icon({ iconUrl: 'images/user-pin.png',    iconSize:[36,36] });
  const volIcon  = L.icon({ iconUrl: 'images/volunteer-pin.png',iconSize:[36,36] });
  const requesterMarker = L.marker([0,0], { icon: userIcon }).addTo(map);
  const volunteerMarker = L.marker([0,0], { icon: volIcon  }).addTo(map);

  // ── 4. ETA Control ───────────────────────────────────────────────────────
  const etaControl = L.control({ position: 'bottomleft' });
  etaControl.onAdd = () => {
    const div = L.DomUtil.create('div','eta-box');
    div.innerText = 'ETA: calculating…';
    return div;
  };
  etaControl.addTo(map);

  // ── 5. Routing Control ───────────────────────────────────────────────────
  const routingControl = L.Routing.control({
    waypoints: [
      requesterMarker.getLatLng(),
      volunteerMarker.getLatLng()
    ],
    createMarker: () => null,
    lineOptions: { styles: [{ color: '#3b83bd', weight: 6, opacity:0.8 }] },
    routeWhileDragging: false,
    addWaypoints: false,
    fitSelectedRoute: false,
    showAlternatives: false
  }).addTo(map);

  routingControl.on('routesfound', e => {
    const secs = e.routes[0].summary.totalTime;
    const min  = Math.max(1, Math.round(secs / 60));
    document.querySelector('.eta-box').textContent = `ETA: ~${min} min`;
  });

  // ── 6. Socket.IO ─────────────────────────────────────────────────────────
  const socket = io(BACKEND_URL, {
    withCredentials: true,
    transports: ['websocket'],
    auth: { token }
  });

  socket.on('connect', () => {
    socket.emit('joinRescue', rescueId);
    console.log('Joined rescue_' + rescueId);
  });

  socket.on('rescueLocation', ({ lat, lng }) => {
    // update marker & route
    volunteerMarker.setLatLng([lat, lng]);
    routingControl.setWaypoints([
      requesterMarker.getLatLng(),
      L.latLng(lat, lng)
    ]);
    // pan if off-screen
    if (!map.getBounds().contains([lat, lng])) {
      map.panTo([lat, lng], { animate: true, duration: 0.5 });
    }
  });

  // ── 7. Volunteer: share your position ─────────────────────────────────────
  if (user.role === 'volunteer' && user.available) {
    navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        socket.emit('rescueLocationUpdate', { rescueId, lat, lng });
        volunteerMarker.setLatLng([lat, lng]);
      },
      err => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  }

  // ── 8. Initial positions fetch ────────────────────────────────────────────
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
      }
      // draw initial route & fit
      routingControl.setWaypoints([
        requesterMarker.getLatLng(),
        volunteerMarker.getLatLng()
      ]);
      map.fitBounds(
        L.featureGroup([requesterMarker, volunteerMarker]).getBounds().pad(0.5)
      );
    })
    .catch(() => console.warn('Initial positions not available'));

  socket.on('disconnect', () => console.warn('Socket disconnected'));
});

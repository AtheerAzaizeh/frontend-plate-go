// js/tracking.js
document.addEventListener('DOMContentLoaded', () => {
  const params   = new URLSearchParams(window.location.search);
  const rescueId = params.get('rescueId');
  if (!rescueId) return alert('No rescueId provided.');

  // 1️⃣ Init map
  const map = L.map('map').setView([32.09, 34.80], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // 2️⃣ Markers for both parties
  const requesterMarker = L.marker([0,0], { icon: L.icon({ iconUrl: 'user.png', iconSize:[40,40] }) })
    .addTo(map);
  const volunteerMarker = L.marker([0,0], { icon: L.icon({ iconUrl: 'volunteer.png', iconSize:[40,40] }) })
    .addTo(map);

  // 3️⃣ Socket setup
  const socket = io(BACKEND_URL, { transports:['websocket'] });
  socket.on('connect', () => {
    socket.emit('joinRescue', rescueId);
  });

  // 4️⃣ Listen for live volunteer positions
  socket.on('rescueLocation', ({ lat, lng, timestamp }) => {
    volunteerMarker.setLatLng([lat, lng]);
    // pan only if marker outside bounds
    if (!map.getBounds().contains([lat, lng])) {
      map.panTo([lat, lng]);
    }
    // optional: update ETA text somewhere, e.g. based on distance:
    updateETA([lat, lng]);
  });

  // 5️⃣ If current user *is* the volunteer, start sending positions
  //    You need to know role in localStorage or via API
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.role === 'volunteer' && user.available) {
    navigator.geolocation.watchPosition(pos => {
      socket.emit('rescueLocationUpdate', {
        rescueId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });
      // also show your own marker
      volunteerMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
    }, err => console.error(err), { enableHighAccuracy: true, maximumAge: 3000 });
  }

  // 6️⃣ Helper: estimate ETA via straight-line speed ~40kmh
  function updateETA([lat, lng]) {
    // assume requester at center:
    const center = requesterMarker.getLatLng();
    const dist = map.distance(center, [lat, lng]); // meters
    const speed = 40000/3600; // ≈11.1 m/s (~40 km/h)
    const secs = dist / speed;
    const minutes = Math.round(secs/60);
    // display somewhere—e.g. a control
    if (!map.etaControl) {
      map.etaControl = L.control({position:'bottomleft'});
      map.etaControl.onAdd = () => {
        const div = L.DomUtil.create('div','eta-box');
        div.style = 'background:#fff;padding:6px;border-radius:4px';
        map.etaDiv = div;
        return div;
      };
      map.etaControl.addTo(map);
    }
    map.etaDiv.textContent = `ETA: ~${minutes} min`;
  }

});

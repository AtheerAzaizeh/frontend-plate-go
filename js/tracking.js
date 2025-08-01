document.addEventListener('DOMContentLoaded', () => {
    let initialLat = 0, initialLng = 0;
    if (requester?.lat && requester?.lng) {
      initialLat = requester.lat;
      initialLng = requester.lng;
    }
  const params   = new URLSearchParams(window.location.search);
  const rescueId = params.get('rescueId');
  if (!rescueId) return alert('No rescueId provided.');

  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token') || '';

  // profile
  if (user.firstName)
    document.getElementById('welcome-message').textContent += ` ${user.firstName}`;
  if (user.img)
    document.getElementById('profile-picture').src = user.img;

const map = L.map('map').setView([initialLat, initialLng], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const markers = {};
function updateUserMarker(userId, coords) {
  if (!markers[userId]) {
    markers[userId] = L.marker([coords.lat, coords.lng]).addTo(map);
  } else {
    markers[userId].setLatLng([coords.lat, coords.lng]);
  }
}

async function hashURL(url) {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Usage
    hashURL('https://platego-smi4.onrender.com/api/rescue/abc123')
  .then(console.log); // Outputs SHA-256 hash

  // 2️⃣ markers
  const userIcon = L.icon({ iconUrl:'images/user-pin.png',     iconSize:[36,36] });
  const volIcon  = L.icon({ iconUrl:'images/volunteer-pin.png', iconSize:[36,36] });
  const requesterMarker = L.marker([0,0], { icon:userIcon }).addTo(map);
  const volunteerMarker = L.marker([0,0], { icon:volIcon  }).addTo(map);

  // 3️⃣ ETA box
  const etaControl = L.control({ position:'bottomleft' });
  etaControl.onAdd = () => {
    const d = L.DomUtil.create('div','eta-box');
    d.textContent = 'ETA: calculating…';
    return d;
  };
  etaControl.addTo(map);

  // will hold the routing control once coords are valid
  let routingControl = null;

  // update route whenever we have two valid points
  function updateRoute() {
    const rPos = requesterMarker.getLatLng();
    const vPos = volunteerMarker.getLatLng();
    if (rPos.lat && vPos.lat) {
      if (!routingControl) {
        routingControl = L.Routing.control({
          waypoints: [rPos, vPos],
          createMarker:()=>null,
          lineOptions:{styles:[{color:'#3b83bd',weight:6,opacity:0.8}]},
          addWaypoints:false,fitSelectedRoute:true,routeWhileDragging:false,
          showAlternatives:false
        }).addTo(map);
        routingControl.on('routesfound', e => {
          const secs = e.routes[0].summary.totalTime;
          const mins = Math.max(1, Math.round(secs/60));
          document.querySelector('.eta-box').textContent = `ETA: ~${mins} min`;
        });
      } else {
        routingControl.setWaypoints([rPos, vPos]);
      }
    }
  }

  // 4️⃣ Socket.IO
  const socket = io(BACKEND_URL, {
    withCredentials:true, transports:['websocket'], auth:{token}
  });
  socket.on('connect', () => {
    socket.emit('joinRescue', rescueId);
  });
  socket.on('rescueLocation', ({lat,lng}) => {
    if (lat&&lng) {
      volunteerMarker.setLatLng([lat,lng]);
      updateRoute();
      if (!map.getBounds().contains([lat,lng]))
        map.panTo([lat,lng],{animate:true,duration:0.5});
    }
  });

  // 5️⃣ Volunteer shares
  if (user.role==='volunteer' && user.available) {
    navigator.geolocation.watchPosition(pos=>{
      const lat=pos.coords.latitude, lng=pos.coords.longitude;
      socket.emit('rescueLocationUpdate',{rescueId,lat,lng});
      volunteerMarker.setLatLng([lat,lng]);
      updateRoute();
    },err=>console.error(err),{enableHighAccuracy:true,maximumAge:3000});
  }

  // 6️⃣ Initial fetch
  fetch(`${BACKEND_URL}/api/rescue/${rescueId}/positions`,{
    headers:{Authorization:`Bearer ${token}`}
  })
    .then(r=>r.json())
    .then(({requester,volunteer})=>{
      if (requester?.lat && requester?.lng) {
        requesterMarker.setLatLng([requester.lat,requester.lng]);
        map.setView([requester.lat,requester.lng],13);
      }
      if (volunteer?.lat && volunteer?.lng) {
        volunteerMarker.setLatLng([volunteer.lat,volunteer.lng]);
      }
      updateRoute();
    })
    .catch(()=>console.warn('No initial positions'));
});

document.addEventListener('DOMContentLoaded', async () => {
  const socket = io(BACKEND_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const container = document.getElementById('notification-list');

  // Util: Convert (city, street, number) to full address string
  function buildAddress(loc) {
    if (!loc) return '';
    // Accepts either a string ("Haifa, ...") or object {city, street, number}
    if (typeof loc === 'string') return loc;
    let parts = [];
    if (loc.street) parts.push(loc.street);
    if (loc.number) parts.push(loc.number);
    if (loc.city) parts.push(loc.city);
    return parts.join(', ');
  }

  // Util: Geocode an address string to coordinates using Nominatim
  async function geocodeAddress(address) {
    if (!address) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'en' }
    });
    const results = await response.json();
    if (results && results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon)
      };
    }
    return null;
  }

  // Load notifications
  const res = await fetch(`${BACKEND_URL}/api/notification/my`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const notifications = await res.json();
  container.innerHTML = '';

  const validNotifications = notifications.filter(n => n.rescueId && user?.role === 'volunteer');

  for (const n of notifications) {
    const div = document.createElement('div');
    div.className = 'notification-item';
    const divnotifiybtn = document.createElement('div');
    divnotifiybtn.className = 'notification-btns';
    const messageText = document.createElement('span');
    messageText.textContent = `${n.message} • ${new Date(n.createdAt).toLocaleString()}`;
    div.appendChild(messageText);

    // RESCUE NOTIFICATION
    if (n.rescueId && user?.role === 'volunteer') {
      socket.emit("joinAsVolunteer");
      let isAlreadyTaken = false;
      let rescueData = null;

      try {
        const rescueRes = await fetch(`${BACKEND_URL}/api/rescue/${n.rescueId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (rescueRes.ok) {
          rescueData = await rescueRes.json();
          isAlreadyTaken = rescueData.status !== 'pending';
        } else {
          isAlreadyTaken = true;
        }
      } catch (err) {
        console.warn("Error fetching live rescue status:", err);
        isAlreadyTaken = true;
      }

      const viewButton = document.createElement('button');
      viewButton.textContent = '🔍 View Details';
      viewButton.className = 'view-details-btn';
      viewButton.onclick = () => {
        showModal("🚨 Rescue Details", `
          <strong>Location:</strong> ${buildAddress(rescueData?.location || n.location) || 'Unknown'}<br>
          <strong>Reason:</strong> ${n.reason || rescueData?.reason || 'Not provided'}
        `);
      };

      // --- Navigate Button ---
      const navigateButton = document.createElement('button');
      navigateButton.textContent = '📍 Navigate';
      navigateButton.className = 'navigate-btn';

navigateButton.onclick = async () => {
  try {
    const rescueRes = await fetch(`${BACKEND_URL}/api/rescue/${n.rescueId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (rescueRes.ok) {
      const rescueData = await rescueRes.json();
      if (
        rescueData.coordinates &&
        typeof rescueData.coordinates.lat === 'number' &&
        typeof rescueData.coordinates.lng === 'number'
      ) {
        startLiveNavigation(n.rescueId, rescueData.coordinates.lat, rescueData.coordinates.lng);
      } else {
        showModal("Missing Coordinates", "❌ No GPS location found for this request.");
      }
    } else {
      showModal("Missing Coordinates", "❌ No GPS location found for this request.");
    }
  } catch (err) {
    showModal("Error", "❌ Could not fetch rescue details.");
  }
};


      navigateButton.onclick = () => {
        if (!n.coordinates || !n.coordinates.lat || !n.coordinates.lng) {
          return showModal("Missing Coordinates", "❌ No GPS location found for this request.");
        }
        startLiveNavigation(n.rescueId, n.coordinates.lat, n.coordinates.lng);
      };navigateButton.onclick = () => {
        if (!n.coordinates || !n.coordinates.lat || !n.coordinates.lng) {
          return showModal("Missing Coordinates", "❌ No GPS location found for this request.");
        }
      };

      // --- Accept Button ---
      const acceptButton = document.createElement('button');
      acceptButton.textContent = isAlreadyTaken ? '⛔ Already Taken' : '✅ Accept Rescue';
      acceptButton.className = 'accept-rescue-btn';
      acceptButton.disabled = isAlreadyTaken;
      if (isAlreadyTaken) {
        acceptButton.style.backgroundColor = 'gray';
      }

      acceptButton.onclick = async () => {
        if (acceptButton.disabled) return;
        if (!n.rescueId) {
          return showModal("Missing Rescue ID", "❌ rescueId not found.");
        }
        showConfirmationModal(
          "Confirm Rescue",
          "Are you sure you want to accept this rescue request?",
          async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/rescue/accept/${n.rescueId}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              const result = await response.json();
              if (response.ok) {
                showModal("Accepted", '✅ You accepted the rescue!');
                acceptButton.disabled = true;
                acceptButton.textContent = '⛔ Already Taken';
                acceptButton.style.backgroundColor = 'gray';
                socket.emit("joinRescue", n.rescueId);

                navigator.geolocation.watchPosition(position => {
                  const { latitude, longitude } = position.coords;
                  socket.emit("volunteerLocationUpdate", {
                    rescueId: n.rescueId,
                    lat: latitude,
                    lng: longitude
                  });
                }, error => {
                  console.error("Error tracking location:", error);
                  showModal("❌ Location Error", "Could not track your location.");
                }, {
                  enableHighAccuracy: true,
                  maximumAge: 3000,
                  timeout: 5000
                });

              } else {
                showModal("Failed", result.message || '❌ Rescue already taken');
                acceptButton.disabled = true;
                acceptButton.textContent = '⛔ Already Taken';
                acceptButton.style.backgroundColor = 'gray';
              }
            } catch (err) {
              console.error('Accept rescue error:', err);
              showModal("Error", '❌ Error accepting rescue');
              acceptButton.disabled = true;
              acceptButton.textContent = '⛔ Failed';
              acceptButton.style.backgroundColor = 'gray';
            }
          }
        );
      };

      divnotifiybtn.append(viewButton, navigateButton, acceptButton);
      div.append(divnotifiybtn);
    }

    // MESSAGE/CHAT NOTIFICATION
    else if (n.type === 'message' || n.chatId) {
      const chatButton = document.createElement('button');
      chatButton.textContent = '💬 Open Chat';
      chatButton.className = 'open-chat-btn';
      chatButton.onclick = () => {
        window.location.href = `chat.html?chatId=${n.chatId}`;
      };
      divnotifiybtn.append(chatButton);
      div.append(divnotifiybtn);
    }

    // REPORT NOTIFICATION
    else if (n.type === 'report' || n.reportId || n.message?.includes("New report submitted")) {
      // Optional: Add buttons for report notifications if needed
    }

    container.appendChild(div);
  }

  // Mark all notifications as read
  await fetch(`${BACKEND_URL}/api/notification/mark-read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Real-time rescue notification for volunteers
  if (user?.role === "volunteer") {
    socket.emit("joinAsVolunteer");

    socket.on("newRescueRequest", (data) => {
      showModal("🚨 New Rescue Request", `
        <strong>Location:</strong> ${buildAddress(data.location) || data.location || 'Unknown'}<br>
        <strong>Reason:</strong> ${data.message || 'Not provided'}<br>
        <strong>Time:</strong> ${new Date(data.time).toLocaleString()}
      `);

      const div = document.createElement('div');
      div.className = 'notification-item';
      const messageText = document.createElement('span');
      messageText.textContent = `🚨 ${data.message} • ${new Date(data.time).toLocaleString()}`;
      const viewButton = document.createElement('button');
      viewButton.textContent = '🔍 View Details';
      viewButton.className = 'view-details-btn';
      viewButton.onclick = () => {
        showModal("🚨 Rescue Details", `
          <strong>Location:</strong> ${buildAddress(data.location) || data.location || 'Unknown'}<br>
          <strong>Reason:</strong> ${data.message || 'Not provided'}
        `);
      };
      div.appendChild(messageText);
      div.appendChild(viewButton);
      container.prepend(div);
    });
  }

  // --- MODALS ---
  function showModal(title, message) {
    const modal = document.getElementById('custom-modal');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    titleEl.textContent = title;
    messageEl.innerHTML = message;
    modal.classList.remove('hidden-r');
    const okBtn = document.getElementById('modal-ok');
    okBtn.onclick = () => modal.classList.add('hidden-r');
  }

  function showConfirmationModal(title, message, onConfirm) {
    const modal = document.getElementById('custom-modal');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    const okBtn = document.getElementById('modal-ok');
    titleEl.textContent = title;
    messageEl.innerHTML = message;
    modal.classList.remove('hidden-r');
    okBtn.onclick = () => {
      modal.classList.add('hidden-r');
      onConfirm();
    };
  }
});

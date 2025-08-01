// js/socket-listener.js

document.addEventListener("DOMContentLoaded", () => {

// 3. Keep track of markers by ID
const volunteerMarkers = {};
const userMarkers = {};

// 4. Define your updateUserMarker helper
function updateUserMarker(userId, lat, lng) {
  if (userMarkers[userId]) {
    // just move existing marker
    userMarkers[userId].setLatLng([lat, lng]);
  } else {
    // create a new marker
    const m = L.marker([lat, lng], { icon: userIcon }).addTo(trackMap);
    userMarkers[userId] = m;
  }
}

// 5. (Likewise, if you need one for volunteers)
function updateVolunteerMarker(volId, lat, lng) {
  if (volunteerMarkers[volId]) {
    volunteerMarkers[volId].setLatLng([lat, lng]);
  } else {
    const m = L.marker([lat, lng], { icon: volunteerIcon }).addTo(trackMap);
    volunteerMarkers[volId] = m;
  }
}
  // 1️⃣ Read user & token
  const user  = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  if (!user || !token) {
    console.warn("No user or token — socket listener will not initialize.");
    return;
  }

  // 2️⃣ Connect Socket.IO
  const socket = io(BACKEND_URL, {
    withCredentials: true,
    transports: ["websocket","polling"],
    auth: { token }
  });

  socket.emit('joinRescueRoom', { rescueId: 'abc123', userId: 'user456' });
  // Send location every few seconds
navigator.geolocation.watchPosition((pos) => {
  const coords = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude
  };
  socket.emit('locationUpdate', { rescueId: 'abc123', userId: 'user456', coords });
});

// Receive location updates
socket.on('locationUpdate', ({ userId, coords }) => {
  // Update marker on map
  updateUserMarker(userId, coords);
});
  // 3️⃣ On connect, join rooms
  socket.on("connect", () => {
    console.log("🔗 Socket connected:", socket.id);
    socket.emit("joinUser", user._id || user.id);
    if (user.role === "volunteer" && user.available) {
      socket.emit("joinAsVolunteer");
    }
  });

  socket.on("connect_error", err => {
    console.error("❌ Socket connection error:", err);
  });

  // ─── HELPER: Clickable notification ───────────────────────────────────────────
  function showNotification(message, type, url) {
    playNotificationSoundOnce();
    updateNotificationBadge();

    // Remove existing
    document.querySelectorAll(".global-notification").forEach(n => n.remove());

    const notification = document.createElement("div");
    notification.className = `global-notification ${type}`;
    notification.onclick = () => {
      window.location.href = url;
    };

    const content = document.createElement("div");
    content.className = "notification-content";
    content.innerHTML = message;

    const closeBtn = document.createElement("button");
    closeBtn.className = "notification-close";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = e => {
      e.stopPropagation();
      notification.remove();
    };

    notification.appendChild(content);
    notification.appendChild(closeBtn);
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 7000);
  }

  // ─── HELPER: Throttled sound ──────────────────────────────────────────────────
  let _soundCooldown = false;
  function playNotificationSoundOnce() {
    if (_soundCooldown) return;
    _soundCooldown = true;
    playNotificationSound();
    setTimeout(() => { _soundCooldown = false; }, 1000);
  }

  // ─── SOCKET EVENTS ───────────────────────────────────────────────────────────

  // 4️⃣ Report notifications
  socket.on("newReportNotification", data => {
    console.log("🏷️ newReportNotification:", data);
    const { reportId, plate, message } = data;
    showNotification(
      `📋 New report on your car (${plate}): ${message}`,
      "report"
    );
    saveNotificationToDB(data);
  });

  // 5️⃣ Chat message notifications
  socket.on("newMessageNotification", data => {
    console.log("🏷️ newMessageNotification:", data);
    const { chatId, senderName, message } = data;
    showNotification(
      `💬 New message from ${senderName}: ${message.slice(0,30)}...`,
      "message",
      `/chat.html?chatId=${chatId}`
    );
  });

  // 6️⃣ Rescue accepted (for requesters)
  socket.on("rescueAccepted", data => {
    console.log("🏷️ rescueAccepted:", data);
    const { rescueId, acceptedBy } = data;
    showNotification(
      `🚨 Volunteer accepted your request: ${acceptedBy}`,
      "rescue",
      `/tracking.html?rescueId=${rescueId}`
    );
  });

  // 7️⃣ New rescue requests (for volunteers)
  socket.on("newRescueRequest", data => {
    console.log("🏷️ newRescueRequest:", data);
    const { rescueId, message } = data;
    showNotification(
      `🚨 ${message}`,
      "rescue",
      `/tracking.html?rescueId=${rescueId}`
    );
    saveNotificationToDB(data);
  });

  // ─── SAVE TO DB & BADGE ────────────────────────────────────────────────────────
  function saveNotificationToDB(data) {
    fetch(`${BACKEND_URL}/api/notification/my`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    }).catch(err => console.error("❌ Error saving notification:", err));
  }

  function updateNotificationBadge() {
    const bell = document.querySelector(".ring");
    if (!bell) return;
    let badge = bell.querySelector(".notification-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "notification-badge";
      badge.textContent = "1";
      bell.appendChild(badge);
    } else {
      badge.textContent = String((+badge.textContent || 0) + 1);
    }
  }

  // ─── SOUND ────────────────────────────────────────────────────────────────────
  function playNotificationSound() {
    const paths = ["sounds/alert.mp3","./sounds/alert.mp3","/sounds/alert.mp3"];
    let played = false;
    for (const path of paths) {
      if (played) break;
      const audio = new Audio(path);
      audio.volume = 0.5;
      audio.play().then(() => { played = true; })
                  .catch(() => {/* try next */});
    }
    if (!played) createBeepSound();
  }
  function createBeepSound() {
    try {
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 800; osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.5);
    } catch {}
  }

  // ─── DISCONNECT ──────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log("⚠️ Socket disconnected");
  });
});

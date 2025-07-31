// js/socket-listener.js

document.addEventListener("DOMContentLoaded", () => {
  // 1. Read user & token
  // In your DOMContentLoaded or equivalent
const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  auth: { token: localStorage.getItem('token') }
});

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  console.log("▶️ Logged-in user from localStorage:", user, "token:", token);

  if (!user || !token) {
    console.warn("No user or token found—socket listener will not initialize.");
    return;
  }


  // 3. On connect, join personal room
  socket.on("connect", () => {
    console.log("🔗 Socket connected with id", socket.id);
    const joinId = user._id || user.id;
    console.log("➡️ Emitting joinUser with:", joinId);
    socket.emit("joinUser", joinId);
    if (user.volunteerStatus === "available") {
      console.log("➡️ Emitting joinAsVolunteer");
      socket.emit("joinAsVolunteer");
    }
  });

// 5. Debug: log and display every incoming event payload only
socket.onAny((event, ...args) => {
  // 1️⃣ Log raw data (you still get the event name in console)
  console.log(`🔔 Received event "${event}":`, args);

  // 2️⃣ Play notification sound
  playNotificationSound();
  updateNotificationBadge();
  // 3️⃣ Build payload JSON
  const payload = args.length > 1 ? args : args[0];
  let details;
  try {
    details = JSON.stringify(payload, null, 2);
  } catch {
    details = String(payload);
  }

  // 4️⃣ Create notification element
  const notification = document.createElement("div");
  notification.className = "global-notification notification hide";

  // Content: only the JSON payload in a <pre>
  const content = document.createElement("div");
  content.className = "notification-content";
  content.innerHTML = `<pre>${details}</pre>`;

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "notification-close";
  closeBtn.innerHTML = "×";
  closeBtn.onclick = () => dismiss(notification);

  // Assemble
  notification.appendChild(content);
  notification.appendChild(closeBtn);
  document.body.appendChild(notification);

  // animate in
  requestAnimationFrame(() => {
    notification.classList.replace("hide", "show");
  });

  // auto-dismiss after 8s
  setTimeout(() => dismiss(notification), 8000);

  // helper to slide out & remove
  function dismiss(el) {
    el.classList.replace("show", "hide");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  }
});

  // 6. Rescue accepted by volunteer
  socket.on("rescueAccepted", data => {
    console.log("🏷️  Handling rescueAccepted:", data);
    showGlobalNotification(
      `🚨 Volunteer accepted your request: ${data.acceptedBy}`,
      "rescue"
    );
    playNotificationSound();
    if (
      window.location.pathname.includes("rescue-me.html") &&
      typeof showModal === "function"
    ) {
      showModal(
        "🚨 Good news!",
        `A volunteer is on the way!<br><br>Accepted by: <strong>${data.acceptedBy}</strong>`
      );
    }
  });

// Join volunteers room
if (user?.role === "volunteer" && user.available) {
  socket.emit("joinAsVolunteer");
}

// Listen for new rescues
socket.on("newRescue", (rescue) => {
  // You can:
// 1️⃣ Show a modal/popup
  showModal(
    "🚨 New Rescue Request",
    `Location: ${rescue.location}<br/>Time: ${new Date(rescue.time).toLocaleString()}<br/>
     Reason: ${rescue.reason}<br/>
     Requested by: ${rescue.requestedBy}`
  );

// 2️⃣ Or push it into a list:
//  const list = document.getElementById('rescues-list');
//  const item = document.createElement('li');
//  item.innerHTML = `…`;
//  list.prepend(item);
});

  // 8. New report notification
  socket.on("newReportNotification", data => {
    console.log("🏷️  Handling newReportNotification:", data);
    showGlobalNotification(
      `📋 New report on your car (${data.plate}): ${data.message}`,
      "report"
    );
    playNotificationSound();
    updateNotificationBadge();
    saveNotificationToDB(data.message);
  });

  // 9. New chat message
  socket.on("newMessageNotification", data => {
    console.log("🏷️  Handling newMessageNotification:", data);
    const currentPage = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const currentChatId = urlParams.get("chatId");
    if (currentPage.includes("chat.html") && currentChatId === data.chatId) {
      console.log("👀 In chat view, skipping notification");
      return;
    }
    showGlobalNotification(
      `💬 New message from ${data.senderName}: ${data.message.slice(0, 30)}...`,
      "message"
    );
    playNotificationSound();
    updateNotificationBadge();
  });

  // 10. General info
  socket.on("generalNotification", data => {
    console.log("🏷️  Handling generalNotification:", data);
    showGlobalNotification(data.message, data.type || "info");
    playNotificationSound();
  });

socket.on("new-notification", data => {
  if (data.type === "rescue") {
    console.log("🔍 rescueId:", data.rescueId, "message:", data.message);
  }
  else if (data.type === "report") {
    console.log("🔍 reportId:", data.linkedId, "message:", data.message);
  }
  showGlobalNotification(data.message, data.type);
  playNotificationSound();
  updateNotificationBadge();
});
  // 12. Disconnection
  socket.on("disconnect", () => {
    console.log("⚠️  Global socket disconnected");
  });

  // ─────────────────────────────────────────────────────────────────────
  // Helper functions
  // ─────────────────────────────────────────────────────────────────────

  function showGlobalNotification(message, type = "info") {
    document.querySelectorAll(".global-notification").forEach(n => n.remove());
    const notification = document.createElement("div");
    notification.className = `global-notification ${type}`;
    const content = document.createElement("div");
    content.className = "notification-content";
    content.textContent = message;
    const closeBtn = document.createElement("button");
    closeBtn.className = "notification-close";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = () => notification.remove();
    notification.appendChild(content);
    notification.appendChild(closeBtn);
    document.body.appendChild(notification);
    console.log("🟢 Global notification shown:", message);
    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 5000);
  }

  function playNotificationSound() {
    try {
      const paths = ["sounds/alert.mp3", "./sounds/alert.mp3", "/sounds/alert.mp3"];
      let played = false;
      paths.forEach(path => {
        if (!played) {
          const audio = new Audio(path);
          audio.volume = 0.5;
          audio
            .play()
            .then(() => {
              console.log("🔊 Sound played from:", path);
              played = true;
            })
            .catch(e => {
              console.log("🔇 Failed to play from", path, ":", e.message);
            });
        }
      });
      if (!played) createBeepSound();
    } catch (err) {
      console.error("❌ Error playing sound:", err);
      createBeepSound();
    }
  }

  function createBeepSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      console.log("🔔 Beep created programmatically");
    } catch (err) {
      console.error("❌ Could not create beep:", err);
    }
  }

  function saveNotificationToDB(message) {
    if (!token) return;
    fetch(`${BACKEND_URL}/api/notification/my`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
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
});

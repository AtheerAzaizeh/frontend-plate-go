// js/socket-listener.js

// Assumes you include socket.io-client in your HTML, e.g.
// <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
// And that BACKEND_URL is defined globally before this script.

document.addEventListener("DOMContentLoaded", () => {
  // 1. Read user & token
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  console.log("▶️ Logged-in user from localStorage:", user, "token:", token);

  if (!user || !token) {
    console.warn("No user or token found—socket listener will not initialize.");
    return;
  }

  // 2. Connect socket
  console.log("▶️ Connecting socket to:", BACKEND_URL);
  const socket = io(BACKEND_URL);

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

  // 4. Connection error
  socket.on("connect_error", err => {
    console.error("❌ Socket connection error:", err);
  });

  // 5. Debug: log every incoming event
  socket.onAny((event, ...args) => {
    console.log(`🔔 Received event “${event}”:`, args);
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

  // 7. New rescue request (for volunteers)
  socket.on("newRescueRequest", data => {
    console.log("🏷️  Handling newRescueRequest:", data);
    if (user.volunteerStatus === "available") {
      showGlobalNotification(`🚨 ${data.message}`, "rescue");
      playNotificationSound();
      updateNotificationBadge();
      saveNotificationToDB(data.message);
    }
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

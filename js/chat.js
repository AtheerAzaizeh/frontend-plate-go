document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const urlParams = new URLSearchParams(window.location.search);
  const chatId = urlParams.get("chatId");
  const plate = urlParams.get("plate");
  const BACKEND_URL = window.BACKEND_URL || "https://platego-smi4.onrender.com";

  const io = window.io;

  const plateEl = document.getElementById("plate-number");
  const carImgEl = document.getElementById("car-image");
  const chatMessages = document.getElementById("chat-messages");

  let socket;
  let otherUser = null;

  if (!token || !user) {
    alert("Please login first.");
    window.location.href = "index.html";
    return;
  }

  let currentChatId = chatId;

  try {
    if (plate && !chatId) {
      const chatRes = await fetch(`${BACKEND_URL}/api/chat/create-or-get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plate })
      });

      if (!chatRes.ok) {
        const error = await chatRes.json();
        throw new Error(error.error || "Failed to create chat");
      }

      const chatData = await chatRes.json();
      currentChatId = chatData.chatId;

      const newURL = new URL(window.location.href);
      newURL.searchParams.set("chatId", currentChatId);
      if (!newURL.searchParams.has("plate")) {
        newURL.searchParams.set("plate", plate);
      }
      window.history.replaceState({}, "", newURL.toString());
    }

    if (!currentChatId) throw new Error("No chat ID available");

    const chatRes = await fetch(`${BACKEND_URL}/api/chat/${currentChatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!chatRes.ok) throw new Error("Chat not found");
    const chatData = await chatRes.json();

    const viewerCar = chatData.car.viewerCar;
    const otherCar = chatData.car.otherCar;

    otherUser = chatData.participants.find((p) => p.id !== user._id);

    if (otherUser) {
      if (!otherUser.name && otherUser.firstName) {
        otherUser.name = `${otherUser.firstName} ${otherUser.lastName || ""}`.trim();
      }
    } else {
      console.error("Could not find other user in chat participants");
    }

    plateEl.textContent = otherCar?.plate || "Unknown Plate";
    carImgEl.src = otherCar?.image || "images/default-car.jpg";

    socket = io(BACKEND_URL);
    socket.emit("joinChat", currentChatId);
    socket.emit("joinUser", user._id);

    const msgRes = await fetch(`${BACKEND_URL}/api/message/${currentChatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (msgRes.ok) {
      const messages = await msgRes.json();
      const dateSeperator = chatMessages.querySelector(".date-separator");
      chatMessages.innerHTML = "";
      if (dateSeperator) chatMessages.appendChild(dateSeperator);

      messages.forEach((msg) => {
        appendMessage(msg.text, msg.sender._id === user._id, formatTime(msg.timestamp));
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  } catch (err) {
    console.error("Chat load error:", err);
    alert("Failed to load chat: " + err.message);
    return;
  }

  document.querySelector(".call-btn").addEventListener("click", () => {
    if (!otherUser) {
      alert("Cannot find the other user in this chat");
      return;
    }

    if (!window.callManager?.isReady()) {
      alert("Call system is not ready. Please refresh and try again.");
      return;
    }

    const carPlate = plateEl.textContent || "Unknown";
    try {
      window.callManager.initiateCall(otherUser.id, otherUser.name, carPlate);
    } catch (error) {
      alert("Failed to start call: " + error.message);
    }
  });

  async function sendMessage() {
    const input = document.getElementById("message-input");
    const text = input.value.trim();
    if (!text || !currentChatId) return;
    input.value = "";

    try {
      const res = await fetch(`${BACKEND_URL}/api/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ chatId: currentChatId, text })
      });

      if (!res.ok) throw new Error("Failed to send message");

      showNotification("Message sent!", "success");
    } catch (err) {
      input.value = text;
      showNotification("Failed to send message", "error");
    }
  }

  document.getElementById("send-btn").onclick = sendMessage;

  document.getElementById("message-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  document.addEventListener("keydown", (e) => {
    const container = document.getElementById("chat-messages");
    if (e.code === "PageUp") container.scrollBy(0, -100);
    else if (e.code === "PageDown") container.scrollBy(0, 100);
  });

  socket.on("newMessage", (msg) => {
    appendMessage(msg.text, msg.sender._id === user._id, formatTime(msg.timestamp));
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (msg.sender._id !== user._id) {
      showNotification(`New message: ${msg.text.slice(0, 30)}...`, "info");
      playNotificationSound();
    }
  });

  socket.on("connect", () => console.log("Connected to server"));
  socket.on("disconnect", () => console.log("Disconnected from server"));

  function appendMessage(text, fromMe, time) {
    const container = document.createElement("div");
    container.className = `message-container ${fromMe ? "message-right-container" : "message-left-container"}`;

    const message = document.createElement("div");
    message.className = `message ${fromMe ? "message-right" : "message-left"}`;
    message.textContent = text;

    const timeEl = document.createElement("div");
    timeEl.className = "message-time";
    timeEl.textContent = time;

    container.appendChild(message);
    container.appendChild(timeEl);
    chatMessages.appendChild(container);
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function showNotification(message, type = "info") {
    document.querySelectorAll(".chat-notification").forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className = `chat-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 3000);
  }

  function playNotificationSound() {
    try {
      const paths = ["sounds/alert.mp3", "./sounds/alert.mp3", "/sounds/alert.mp3"];
      let played = false;

      paths.forEach((path) => {
        if (!played) {
          const audio = new Audio(path);
          audio.volume = 0.5;
          audio
            .play()
            .then(() => (played = true))
            .catch(() => {});
        }
      });

      if (!played) createBeepSound();
    } catch {
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
    } catch (err) {
      console.error("Failed to create beep:", err);
    }
  }
});

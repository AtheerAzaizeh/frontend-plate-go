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

  const imagePreview = document.getElementById("image-preview");
  const imageInput = document.getElementById("image-input");

  let socket;
  let otherUser = null;
  let pendingImageBase64 = null;

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

      const chatData = await chatRes.json();
      currentChatId = chatData.chatId;

      const newURL = new URL(window.location.href);
      newURL.searchParams.set("chatId", currentChatId);
      if (!newURL.searchParams.has("plate")) newURL.searchParams.set("plate", plate);
      window.history.replaceState({}, "", newURL.toString());
    }

    const chatRes = await fetch(`${BACKEND_URL}/api/chat/${currentChatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chatData = await chatRes.json();

    const viewerCar = chatData.car.viewerCar;
    const otherCar = chatData.car.otherCar;

    otherUser = chatData.participants.find((p) => p.id !== user._id);
    if (otherUser && !otherUser.name && otherUser.firstName) {
      otherUser.name = `${otherUser.firstName} ${otherUser.lastName || ""}`.trim();
    }

    plateEl.textContent = otherCar?.plate || "Unknown Plate";
    carImgEl.src = otherCar?.image || "images/default-car.jpg";

    socket = io(BACKEND_URL);
    socket.emit("joinChat", currentChatId);
    socket.emit("joinUser", user._id);

    const msgRes = await fetch(`${BACKEND_URL}/api/message/${currentChatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const messages = await msgRes.json();

    chatMessages.innerHTML = "";
    messages.forEach((msg) => {
      appendMessage(msg.text, msg.sender._id === user._id, formatTime(msg.timestamp), msg.image);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;

  } catch (err) {
    console.error("Chat load error:", err);
    alert("Failed to load chat: " + err.message);
    return;
  }

  // Event bindings
  document.querySelector(".call-btn").addEventListener("click", handleCall);
  document.getElementById("send-btn").onclick = () => sendMessage();
  document.getElementById("message-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
  document.getElementById("image-btn").onclick = () => imageInput.click();
  imageInput.addEventListener("change", previewImage);

  socket.on("newMessage", (msg) => {
    appendMessage(msg.text, msg.sender._id === user._id, formatTime(msg.timestamp), msg.image);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (msg.sender._id !== user._id) {
      showNotification(`New message: ${msg.text?.slice(0, 30) || "[Image]"}...`, "info");
      playNotificationSound();
    }
  });

  // ========== FUNCTIONS ==========

  function handleCall() {
    if (!otherUser) return alert("Cannot find the other user in this chat");
    if (!window.callManager?.isReady()) return alert("Call system not ready.");
    const carPlate = plateEl.textContent || "Unknown";
    try {
      window.callManager.initiateCall(otherUser.id, otherUser.name, carPlate);
    } catch (error) {
      alert("Failed to start call: " + error.message);
    }
  }

  function previewImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pendingImageBase64 = reader.result;
      imagePreview.src = pendingImageBase64;
      imagePreview.style.display = "inline-block";
    };
    reader.readAsDataURL(file);
  }

  async function sendMessage() {
    const input = document.getElementById("message-input");
    const text = input.value.trim();
    const image = pendingImageBase64;

    if (!text && !image) return;

    input.value = "";

    try {
      const res = await fetch(`${BACKEND_URL}/api/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: currentChatId,
          text,
          image: image || null
        })
      });

      if (!res.ok) throw new Error("Failed to send message");

      const timestamp = new Date().toISOString();
      socket.emit("messageSent", {
        chatId: currentChatId,
        toUserId: otherUser.id,
        lastMessageText: text || "[Image]",
        timestamp
      });

      appendMessage(text, true, formatTime(timestamp), image);
      showNotification("Message sent!", "success");

      // Reset image preview
      pendingImageBase64 = null;
      imageInput.value = null;
      imagePreview.src = "";
      imagePreview.style.display = "none";

    } catch (err) {
      input.value = text;
      showNotification("Failed to send message", "error");
    }
  }

  function appendMessage(text, fromMe, time, image = null) {
    const container = document.createElement("div");
    container.className = `message-container ${fromMe ? "message-right-container" : "message-left-container"}`;

    const message = document.createElement("div");
    message.className = `message ${fromMe ? "message-right" : "message-left"}`;

    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = "Photo";
      img.className = "chat-image";
      message.appendChild(img);
    }

    if (text) {
      const textEl = document.createElement("div");
      textEl.textContent = text;
      message.appendChild(textEl);
    }

    const timeEl = document.createElement("div");
    timeEl.className = "message-time";
    timeEl.textContent = time;

    container.appendChild(message);
    container.appendChild(timeEl);
    chatMessages.appendChild(container);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
    setTimeout(() => notification.remove(), 3000);
  }

  function playNotificationSound() {
    const paths = ["sounds/alert.mp3", "./sounds/alert.mp3", "/sounds/alert.mp3"];
    let played = false;
    paths.forEach((path) => {
      if (!played) {
        const audio = new Audio(path);
        audio.volume = 0.5;
        audio.play().then(() => (played = true)).catch(() => {});
      }
    });
    if (!played) createBeepSound();
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

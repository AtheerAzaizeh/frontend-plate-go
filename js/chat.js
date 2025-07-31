document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const urlParams = new URLSearchParams(window.location.search);
  const chatId = urlParams.get("chatId");
  const plate = urlParams.get("plate");
  const BACKEND_URL = window.BACKEND_URL || "https://platego-smi4.onrender.com";
  const newMsgSound = new Audio("sounds/alert.mp3");
  const io = window.io;

  const plateEl = document.getElementById("plate-number");
  const carImgEl = document.getElementById("car-image");
  const chatMessages = document.getElementById("chat-messages");
  const imagePreview = document.getElementById("image-preview");
  const previewWrapper = document.getElementById("image-preview-wrapper");
  const removeImageBtn = document.getElementById("remove-image-btn");
  const videoEl = document.getElementById("camera-stream");
  const canvas = document.getElementById("capture-canvas");
  const captureBtn = document.getElementById("capture-btn");
  const recordBtn = document.getElementById("record-voice-btn");
  const stopBtn = document.getElementById("stop-record-btn");
  let mediaRecorder;
  let audioChunks = [];
  // ✅ Modal message utility
  const showModalMessage = (msg) => {
    const modal = document.getElementById("modal");
    const msgBox = document.getElementById("modal-message");
    msgBox.textContent = msg;
    modal.classList.remove("hidden-r");
  };

  let socket;
  let otherUser = null;

  if (!token || !user) {
    showModalMessage("Please login first.");
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

    socket.on("newMessage", (data) => {
      const isFromMe = data.senderId === user._id;
      appendMessage(data.text, isFromMe, formatTime(data.timestamp), data.image);
      if (!isFromMe) newMsgSound.play();
      socket.emit("messageRead", { chatId: currentChatId, userId: user._id });
    });

    if (msgRes.ok) {
      const messages = await msgRes.json();
      const dateSeperator = chatMessages.querySelector(".date-separator");
      chatMessages.innerHTML = "";
      if (dateSeperator) chatMessages.appendChild(dateSeperator);

      messages.forEach((msg) => {
        appendMessage(msg.text, msg.sender._id === user._id, formatTime(msg.timestamp), msg.image , msg.audio);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  } catch (err) {
    console.error("Chat load error:", err);
    showModalMessage("Failed to load chat: " + err.message);
    return;
  }

  document.querySelector(".call-btn").addEventListener("click", () => {
    if (!otherUser) return showModalMessage("Cannot find the other user in this chat");
    if (!window.callManager?.isReady()) return showModalMessage("Call system is not ready. Please refresh and try again.");
    const carPlate = plateEl.textContent || "Unknown";
    try {
      window.callManager.initiateCall(otherUser.id, otherUser.name, carPlate);
    } catch (error) {
      showModalMessage("Failed to start call: " + error.message);
    }
  });

  let typingTimeout;
  document.getElementById("send-btn").onclick = () => sendMessage();
  document.getElementById("message-input").addEventListener("keypress", (e) => {
    socket.emit("typing", { chatId: currentChatId, userId: user._id });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", { chatId: currentChatId, userId: user._id });
    }, 1000);

    if (e.key === "Enter") sendMessage();
  });

  const typingIndicator = document.getElementById("typing-indicator");

  socket.on("typing", ({ userId }) => {
  if (otherUser && otherUser.id === userId) {
    typingIndicator.style.display = "block";
    typingIndicator.textContent = `${otherUser.name} is typing...`;
  }
});

socket.on("stopTyping", ({ userId }) => {
  if (otherUser && otherUser.id === userId) {
    typingIndicator.style.display = "none";
  }
});

const readReceipt = document.getElementById("read-receipt"); 

socket.on("messageRead", ({ chatId, userId }) => {
  if (userId === otherUser?.id && chatId === currentChatId) {
    readReceipt.textContent = "Seen ✔️";
    readReceipt.style.display = "inline";
  }
});

  document.getElementById("image-btn").onclick = async () => {
    previewWrapper.style.display = "none";
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoEl.srcObject = stream;
    videoEl.style.display = "block";
    captureBtn.style.display = "inline-block";
  };

  captureBtn.onclick = () => {
    const ctx = canvas.getContext("2d");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    ctx.drawImage(videoEl, 0, 0);
    const base64Image = canvas.toDataURL("image/png");
    imagePreview.src = base64Image;
    previewWrapper.style.display = "block";
    videoEl.style.display = "none";
    captureBtn.style.display = "none";
    videoEl.srcObject.getTracks().forEach((track) => track.stop());
  };

  removeImageBtn.onclick = () => {
    imagePreview.src = "";
    previewWrapper.style.display = "none";
    document.getElementById("image-input").value = "";
  };

  recordBtn.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;

        const res = await fetch(`${BACKEND_URL}/api/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chatId: currentChatId,
            text: "", // no text
            image: null,
            audio: base64Audio,
          }),
        });

        if (!res.ok) throw new Error("Failed to send audio message");
        const timestamp = new Date().toISOString();
        appendMessage("🎧 Voice message", true, formatTime(timestamp), null, base64Audio);
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorder.start();
    recordBtn.style.display = "none";
    stopBtn.style.display = "inline";
  } catch (err) {
    console.error("Recording error:", err);
  }
};

stopBtn.onclick = () => {
  mediaRecorder.stop();
  stopBtn.style.display = "none";
  recordBtn.style.display = "inline";
};


  async function sendMessage() {
    const input = document.getElementById("message-input");
    const text = input.value.trim();
    const imageBase64 = imagePreview.src?.startsWith("data:image") ? imagePreview.src : null;
    
    if (!text && !imageBase64) return;
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
          image: imageBase64 || null
        })
      });

      if (!res.ok) throw new Error("Failed to send message");

      const timestamp = new Date().toISOString();

      if (socket && otherUser) {
        socket.emit("messageSent", {
          chatId: currentChatId,
          toUserId: otherUser.id,
          lastMessageText: text || "[Image]",
          timestamp
        });
      }

      showNotification("Message sent!", "success");
    } catch (err) {
      input.value = text;
      showNotification("Failed to send message", "error");
    }
  }

  function appendMessage(text, fromMe, time, image = null , audio = null) {
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

    
    if (audio) {
      const audioEl = document.createElement("audio");
      audioEl.controls = true;
      audioEl.src = audio;
      message.appendChild(audioEl);
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
    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 3000);
  }
});

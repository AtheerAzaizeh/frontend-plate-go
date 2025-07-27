document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token")
  const user = JSON.parse(localStorage.getItem("user"))
  const urlParams = new URLSearchParams(window.location.search)
  const chatId = urlParams.get("chatId")
  const plate = urlParams.get("plate")
  const BACKEND_URL = window.BACKEND_URL || "https://platego-smi4.onrender.com" // Declare BACKEND_URL variable

  const io = window.io // Assuming io is available globally, e.g., from socket.io script

  const plateEl = document.getElementById("plate-number")
  const carImgEl = document.getElementById("car-image")
  const chatMessages = document.getElementById("chat-messages")

  let socket // Declare socket variable
  let otherUser = null // Store other user info for calling

  if (!token || !user) {
    alert("Please login first.")
    window.location.href = "index.html"
    return
  }

  let currentChatId = chatId

  try {
    // If we have plate but no chatId, create/get chat first
    if (plate && !chatId) {
      const chatRes = await fetch(`${BACKEND_URL}/api/chat/create-or-get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plate }),
      })

      if (!chatRes.ok) {
        const error = await chatRes.json()
        throw new Error(error.error || "Failed to create chat")
      }

      const chatData = await chatRes.json()
      currentChatId = chatData.chatId

      // Update URL without reload
      const newURL = new URL(window.location.href)
      newURL.searchParams.set("chatId", currentChatId)
      if (!newURL.searchParams.has("plate")) {
        newURL.searchParams.set("plate", plate)
      }
      window.history.replaceState({}, "", newURL.toString())
    }

    if (!currentChatId) {
      throw new Error("No chat ID available")
    }

    // Get chat info and car details
    const chatRes = await fetch(`${BACKEND_URL}/api/chat/${currentChatId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!chatRes.ok) throw new Error("Chat not found")
    const chatData = await chatRes.json()
    const car = chatData.car

    // Find the other user in the chat - Enhanced
    otherUser = chatData.participants.find((p) => p.id !== user._id)

    if (otherUser) {
      console.log("Other user found:", otherUser)
      // Ensure otherUser has the required properties
      if (!otherUser.name && otherUser.firstName) {
        otherUser.name = `${otherUser.firstName} ${otherUser.lastName || ""}`.trim()
      }
    } else {
      console.error("Could not find other user in chat participants")
      console.log("Chat participants:", chatData.participants)
      console.log("Current user ID:", user._id)
    }

    plateEl.textContent = car.plate
    carImgEl.src = car.image || "images/default-car.jpg"

    // Join chat via socket
    socket = io(BACKEND_URL) // Assign socket variable
    socket.emit("joinChat", currentChatId)
    socket.emit("joinUser", user._id) // Join user room for calls

    // Load previous messages
    const msgRes = await fetch(`${BACKEND_URL}/api/message/${currentChatId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (msgRes.ok) {
      const messages = await msgRes.json()

      // Clear existing messages except date separator
      const dateSeperator = chatMessages.querySelector(".date-separator")
      chatMessages.innerHTML = ""
      if (dateSeperator) {
        chatMessages.appendChild(dateSeperator)
      }

      messages.forEach((msg) => {
        appendMessage(msg.text, msg.sender._id === user._id, formatTime(msg.timestamp))
      })
      chatMessages.scrollTop = chatMessages.scrollHeight
    }
  } catch (err) {
    console.error("Chat load error:", err)
    alert("Failed to load chat: " + err.message)
    return
  }

  // Call button functionality - Enhanced with better error handling
  document.querySelector(".call-btn").addEventListener("click", () => {
    console.log("Call button clicked")
    console.log("otherUser:", otherUser)
    console.log("window.callManager:", window.callManager)
    console.log("callManager ready:", window.callManager?.isReady())

    if (!otherUser) {
      console.error("Other user not found in chat")
      alert("Cannot find the other user in this chat")
      return
    }

    if (!window.callManager) {
      console.error("Call manager not initialized")
      alert("Call system is not ready. Please refresh the page.")
      return
    }

    if (!window.callManager.isReady()) {
      console.error("Call manager not ready")
      alert("Call system is still connecting. Please wait a moment and try again.")
      return
    }

    const carPlate = plateEl.textContent || "Unknown"
    console.log("Initiating call to:", otherUser.id, otherUser.name, carPlate)

    try {
      window.callManager.initiateCall(otherUser.id, otherUser.name, carPlate)
    } catch (error) {
      console.error("Error initiating call:", error)
      alert("Failed to start call: " + error.message)
    }
  })

  // Send message function
  async function sendMessage() {
    const input = document.getElementById("message-input")
    const text = input.value.trim()
    if (!text || !currentChatId) return

    input.value = ""

    try {
      const res = await fetch(`${BACKEND_URL}/api/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chatId: currentChatId, text }),
      })

      if (!res.ok) {
        throw new Error("Failed to send message")
      }

      // Show notification for sent message
      showNotification("Message sent!", "success")
    } catch (err) {
      console.error("Send message error:", err)
      // Re-add the message to input if sending failed
      input.value = text
      showNotification("Failed to send message", "error")
    }
  }

  // Event listeners
  document.getElementById("send-btn").onclick = sendMessage

  document.getElementById("message-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage()
    }
  })

  // Handle keyboard navigation
  document.addEventListener("keydown", (e) => {
    const container = document.getElementById("chat-messages")
    if (e.code === "PageUp") {
      container.scrollBy(0, -100)
    } else if (e.code === "PageDown") {
      container.scrollBy(0, 100)
    }
  })

  // Receive new message via socket
  socket.on("newMessage", (msg) => {
    console.log("New message received:", msg)

    appendMessage(msg.text, msg.sender._id === user._id, formatTime(msg.timestamp))
    chatMessages.scrollTop = chatMessages.scrollHeight

    // Show notification for received message (only if not from current user)
    if (msg.sender._id !== user._id) {
      showNotification(`New message: ${msg.text.slice(0, 30)}...`, "info")
      playNotificationSound()
    }
  })

  // Socket connection events
  socket.on("connect", () => {
    console.log("Connected to server")
  })

  socket.on("disconnect", () => {
    console.log("Disconnected from server")
  })

  function appendMessage(text, fromMe, time) {
    const container = document.createElement("div")
    container.className = `message-container ${fromMe ? "message-right-container" : "message-left-container"}`

    const message = document.createElement("div")
    message.className = `message ${fromMe ? "message-right" : "message-left"}`
    message.textContent = text

    const timeEl = document.createElement("div")
    timeEl.className = "message-time"
    timeEl.textContent = time

    container.appendChild(message)
    container.appendChild(timeEl)
    chatMessages.appendChild(container)
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  function showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll(".chat-notification")
    existingNotifications.forEach((notif) => notif.remove())

    const notification = document.createElement("div")
    notification.className = `chat-notification ${type}`
    notification.textContent = message
    document.body.appendChild(notification)

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 3000)

    console.log("Notification shown:", message)
  }

  function playNotificationSound() {
    try {
      // Try multiple sound file paths
      const soundPaths = ["sounds/alert.mp3", "./sounds/alert.mp3", "/sounds/alert.mp3"]

      let soundPlayed = false

      soundPaths.forEach((path) => {
        if (!soundPlayed) {
          const audio = new Audio(path)
          audio.volume = 0.5

          audio
            .play()
            .then(() => {
              console.log("Notification sound played successfully from:", path)
              soundPlayed = true
            })
            .catch((e) => {
              console.log("Could not play sound from", path, ":", e.message)
            })
        }
      })

      // Fallback: create a beep sound programmatically
      if (!soundPlayed) {
        createBeepSound()
      }
    } catch (error) {
      console.error("Error playing notification sound:", error)
      createBeepSound()
    }
  }

  function createBeepSound() {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)

      console.log("Programmatic beep sound created")
    } catch (error) {
      console.error("Could not create beep sound:", error)
    }
  }
})

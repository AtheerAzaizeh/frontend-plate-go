// js/socket-listener.js

const io = window.io // Assuming io is available globally, e.g., from socket.io-client script


document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"))
  const token = localStorage.getItem("token")

  if (!user || !token) return

  // Make BACKEND_URL globally available
  window.BACKEND_URL = BACKEND_URL

  const socket = io(BACKEND_URL)

  // Make socket globally available immediately
  window.globalSocket = socket

  socket.on("connect", () => {
    console.log("Global socket connected")
    // Join as user to receive personal notifications
    socket.emit("joinUser", user._id)

    // Join as volunteer if user is a volunteer
    if (user.volunteerStatus === "available") {
      socket.emit("joinAsVolunteer")
    }
  })

  // Handle rescue request notifications (for volunteers)
  socket.on("newRescueRequest", async (data) => {
    if (user.volunteerStatus === "available") {
      showGlobalNotification(`🚨 ${data.message}`, "rescue")
      playNotificationSound()
      saveNotificationToDB(data.message)
    }
  })

  // Handle new message notifications (for all users)
  socket.on("newMessageNotification", (data) => {
    // Only show notification if not currently in the chat page for this specific chat
    const currentPage = window.location.pathname
    const urlParams = new URLSearchParams(window.location.search)
    const currentChatId = urlParams.get("chatId")

    // Don't show notification if user is currently in this chat
    if (currentPage.includes("chat.html") && currentChatId === data.chatId) {
      return
    }

    showGlobalNotification(`💬 New message from ${data.senderName}: ${data.message.slice(0, 30)}...`, "message")
    playNotificationSound()

    // Update notification badge if exists
    updateNotificationBadge()
  })

  // Handle general notifications
  socket.on("generalNotification", (data) => {
    showGlobalNotification(data.message, data.type || "info")
    playNotificationSound()
  })

  // Socket connection events
  socket.on("disconnect", () => {
    console.log("Global socket disconnected")
  })

  function showGlobalNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll(".global-notification")
    existingNotifications.forEach((notif) => notif.remove())

    const notification = document.createElement("div")
    notification.className = `global-notification ${type}`

    // Create notification content
    const content = document.createElement("div")
    content.className = "notification-content"
    content.textContent = message

    // Create close button
    const closeBtn = document.createElement("button")
    closeBtn.className = "notification-close"
    closeBtn.innerHTML = "×"
    closeBtn.onclick = () => notification.remove()

    notification.appendChild(content)
    notification.appendChild(closeBtn)

    // Add to body
    document.body.appendChild(notification)

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 5000)

    console.log("Global notification shown:", message)
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

  function saveNotificationToDB(message) {
    if (!token) return

    fetch(`${BACKEND_URL}/api/notification/my`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    }).catch((err) => console.error("Error saving notification:", err))
  }

  function updateNotificationBadge() {
    // Update notification bell badge if it exists
    const notificationBell = document.querySelector(".ring")
    if (notificationBell) {
      let badge = notificationBell.querySelector(".notification-badge")
      if (!badge) {
        badge = document.createElement("span")
        badge.className = "notification-badge"
        badge.textContent = "1"
        notificationBell.appendChild(badge)
      } else {
        const currentCount = Number.parseInt(badge.textContent) || 0
        badge.textContent = currentCount + 1
      }
    }
  }

  // Make socket available globally for other scripts
  window.globalSocket = socket
})

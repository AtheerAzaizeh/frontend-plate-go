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
    socket.emit("joinUser", user._id)

    if (user.volunteerStatus === "available") {
      socket.emit("joinAsVolunteer")
    }
  })

  // 🚨 Rescue accepted by volunteer
  socket.on("rescueAccepted", (data) => {
    showGlobalNotification(`🚨 A volunteer accepted your request: ${data.acceptedBy}`, "rescue")
    playNotificationSound()

    if (window.location.pathname.includes("rescue-me.html") && typeof showModal === "function") {
      showModal("🚨 Good news!", `A volunteer is on the way to help you.<br><br>Accepted by: <strong>${data.acceptedBy}</strong>`)
    }
  })

  // 🔔 Rescue request for volunteers
  socket.on("newRescueRequest", async (data) => {
    if (user.volunteerStatus === "available") {
      showGlobalNotification(`🚨 ${data.message}`, "rescue")
      playNotificationSound()
      saveNotificationToDB(data.message)
    }
  })

  // 💬 New chat message
  socket.on("newMessageNotification", (data) => {
    const currentPage = window.location.pathname
    const urlParams = new URLSearchParams(window.location.search)
    const currentChatId = urlParams.get("chatId")

    if (currentPage.includes("chat.html") && currentChatId === data.chatId) return

    showGlobalNotification(`💬 New message from ${data.senderName}: ${data.message.slice(0, 30)}...`, "message")
    playNotificationSound()
    updateNotificationBadge()
  })

  // ℹ️ General info
  socket.on("generalNotification", (data) => {
    showGlobalNotification(data.message, data.type || "info")
    playNotificationSound()
  })

  // 📋 Reports
  socket.on("new-notification", (data) => {
    if (data.type === "report") {
      showGlobalNotification(`📋 ${data.message}`, "report")
      playNotificationSound()
      updateNotificationBadge()
    }
  })

  socket.on("disconnect", () => {
    console.log("Global socket disconnected")
  })

  function showGlobalNotification(message, type = "info") {
    const existingNotifications = document.querySelectorAll(".global-notification")
    existingNotifications.forEach((notif) => notif.remove())

    const notification = document.createElement("div")
    notification.className = `global-notification ${type}`

    const content = document.createElement("div")
    content.className = "notification-content"
    content.textContent = message

    const closeBtn = document.createElement("button")
    closeBtn.className = "notification-close"
    closeBtn.innerHTML = "×"
    closeBtn.onclick = () => notification.remove()

    notification.appendChild(content)
    notification.appendChild(closeBtn)
    document.body.appendChild(notification)

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 5000)

    console.log("Global notification shown:", message)
  }

  function playNotificationSound() {
    try {
      const soundPaths = ["sounds/alert.mp3", "./sounds/alert.mp3", "/sounds/alert.mp3"]
      let soundPlayed = false

      soundPaths.forEach((path) => {
        if (!soundPlayed) {
          const audio = new Audio(path)
          audio.volume = 0.5

          audio.play()
            .then(() => {
              console.log("Notification sound played successfully from:", path)
              soundPlayed = true
            })
            .catch((e) => {
              console.log("Could not play sound from", path, ":", e.message)
            })
        }
      })

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
})

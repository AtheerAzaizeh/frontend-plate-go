document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token")
  const user = JSON.parse(localStorage.getItem("user"))
  const urlParams = new URLSearchParams(window.location.search)
  const chatId = urlParams.get("chatId")
  const plate = urlParams.get("plate")
  const io = window.io // Declare the io variable
  const socket = io(BACKEND_URL)

  const plateEl = document.getElementById("plate-number")
  const carImgEl = document.getElementById("car-image")
  const chatMessages = document.getElementById("chat-messages")

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

    plateEl.textContent = car.plate
    carImgEl.src = car.image || "images/default-car.jpg"

    // Join chat via socket
    socket.emit("joinChat", currentChatId)

    // Load previous messages
    const msgRes = await fetch(`${BACKEND_URL}/api/message/${currentChatId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (msgRes.ok) {
      const messages = await msgRes.json()
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
    } catch (err) {
      console.error("Send message error:", err)
      // Re-add the message to input if sending failed
      input.value = text
      alert("Failed to send message")
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
    appendMessage(msg.text, msg.sender._id === user._id, formatTime(msg.timestamp))
    chatMessages.scrollTop = chatMessages.scrollHeight
  })

  function appendMessage(text, fromMe, time) {
    const div = document.createElement("div")
    div.className = `message ${fromMe ? "message-right" : "message-left"}`
    div.innerHTML = `${text}<div class="message-time">${time}</div>`
    chatMessages.appendChild(div)
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
})

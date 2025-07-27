document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const chatId = new URLSearchParams(window.location.search).get('chatId');
  const socket = io(BACKEND_URL);

  const plateEl = document.getElementById('plate-number');
  const carImgEl = document.getElementById('car-image');
  const chatMessages = document.getElementById('chat-messages');

  if (!chatId || !token || !user) {
    alert("Missing chat info.");
    return;
  }

  try {
    // 1. Get chat info and car
    const chatRes = await fetch(`${BACKEND_URL}/api/chat/${chatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!chatRes.ok) throw new Error("Chat not found");
    const chatData = await chatRes.json();
    const car = chatData.car;

    plateEl.textContent = car.plate;
    carImgEl.src = car.image || 'images/default-car.jpg';

    // 2. Join chat via socket
    socket.emit('joinChat', chatId);

    // 3. Load previous messages
    const msgRes = await fetch(`${BACKEND_URL}/api/message/${chatId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const messages = await msgRes.json();
    messages.forEach(msg => {
      appendMessage(msg.text, msg.sender._id === user._id, formatTime(msg.timestamp));
    });
  } catch (err) {
    console.error("Chat load error:", err);
  }

  // 4. Send message
  document.getElementById('send-btn').onclick = async () => {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    await fetch(`${BACKEND_URL}/api/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ chatId, text })
    });
  };

  // 5. Receive new message
  socket.on('newMessage', (msg) => {
    appendMessage(msg.text, msg.sender._id === user._id, formatTime(msg.timestamp));
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  function appendMessage(text, fromMe, time) {
    const div = document.createElement('div');
    div.className = `message ${fromMe ? 'message-right' : 'message-left'}`;
    div.innerHTML = `${text}<div class="message-time">${time}</div>`;
    chatMessages.appendChild(div);
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
});

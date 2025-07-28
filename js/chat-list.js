document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user) {
    window.location.href = 'index.html';
    return;
  }

  if (user) {
    document.getElementById('welcome-message').textContent += user.firstName;
    document.getElementById('profile-picture').src = user.img;
    document.getElementById('profile-picture-menu').src = user.img;
    document.getElementById('profile-name').innerText = `${user.firstName} ${user.lastName}`;
    document.getElementById('profile-email').innerText = user.email;
  }

  const chatList = document.getElementById('chat-list');

  try {
    const res = await fetch(`${BACKEND_URL}/api/chat/my-chats`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error('Failed to fetch chats');

    const data = await res.json();

    data.forEach(chat => {
      const div = document.createElement('div');
      div.className = 'chat-item';
      div.setAttribute('data-id', chat._id); // 🔁 used for real-time updates

      div.onclick = () => {
        window.location.href = `chat.html?chatId=${chat._id}&plate=${chat.otherCar?.plate || ''}`;
      };

      div.innerHTML = `
        <img class="car-img" src="${chat.otherCar?.image || 'images/default-car.jpg'}" alt="Car">
        <div class="chat-info">
          <div class="chat-plate">${chat.otherCar?.plate || 'Unknown Plate'}</div>
          <div class="chat-user">
            <img class="user-img" src="${chat.otherUser?.img || 'images/default-user.jpg'}" alt="User">
            <span class="user-name">${chat.otherUser?.firstName || 'Unknown'} ${chat.otherUser?.lastName || ''}</span>
          </div>
          <div class="last-message-row">
            <span class="last-message">${chat.lastMessageText || '[Image]'}</span>
            <span class="last-time">${chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>
        </div>
      `;

      chatList.appendChild(div);
    });

  } catch (err) {
    console.error('Failed to load chats:', err);
    chatList.innerHTML = '<p style="text-align:center; color:red;">Failed to load chats.</p>';
  }

  // ✅ Socket.IO real-time updates
  const socket = io(BACKEND_URL);
  socket.emit("joinUser", user._id);

  socket.on("chatListUpdate", ({ chatId, lastMessageText, timestamp }) => {
    const item = document.querySelector(`.chat-item[data-id="${chatId}"]`);
    if (!item) return;

    const preview = item.querySelector(".last-message");
    const time = item.querySelector(".last-time");

    if (preview) preview.textContent = lastMessageText;
    if (time) {
      const t = new Date(timestamp);
      time.textContent = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    chatList.prepend(item);
  });
});

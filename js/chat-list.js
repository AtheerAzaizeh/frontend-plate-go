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
    </div>
  `;

  chatList.appendChild(div);
});


  } catch (err) {
    console.error('Failed to load chats:', err);
    chatList.innerHTML = '<p style="text-align:center; color:red;">Failed to load chats.</p>';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const chatId = params.get('chatId');
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  console.log('chatId:', chatId);
console.log('token:', token);
console.log('user:', user);

  if (!chatId) {
  alert('Missing chatId in URL');
  return window.location.href = 'index.html';
}

if (!token) {
  alert('You are not logged in');
  return window.location.href = 'index.html';
}

if (!user || !user._id) {
  alert('User data is corrupted. Please login again.');
  return window.location.href = 'index.html';
}


  loadMessages(chatId, token, user._id);

  document.getElementById('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(chatId, token, user._id);
  });
});

function loadMessages(chatId, token, currentUserId) {
  fetch(`${BACKEND_URL}/api/chat/${chatId}/messages`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('chat-messages');
      list.innerHTML = '';
      data.messages.forEach(msg => {
        const li = document.createElement('li');
        li.className = msg.sender._id === currentUserId ? 'message-sent' : 'message-received';
        li.textContent = msg.message;
        list.appendChild(li);
      });
      scrollToBottom();
    })
    .catch(err => console.error('Error loading messages:', err));
}

function sendMessage(chatId, token, currentUserId) {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if (!message) return;

  fetch(`${BACKEND_URL}/api/chat/${chatId}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  })
    .then(res => res.json())
    .then(msg => {
      const li = document.createElement('li');
      li.className = 'message-sent';
      li.textContent = msg.message;
      document.getElementById('chat-messages').appendChild(li);
      input.value = '';
      scrollToBottom();
    })
    .catch(err => console.error('Error sending message:', err));
}

function scrollToBottom() {
  const list = document.getElementById('chat-messages');
  list.scrollTop = list.scrollHeight;
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BACKEND_URL}/api/notification/my`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const notifications = await res.json();
  const container = document.getElementById('notification-list');
  container.innerHTML = '';

  notifications.forEach(n => {
    const div = document.createElement('div');
div.className = 'notification-item';

const messageText = document.createElement('span');
messageText.textContent = `${n.message} • ${new Date(n.createdAt).toLocaleString()}`;

const viewButton = document.createElement('button');
viewButton.textContent = '🔍 View Details';
viewButton.className = 'view-details-btn';
viewButton.onclick = () => {
  alert(`🚨 Rescue Details\n\nLocation: ${n.location || 'Unknown'}\nReason: ${n.reason || 'Not provided'}`);
  
};

div.appendChild(messageText);
div.appendChild(viewButton);
container.appendChild(div);

  });

  // Mark all notifications as read when the user views them
  await fetch(`${BACKEND_URL}/api/notification/mark-read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
});

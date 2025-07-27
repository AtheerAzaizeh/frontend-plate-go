document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BACKEND_URL}/api/notifications/my`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const notifications = await res.json();
  const container = document.getElementById('notifications-container');
  container.innerHTML = '';

  notifications.forEach(n => {
    const div = document.createElement('div');
    div.className = 'notification-item';
    div.textContent = `${n.message} • ${new Date(n.createdAt).toLocaleString()}`;
    container.appendChild(div);
  });
});

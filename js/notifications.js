document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const container = document.getElementById('notification-list');

  // 1. Fetch current user’s notifications
  let notifications = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/notification/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    notifications = await res.json();
  } catch (err) {
    console.error('Failed to load notifications:', err);
    container.innerHTML = '<p class="error">Unable to load notifications.</p>';
    return;
  }

  // 2. Only keep “report”-type notifications
  const reportNotifications = notifications.filter(n => n.type === 'report');

  // 3. Render each report notification
  container.innerHTML = '';
  for (const n of reportNotifications) {
    const {
      sender,
      carPlate   = 'your car',
      reason     = 'No reason provided',
      location   = 'Unknown location',
      createdAt
    } = n;

    const reporterName = sender?.firstName || 'Someone';
    const timeString   = createdAt
      ? new Date(createdAt).toLocaleString()
      : 'Unknown time';

    // Root item
    const item = document.createElement('div');
    item.className = 'notification-item';

    // Message text
    const messageText = document.createElement('span');
    messageText.textContent =
      `📝 ${reporterName} reported your ${carPlate} — Reason: ${reason} — Time: ${timeString} — Location: ${location}`;
    item.appendChild(messageText);

    // Buttons container
    const btns = document.createElement('div');
    btns.className = 'notification-btns';

    // “View Report” button
    const viewBtn = document.createElement('button');
    viewBtn.className = 'view-details-btn';
    viewBtn.textContent = '🔍 View Report';
    viewBtn.addEventListener('click', () => {
      showModal(
        '🚨 Report Details',
        `<strong>Location:</strong> ${location}<br>` +
        `<strong>Reason:</strong> ${reason}`
      );
    });
    btns.appendChild(viewBtn);

    item.appendChild(btns);
    container.appendChild(item);
  }

  // 4. Mark all notifications as read
  try {
    await fetch(`${BACKEND_URL}/api/notification/mark-read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.warn('Could not mark notifications read:', err);
  }

  // 5. Real-time rescue alerts for volunteers
  const socket = window.io(BACKEND_URL);
  if (user?.role === 'volunteer') {
    socket.emit('joinAsVolunteer');
    socket.on('newRescueRequest', data => {
      // show popup
      showModal(
        '🚨 New Rescue Request',
        `<strong>Location:</strong> ${data.location}<br>` +
        `<strong>Reason:</strong> ${data.message}<br>` +
        `<strong>Time:</strong> ${new Date(data.time).toLocaleString()}`
      );

      // prepend to list
      const div = document.createElement('div');
      div.className = 'notification-item';
      const text = document.createElement('span');
      text.textContent = `🚨 ${data.message} • ${new Date(data.time).toLocaleString()}`;

      const view = document.createElement('button');
      view.className = 'view-details-btn';
      view.textContent = '🔍 View Details';
      view.addEventListener('click', () => {
        showModal(
          '🚨 Rescue Details',
          `<strong>Location:</strong> ${data.location}<br>` +
          `<strong>Reason:</strong> ${data.message}`
        );
      });

      div.append(text, view);
      container.prepend(div);
    });
  }

  // Helper: generic modal
  function showModal(title, html) {
    const modal      = document.getElementById('custom-modal');
    const titleEl    = modal.querySelector('#modal-title');
    const messageEl  = modal.querySelector('#modal-message');
    const okBtn      = modal.querySelector('#modal-ok');

    titleEl.textContent   = title;
    messageEl.innerHTML    = html;
    modal.classList.remove('hidden-r');

    okBtn.onclick = () => {
      modal.classList.add('hidden-r');
    };
  }
  function showConfirmationModal(title, message, onConfirm) {
    const modal = document.getElementById('custom-modal');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    const okBtn = document.getElementById('modal-ok');

    titleEl.textContent = title;
    messageEl.innerHTML = message;

    modal.classList.remove('hidden-r');

    okBtn.onclick = () => {
      modal.classList.add('hidden-r');
      onConfirm();
    };
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const container = document.getElementById('notification-list');

  const res = await fetch(`${BACKEND_URL}/api/notification/my`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const notifications = await res.json();
  container.innerHTML = '';

  const validNotifications = notifications.filter(n => n.rescueId && user?.role === 'volunteer');

  notifications.forEach(n => {
    const div = document.createElement('div');
    div.className = 'notification-item';
    console.log("🔍 rescueId:", n.rescueId, "message:", n.message);

    const messageText = document.createElement('span');
    messageText.textContent = `${n.message} • ${new Date(n.createdAt).toLocaleString()}`;

    const viewButton = document.createElement('button');
    viewButton.textContent = '🔍 View Details';
    viewButton.className = 'view-details-btn';
    viewButton.onclick = () => {
      alert(`🚨 Rescue Details\n\nLocation: ${n.location || 'Unknown'}\nReason: ${n.reason || 'Not provided'}`);
    };

    const navigateButton = document.createElement('button');
    navigateButton.textContent = '🧭 Navigate';
    navigateButton.className = 'navigate-btn';
    navigateButton.onclick = () => {
      if (!n.location) {
        alert("❌ No location provided for this rescue.");
        return;
      }
      const query = encodeURIComponent(n.location);
      const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
      window.open(url, '_blank');
    };

    div.appendChild(messageText);
    div.appendChild(viewButton);
    div.appendChild(navigateButton);

    // ✅ Accept Rescue Button (volunteer only + must have rescueId)
    if (user?.role === 'volunteer' && n.rescueId) {
      const acceptButton = document.createElement('button');
      acceptButton.textContent = '✅ Accept Rescue';
      acceptButton.className = 'accept-rescue-btn';

      if (!n.rescueId || n.status !== 'pending') {
        acceptButton.disabled = true;
        acceptButton.textContent = '⛔ Already Taken';
        acceptButton.style.backgroundColor = 'gray';
      }

      acceptButton.onclick = async () => {
        if (!n.rescueId || n.rescueId === "undefined") {
          alert("❌ Cannot accept this rescue — missing rescueId.");
          console.warn("Bad notification object:", n);
          return;
        }

        const confirmAccept = confirm('Are you sure you want to accept this rescue request?');
        if (!confirmAccept) return;

        try {
          const response = await fetch(`${BACKEND_URL}/api/rescue/accept/${n.rescueId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const result = await response.json();
          if (response.ok) {
            alert('✅ You accepted the rescue!');
            location.reload();
          } else {
            alert(result.message || 'Failed to accept rescue');
          }
        } catch (err) {
          console.error('Accept rescue error:', err);
          alert('Error accepting rescue');
        }
      };

      div.appendChild(acceptButton);
    }

    container.appendChild(div);
    console.log("Notification:", n);
  });

  // Mark all notifications as read
  await fetch(`${BACKEND_URL}/api/notification/mark-read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Socket.io setup
  const socket = window.io(BACKEND_URL);

  if (user?.role === "volunteer") {
    socket.emit("joinAsVolunteer");

    socket.on("newRescueRequest", (data) => {
      alert(`🚨 New Rescue Request!\n\nLocation: ${data.location}\nReason: ${data.message}\nTime: ${new Date(data.time).toLocaleString()}`);

      const div = document.createElement('div');
      div.className = 'notification-item';

      const messageText = document.createElement('span');
      messageText.textContent = `🚨 ${data.message} • ${new Date(data.time).toLocaleString()}`;

      const viewButton = document.createElement('button');
      viewButton.textContent = '🔍 View Details';
      viewButton.className = 'view-details-btn';
      viewButton.onclick = () => {
        alert(`🚨 Rescue Details\n\nLocation: ${data.location || 'Unknown'}\nReason: ${data.message || 'Not provided'}`);
      };

      div.appendChild(messageText);
      div.appendChild(viewButton);

      container.prepend(div);
    });
  }
});

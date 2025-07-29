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

  for (const n of notifications) {
    const div = document.createElement('div');
    div.className = 'notification-item';
    console.log("🔍 rescueId:", n.rescueId, "message:", n.message);

    const messageText = document.createElement('span');
    messageText.textContent = `${n.message} • ${new Date(n.createdAt).toLocaleString()}`;
    div.appendChild(messageText);

    // 🚨 RESCUE notification
    if (n.rescueId && user?.role === 'volunteer') {
      let isAlreadyTaken = false;

      try {
        const rescueRes = await fetch(`${BACKEND_URL}/api/rescue/${n.rescueId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (rescueRes.ok) {
          const rescueData = await rescueRes.json();
          isAlreadyTaken = rescueData.status !== 'pending';
        } else {
          isAlreadyTaken = true;
        }
      } catch (err) {
        console.warn("Error fetching live rescue status:", err);
        isAlreadyTaken = true;
      }

      const viewButton = document.createElement('button');
      viewButton.textContent = '🔍 View Details';
      viewButton.className = 'view-details-btn';
      viewButton.onclick = () => {
        alert(`🚨 Rescue Details\n\nLocation: ${n.location || 'Unknown'}\nReason: ${n.reason || 'Not provided'}`);
      };

      const navigateButton = document.createElement('button');
      navigateButton.textContent = '📍 Navigate';
      navigateButton.className = 'navigate-btn';
      navigateButton.onclick = () => {
        if (!n.location) return alert("❌ No location provided.");
        const query = encodeURIComponent(n.location);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
      };

      const acceptButton = document.createElement('button');
      acceptButton.textContent = isAlreadyTaken ? '⛔ Already Taken' : '✅ Accept Rescue';
      acceptButton.className = 'accept-rescue-btn';
      acceptButton.disabled = isAlreadyTaken;
      if (isAlreadyTaken) {
        acceptButton.style.backgroundColor = 'gray';
      }

      acceptButton.onclick = async () => {
        if (acceptButton.disabled) return;

        if (!n.rescueId) {
          alert("❌ Missing rescueId.");
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
            acceptButton.disabled = true;
            acceptButton.textContent = '⛔ Already Taken';
            acceptButton.style.backgroundColor = 'gray';
          } else {
            alert(result.message || '❌ Rescue already taken');
            acceptButton.disabled = true;
            acceptButton.textContent = '⛔ Already Taken';
            acceptButton.style.backgroundColor = 'gray';
          }
        } catch (err) {
          console.error('Accept rescue error:', err);
          alert('❌ Error accepting rescue');
          acceptButton.disabled = true;
          acceptButton.textContent = '⛔ Failed';
          acceptButton.style.backgroundColor = 'gray';
        }
      };

      div.append(viewButton, navigateButton, acceptButton);
    }

    // 💬 MESSAGE notification
    else if (n.type === 'message' || n.chatId) {
      const chatButton = document.createElement('button');
      chatButton.textContent = '💬 Open Chat';
      chatButton.className = 'open-chat-btn';
      chatButton.onclick = () => {
        const chatUrl = `chat.html?chatId=${n.chatId}`;
        window.location.href = chatUrl;
      };
      div.appendChild(chatButton);
    }

    // 🛑 REPORT notification
    else if (n.type === 'report' || n.reportId || n.message?.includes("New report submitted")) {
      console.log("Report notification — buttons skipped.");
    }

    container.appendChild(div);
  }

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

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
    const divnotifiybtn = document.createElement('div');
    divnotifiybtn.className = 'notification-btns';
    const messageText = document.createElement('span');
    messageText.textContent = `${n.message} • ${new Date(n.createdAt).toLocaleString()}`;
    div.appendChild(messageText);

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
        showModal("🚨 Rescue Details", `
          <strong>Location:</strong> ${n.location || 'Unknown'}<br>
          <strong>Reason:</strong> ${n.reason || 'Not provided'}
        `);
      };

      const navigateButton = document.createElement('button');
      navigateButton.textContent = '📍 Navigate';
      navigateButton.className = 'navigate-btn';
      navigateButton.onclick = () => {
        if (!n.location) return showModal("Missing Location", "❌ No location provided.");
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
          return showModal("Missing Rescue ID", "❌ rescueId not found.");
        }

        showConfirmationModal(
          "Confirm Rescue",
          "Are you sure you want to accept this rescue request?",
          async () => {
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
                showModal("Accepted", '✅ You accepted the rescue!');
                acceptButton.disabled = true;
                acceptButton.textContent = '⛔ Already Taken';
                acceptButton.style.backgroundColor = 'gray';

                if (result.chatId) {
                  window.location.href = `chat.html?chatId=${result.chatId}`;
                }
              } else {
                showModal("Failed", result.message || '❌ Rescue already taken');
                acceptButton.disabled = true;
                acceptButton.textContent = '⛔ Already Taken';
                acceptButton.style.backgroundColor = 'gray';
              }
            } catch (err) {
              console.error('Accept rescue error:', err);
              showModal("Error", '❌ Error accepting rescue');
              acceptButton.disabled = true;
              acceptButton.textContent = '⛔ Failed';
              acceptButton.style.backgroundColor = 'gray';
            }
          }
        );
      };

      divnotifiybtn.append(viewButton, navigateButton, acceptButton);
      div.append(divnotifiybtn);
    }

    else if (n.type === 'message' || n.chatId) {
      const chatButton = document.createElement('button');
      chatButton.textContent = '💬 Open Chat';
      chatButton.className = 'open-chat-btn';
      chatButton.onclick = () => {
        window.location.href = `chat.html?chatId=${n.chatId}`;
      };
      divnotifiybtn.append(chatButton);
      div.append(divnotifiybtn);
    }

    else if (n.type === 'report' || n.reportId || n.message?.includes("New report submitted")) {
      console.log("Report notification — buttons skipped.");
    }

    container.appendChild(div);
  }

  await fetch(`${BACKEND_URL}/api/notification/mark-read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

const socket = io(BACKEND_URL, {
  withCredentials: true,
  transports: ['websocket','polling']
});

  if (user?.role === "volunteer") {
    socket.emit("joinAsVolunteer");

    socket.on("newRescueRequest", (data) => {
      showModal("🚨 New Rescue Request", `
        <strong>Location:</strong> ${data.location}<br>
        <strong>Reason:</strong> ${data.message}<br>
        <strong>Time:</strong> ${new Date(data.time).toLocaleString()}
      `);

      const div = document.createElement('div');
      div.className = 'notification-item';

      const messageText = document.createElement('span');
      messageText.textContent = `🚨 ${data.message} • ${new Date(data.time).toLocaleString()}`;

      const viewButton = document.createElement('button');
      viewButton.textContent = '🔍 View Details';
      viewButton.className = 'view-details-btn';
      viewButton.onclick = () => {
        showModal("🚨 Rescue Details", `
          <strong>Location:</strong> ${data.location || 'Unknown'}<br>
          <strong>Reason:</strong> ${data.message || 'Not provided'}
        `);
      };

      div.appendChild(messageText);
      div.appendChild(viewButton);
      container.prepend(div);
    });
  }

  function showModal(title, message) {
    const modal = document.getElementById('custom-modal');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');

    titleEl.textContent = title;
    messageEl.innerHTML = message;

    modal.classList.remove('hidden-r');

    const okBtn = document.getElementById('modal-ok');
    okBtn.onclick = () => modal.classList.add('hidden-r');
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

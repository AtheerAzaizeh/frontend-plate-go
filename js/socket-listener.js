// js/socket-listener.js

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.volunteerStatus !== 'available') return;

    const socket = io(BACKEND_URL);

    socket.emit('joinAsVolunteer');

    socket.on('newRescueRequest', async (data) => {
        showRescueNotification(data.message, data.location);
        saveNotificationToDB(data.message);
    });

    function showRescueNotification(message, location) {
        const div = document.createElement('div');
        div.classList.add('rescue-notification');
        div.innerHTML = `
            <strong>🚨 ${message}</strong><br/>
            <span>📍 ${location}</span>
            <audio autoplay>
              <source src="sounds/alert.mp3" type="audio/mpeg" />
            </audio>
        `;
        document.body.appendChild(div);

        setTimeout(() => div.remove(), 10000);
    }

    function saveNotificationToDB(message) {
        const token = localStorage.getItem('token');
        if (!token) return;

        fetch(`${BACKEND_URL}/api/notification/my`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        }).catch(err => console.error('Error saving notification:', err));
    }
});

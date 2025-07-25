// js/notifications.js

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }

    const welcomeMessage = document.getElementById('welcome-message');
    const profilePicture = document.getElementById('profile-picture');

    if (user.firstName) {
        welcomeMessage.textContent += user.firstName;
    }

    if (user.img) {
        profilePicture.src = user.img;
    }

    fetchNotifications();
});

function fetchNotifications() {
    const token = localStorage.getItem('token');

    fetch(`${BACKEND_URL}/api/notification/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const list = document.getElementById('notifications-list');

        if (!Array.isArray(data.notifications)) {
            console.error('Invalid notifications format:', data);
            return;
        }

        data.notifications.forEach(notification => {
            const item = document.createElement('div');
            item.classList.add('notification-item');

            const text = document.createElement('p');
            text.innerHTML = `<strong>📢 ${notification.message}</strong><br/><span>${new Date(notification.createdAt).toLocaleString()}</span>`;

            const viewButton = document.createElement('button');
            viewButton.textContent = 'View';
            viewButton.classList.add('view-btn');
viewButton.addEventListener('click', () => {
  document.querySelector('.notification-modal').classList.remove('hidden');

  document.getElementById('modal-plate').textContent = notification.carPlate || 'Unknown';
  document.getElementById('modal-reason').textContent = notification.reason || 'N/A';
  document.getElementById('modal-car-image').src = notification.carImage || 'images/default-car.png';

  document.getElementById('approve-btn').onclick = () => {
    const selectedTime = document.getElementById('modal-time').value;
    alert(`Approved with ${selectedTime} min.`);
    document.querySelector('.notification-modal').classList.add('hidden');
  };

  document.getElementById('ignore-btn').onclick = () => {
    document.querySelector('.notification-modal').classList.add('hidden');
  };
});


            item.appendChild(text);
            item.appendChild(viewButton);
            list.appendChild(item);
        });
    })
    .catch(err => console.error('Error loading notifications:', err));
}

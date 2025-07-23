document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        const welcomeMessage = document.getElementById('welcome-message');
        const profilePicture = document.getElementById('profile-picture');

        welcomeMessage.textContent += user.firstName;
        profilePicture.src = user.img;
    }

    document.querySelector('.find-car-button').addEventListener('click', findCar);
    document.querySelector('.report-history-button').addEventListener('click', function() {
        window.location.href = 'report_history.html';
    });
});

function findCar() {
    const plateInput = document.getElementById('plate-input').value.trim();
    const token = localStorage.getItem('token');

    fetch(`${BACKEND_URL}/api/cars/${plateInput}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(car => {
        window.location.href = `car-details.html?plate=${plateInput}`;
    })
    .catch(error => {
        console.error('Error fetching car:', error);
        alert('Car not found!');
    });
}

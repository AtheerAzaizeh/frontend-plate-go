document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    if (user) {
        const welcomeMessage = document.getElementById('welcome-message');
        const profilePicture = document.getElementById('profile-picture');
        document.getElementById('profile-picture-menu').src = user.img;
        document.getElementById('profile-name').innerText = `${user.firstName} ${user.lastName}`;
        document.getElementById('profile-email').innerText = user.email;

        welcomeMessage.textContent += user.firstName;
        profilePicture.src = user.img;

        
    }

   

    fetchVolunteerUpdates();

    function fetchVolunteerUpdates() {
        fetch(`${BACKEND_URL}/api/volunteerUpdates`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => {
            const updatesContainer = document.getElementById('volunteer-updates');
            updatesContainer.innerHTML = ''; 

            data.forEach(update => {
                const updateDiv = document.createElement('div');
                updateDiv.classList.add('volunteer-update');

                updateDiv.innerHTML = `
                    <span>${update.issue}, ${update.location} ${update.date}</span>
                    <button class="info-button">i</button>
                `;

                updatesContainer.appendChild(updateDiv);
            });
        })
        .catch(error => console.error('Error fetching the updates:', error));
    }

    var map = L.map('map').setView([32.09007825320591, 34.80367638400265], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    function locateUser() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(success, error);
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    function success(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        console.log(`Latitude: ${lat}, Longitude: ${lon}`); 

        const apiKey = '4086e24eac344b50b80b7e6f0b357f6d';
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${apiKey}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.results && data.results.length > 0) {
                    const location = data.results[0].formatted;
                    document.getElementById('location').innerText = location;

                    map.setView([lat, lon], 13);
                    L.marker([lat, lon]).addTo(map)
                        .bindPopup('You are here: ' + location)
                        .openPopup();
                } else {
                    console.error('No results found for the location');
                }
            })
            .catch(error => console.error('Error fetching the location:', error));
    }

    function error(err) {
        console.error(`ERROR(${err.code}): ${err.message}`);
        alert('Unable to retrieve your location.');
    }

    locateUser();

    const makeReportButton = document.getElementById('make-report-button');
    makeReportButton.addEventListener('click', () => {
        window.location.href = 'car-finder.html';
    });

    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('overlay');

    menuToggle.addEventListener('click', () => {
        sideMenu.classList.toggle('open');
        overlay.classList.toggle('show');
        document.body.classList.toggle('menu-open');
    });

    overlay.addEventListener('click', () => {
        sideMenu.classList.remove('open');
        overlay.classList.remove('show');
        document.body.classList.remove('menu-open');
    });

    const volunteerLink = document.getElementById('volunteer-link');
    const volunteerText = document.getElementById('volunteer-text');

    fetch(`${BACKEND_URL}/api/volunteer/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        if (data.isVolunteer) {
            volunteerText.textContent = 'I am a Volunteer';
        }
    })
    .catch(error => console.error('Error fetching volunteer status:', error));

    volunteerLink.addEventListener('click', function(event) {
        event.preventDefault();

        fetch(`${BACKEND_URL}/api/volunteer/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to register as volunteer, status: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            volunteerText.textContent = 'I am a Volunteer';
            alert('You are now registered as a volunteer.');
        })
        .catch(error => {
            console.error('Error registering as volunteer:', error);
            alert('Failed to register as volunteer. Please try again later.');
        });
    });

    const logoutButton = document.getElementById('logout');
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
});

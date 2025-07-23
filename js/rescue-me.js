document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const welcomeMessage = document.getElementById('welcome-message');
        const profilePicture = document.getElementById('profile-picture');

        welcomeMessage.textContent += user.firstName;
        profilePicture.src = user.img;
    }

    console.log('DOMContentLoaded event fired');
    const rescueForm = document.getElementById('rescue-form');
    const locationInput = document.getElementById('rescue-location');
    const timeInput = document.getElementById('rescue-time');

    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16);
    timeInput.value = formattedDate;

    function fetchLocation() {
        console.log('Fetching location...');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const apiKey = '4086e24eac344b50b80b7e6f0b357f6d'; 

                fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}`)
                    .then(response => response.json())
                    .then(data => {
                        console.log('Location data:', data);
                        if (data.results && data.results.length > 0) {
                            locationInput.value = data.results[0].formatted;
                        } else {
                            alert('Unable to retrieve location');
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching location:', error);
                        alert('Error fetching location');
                    });
            });
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    fetchLocation();

    rescueForm.addEventListener('submit', function(event) {
        event.preventDefault();
        console.log('Form submitted');

        const location = locationInput.value;
        const time = timeInput.value;
        const reason = document.getElementById('rescue-reason').value;

        const token = localStorage.getItem('token');
        console.log('Token:', token);

        const data = {
            location,
            time,
            reason
        };

        console.log('Sending request:', data);

        fetch(`${BACKEND_URL}/api/rescue/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            console.log('Response:', response);
            if (!response.ok) {
                throw new Error('Failed to submit rescue request, status: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            alert('Rescue request submitted successfully');
            rescueForm.reset();
            timeInput.value = formattedDate;
            fetchLocation();
        })
        .catch(error => {
            console.error('Error submitting rescue request:', error);
            alert('Failed to submit rescue request. Please try again later.');
        });
    });
});

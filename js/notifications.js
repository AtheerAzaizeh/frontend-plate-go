document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    const token = localStorage.getItem('token');
    console.log('Token:', token);
    const user = JSON.parse(localStorage.getItem('user'));
    console.log('User:', user);

    if (user) {
        const welcomeMessage = document.getElementById('welcome-message');
        const profilePicture = document.getElementById('profile-picture');

        console.log('Welcome Message Element:', welcomeMessage);
        console.log('Profile Picture Element:', profilePicture);

        welcomeMessage.textContent += user.firstName;
        console.log('Welcome Message Updated:', welcomeMessage.textContent);

        profilePicture.src = user.img;
        console.log('Profile Picture Updated:', profilePicture.src);
    }

    
    fetchRescueRequests();
});

function fetchRescueRequests() {
    const token = localStorage.getItem('token');
    console.log('Fetching Rescue Requests with Token:', token);

    fetch(`${BACKEND_URL}/api/rescue-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        console.log('Fetch Response:', response);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text(); 
    })
    .then(text => {
        console.log('Response Text:', text); 
        try {
            const data = JSON.parse(text); 
            console.log('Parsed Data:', data);

            const notificationsList = document.getElementById('notifications-list');
            console.log('Notifications List Element:', notificationsList);

           

            data.forEach(rescue_request => {
                console.log('Processing Rescue Request:', rescue_request);

                const notificationItem = document.createElement('div');
                notificationItem.classList.add('notification-item');
                console.log('Created Notification Item:', notificationItem);

                const notificationText = document.createElement('span');
                notificationText.textContent = `${rescue_request.reason} at ${rescue_request.location} on ${new Date(rescue_request.time).toLocaleString()}`;
                notificationItem.appendChild(notificationText);
                console.log('Notification Text Added:', notificationText.textContent);

                notificationsList.appendChild(notificationItem);
                console.log('Notification Item Appended');
            });
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    })
   .catch(error => console.error('Error fetching rescue requests:', error));
}
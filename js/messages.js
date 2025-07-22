document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const carID = urlParams.get('carID');
    const chatID = urlParams.get('chatID') || 'defaultChatID'; // Set a default value for testing

    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    console.log('URL Params:', { carID, chatID }); // Debugging line
    console.log('Token:', token); // Debugging line
    console.log('User:', user); // Debugging line

    if (!carID && !chatID) {
        console.error('Car ID or Chat ID is missing or invalid in the URL.');
        return;
    }

    if (carID) {
        fetch(`https://backend-3-vnac.onrender.com/api/cars/id/${carID}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(car => {
            currentCar = car;
            document.getElementById('car-image').src = car.image;
            document.getElementById('plate-number').innerText = car.plate;

            console.log('Current Car:', currentCar); // Debugging line
            loadMessages(carID, chatID);
        })
        .catch(error => {
            console.error('Error fetching car details:', error);
        });
    } else {
        console.error('Car ID is missing or invalid in the URL.');
    }

    if (user) {
        try {
            currentUser = JSON.parse(user);
            console.log('Current User:', currentUser); // Debugging line
        } catch (error) {
            console.error('Error parsing user details:', error);
        }
    } else {
        console.error('User is not logged in or user details are missing.');
    }
});

let currentCar = null;
let currentUser = null;

function loadMessages(carID, chatID) {
    const token = localStorage.getItem('token');

    console.log('Inside loadMessages function');
    console.log('currentUser:', currentUser);
    console.log('currentCar:', currentCar);
    console.log('chatID:', chatID);

    if (!currentCar || !currentUser || !chatID) {
        console.error('currentUser, currentCar, or chatID is not set');
        return;
    }

    fetch(`https://backend-3-vnac.onrender.com/api/messages?carID=${carID}&chatID=${chatID}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(messages => {
        console.log('Fetched messages:', messages); 
        const messageContent = document.getElementById('message-content');
        messageContent.innerHTML = '';

        messages.forEach(message => {
            const messageBubble = document.createElement('div');
            messageBubble.classList.add('message-bubble', message.fromUserID === currentUser.userID ? 'sent' : 'received');

            const messageText = document.createElement('div');
            messageText.classList.add('message-text');
            messageText.textContent = message.message;

            const messageTime = document.createElement('span');
            messageTime.classList.add('message-time');
            messageTime.textContent = new Date(message.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Add profile picture and username
            const profilePic = document.createElement('img');
            profilePic.src = message.fromUserID === currentUser.userID ? currentUser.img : 'images/alon.png';
            profilePic.alt = message.fromUserID === currentUser.userID ? currentUser.firstName : 'Other User';

            messageBubble.appendChild(profilePic);
            messageBubble.appendChild(messageText);
            messageBubble.appendChild(messageTime);

            messageContent.appendChild(messageBubble);
        });

        messageContent.scrollTop = messageContent.scrollHeight;
    })
    .catch(error => console.error('Error fetching messages:', error));
}

function sendMessage() {
    const urlParams = new URLSearchParams(window.location.search);
    const chatID = urlParams.get('chatID') || 'defaultChatID'; // Ensure chatID is retrieved here

    if (!currentUser || !currentCar || !chatID) {
        console.error('currentUser, currentCar, or chatID is not set');
        return;
    }

    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value;
    if (messageText.trim() === '') {
        return;
    }

    const token = localStorage.getItem('token');
    const message = {
        fromUserID: currentUser.userID,
        toUserID: currentCar.userID,
        carID: currentCar.carID, // Ensure `carID` is included
        message: messageText,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        chatID: chatID // Ensure `chatID` is included
    };

    console.log('Sending message:', message); // Debugging line

    fetch('https://backend-3-vnac.onrender.com/api/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(message)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        messageInput.value = '';
        loadMessages(currentCar.carID, chatID);
    })
    .catch(error => console.error('Error sending message:', error));
}

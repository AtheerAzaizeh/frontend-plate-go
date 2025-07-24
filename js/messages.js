let currentCar = null;
let currentUser = null;
let currentChatID = null;

function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const carID = urlParams.get('carID');
    const chatID = urlParams.get('chatID');

    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!carID || !token || !user) {
        console.error('❌ Missing carID, token or user');
        return;
    }

    try {
        currentUser = JSON.parse(user);
    } catch (e) {
        console.error('❌ Failed to parse current user');
        return;
    }

    // Step 1: Get car
    try {
        const carRes = await fetch(`${BACKEND_URL}/api/cars/id/${carID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const carData = await carRes.json();
const car = carData.car; 

currentCar = {
    carID: car._id,
    plate: car.plate,
    image: car.image,
    userID: car.owner._id,
    ownerImg: car.owner.img
};


        document.getElementById('car-image').src = car.image;
        document.getElementById('plate-number').innerText = car.plate;
    } catch (err) {
        console.error('❌ Failed to fetch car', err);
        return;
    }

    // Step 2: Check or create chat
    if (chatID && isValidObjectId(chatID)) {
        currentChatID = chatID;
        loadMessages(currentCar.carID, currentChatID);
    } else {
        try {
            const chatRes = await fetch(`${BACKEND_URL}/api/chat/create-or-get`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userIDs: [currentUser._id, currentCar.userID],
                    carID: currentCar.carID
                })
            });

            const data = await chatRes.json();
            currentChatID = data.chatID;

            // Update URL without reload
            const newURL = new URL(window.location.href);
            newURL.searchParams.set('chatID', currentChatID);
            window.history.replaceState({}, '', newURL.toString());

            loadMessages(currentCar.carID, currentChatID);
        } catch (err) {
            console.error('❌ Failed to create or get chat', err);
        }
    }
});

function loadMessages(carID, chatID) {
    const token = localStorage.getItem('token');
    if (!currentUser || !currentCar || !chatID) return;

    fetch(`${BACKEND_URL}/api/message/${chatID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(response => {
        const messages = response.messages;
        const container = document.getElementById('message-content');
        container.innerHTML = '';

        if (!Array.isArray(messages)) {
            console.warn('⚠️ No messages found');
            return;
        }

        messages.forEach(message => {
            const isMine = message.sender._id === currentUser._id;

            const bubble = document.createElement('div');
            bubble.className = `message-bubble ${isMine ? 'sent' : 'received'}`;

            const profile = document.createElement('img');
            profile.src = isMine ? currentUser.img : message.sender.img || 'images/other-user.png';
            profile.alt = message.sender.firstName || 'User';

            const text = document.createElement('div');
            text.className = 'message-text';
            text.textContent = message.message;

            const time = document.createElement('span');
            time.className = 'message-time';
            time.textContent = new Date(message.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            bubble.appendChild(profile);
            bubble.appendChild(text);
            bubble.appendChild(time);

            container.appendChild(bubble);
        });

        container.scrollTop = container.scrollHeight;
    })
    .catch(err => console.error('❌ Error fetching messages:', err));
}

function sendMessage() {
    if (!currentChatID || !currentUser || !currentCar) return;

    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    if (!messageText) return;

    const token = localStorage.getItem('token');
    const body = {
        message: messageText,
        sender: currentUser._id,
        date: new Date().toISOString()
    };

    fetch(`${BACKEND_URL}/api/message/${currentChatID}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    })
    .then(res => {
        if (!res.ok) throw new Error('Message send failed');
        return res.json();
    })
    .then(() => {
        messageInput.value = '';
        loadMessages(currentCar.carID, currentChatID);
    })
    .catch(err => console.error('❌ Error sending message:', err));
}

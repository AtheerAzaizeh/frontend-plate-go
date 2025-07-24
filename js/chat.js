document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (user) {
        try {
            currentUser = JSON.parse(user);
            const welcomeMessage = document.getElementById('welcome-message');
            const profilePicture = document.getElementById('profile-picture');
            welcomeMessage.textContent += currentUser.firstName;
            profilePicture.src = currentUser.img;
        } catch (error) {
            console.error('Error parsing user details:', error);
        }
    } else {
        console.error('User is not logged in or user details are missing.');
    }

    fetchChats();
});

let currentUser = null;

function fetchChats() {
    const token = localStorage.getItem('token');
    fetch(`${BACKEND_URL}/api/chats/my`, {

        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
    const chats = data.chats;
    const chatsList = document.getElementById('chats-list');
    chatsList.innerHTML = '';

    chats.forEach(chat => {

            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');
            chatItem.dataset.chatId = chat.chatID;

            const profilePic = document.createElement('img');
            profilePic.src = chat.img;
            profilePic.alt = chat.firstName;

            const chatDetails = document.createElement('div');
            chatDetails.classList.add('chat-details');

            const chatName = document.createElement('span');
            chatName.textContent = chat.firstName;

            const lastMessage = document.createElement('p');
            lastMessage.textContent = chat.lastMessage;

            const messageTime = document.createElement('span');
            messageTime.classList.add('chat-time');
            messageTime.textContent = new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            chatDetails.appendChild(chatName);
            chatDetails.appendChild(lastMessage);
            chatDetails.appendChild(messageTime);

            chatItem.appendChild(profilePic);
            chatItem.appendChild(chatDetails);
            chatsList.appendChild(chatItem);

            chatItem.addEventListener('click', () => {
                window.location.href = `messages.html?chatID=${chat.chatID}&carID=${chat.carID}`;
            });
        });
    })
    .catch(error => console.error('Error fetching chats:', error));
}

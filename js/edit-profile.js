document.addEventListener('DOMContentLoaded', function () {
  const user = JSON.parse(localStorage.getItem('user'));

  // ✅ Modal utility
  const showModalMessage = (message) => {
    const modal = document.getElementById("modal");
    const msgEl = document.getElementById("modal-message");
    msgEl.textContent = message;
    modal.classList.remove("hidden-r");
  };

  if (user) {
    document.getElementById('welcome-message').innerText = `Welcome ${user.firstName}`;
    document.getElementById('profile-picture').src = user.img;
    document.getElementById('profile-pic').src = user.img;

    document.getElementById('phoneNumber').value = user.phoneNumber;
    document.getElementById('email').value = user.email;
    document.getElementById('img').value = user.img;
  } else {
    console.error('No user data found in localStorage');
    return;
  }

  document.getElementById('edit-profile-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const updatedUser = {
      phoneNumber: document.getElementById('phoneNumber').value,
      email: document.getElementById('email').value,
      img: document.getElementById('img').value
    };

    fetch(`${BACKEND_URL}/api/user/${user._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updatedUser)
    })
      .then(response => {
        if (!response.ok) throw new Error("Failed to update profile");
        return response.json();
      })
      .then(data => {
        console.log('User updated:', data);
        localStorage.setItem('user', JSON.stringify({ ...user, ...updatedUser }));
        showModalMessage('Profile updated successfully');
      })
      .catch(error => console.error('Error updating profile:', error));
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    const welcomeMessage = document.getElementById('welcome-message');
    const profilePicture = document.getElementById('profile-picture');
    welcomeMessage.textContent += user.firstName;
    profilePicture.src = user.img;
  }

  const rescueForm = document.getElementById('rescue-form');
  const locationInput = document.getElementById('rescue-location');
  const timeInput = document.getElementById('rescue-time');

  function getLocalDateTimeString() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }
  timeInput.value = getLocalDateTimeString();

  function fetchLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const apiKey = '400d2d81eb784ffeac2632a2082a4615';
        fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}`)
          .then(response => response.json())
          .then(data => {
            if (data.results && data.results.length > 0) {
              locationInput.value = data.results[0].formatted;
            } else {
              showModal('❌ Location Error', 'Unable to retrieve your location.');
            }
          })
          .catch(error => {
            console.error('Error fetching location:', error);
            showModal('❌ Location Error', 'Something went wrong.');
          });
      });
    } else {
      showModal('❌ Geolocation', 'Geolocation is not supported by this browser.');
    }
  }

  fetchLocation();

  rescueForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const location = locationInput.value;
    const time = timeInput.value;
    const reason = document.getElementById('rescue-reason').value;
    const token = localStorage.getItem('token');

    const data = { location, time, reason };

    fetch(`${BACKEND_URL}/api/rescue/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    .then(async response => {
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit rescue request.');
      }

      showModal("✅ Success", "Rescue request submitted successfully!");
      rescueForm.reset();
      timeInput.value = getLocalDateTimeString();
      fetchLocation();
    })
    .catch(error => {
      console.error('Error submitting rescue request:', error);
      showModal("❌ Error", "Failed to submit rescue request. Please try again later.");
    });
  });

  function showModal(title, message) {
    const modal = document.getElementById('custom-modal');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');

    if (!modal || !titleEl || !messageEl) {
      alert(`${title}\n\n${message}`);
      return;
    }

    titleEl.textContent = title;
    messageEl.innerHTML = message;
    modal.classList.remove('hidden-r');

    const okBtn = document.getElementById('modal-ok');
    okBtn.onclick = () => modal.classList.add('hidden-r');
  }

  // ✅ Move socket logic HERE to access showModal
const socket = io(BACKEND_URL, {
  withCredentials: true,
  transports: ['websocket','polling']
});
  if (user?._id) {
    socket.emit("joinUserRoom", user._id);
  }

  socket.on("rescueAccepted", (data) => {
    showModal("🚨 Good news!", `A volunteer is on the way to help you.<br><br>Accepted by: <strong>${data.acceptedBy}</strong>`);
  });
});

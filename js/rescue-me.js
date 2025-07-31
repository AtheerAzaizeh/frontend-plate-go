// js/rescue-me.js

// ← Make sure <script src="/socket.io/socket.io.js"></script> and
//    a <script> tag defining BACKEND_URL exist before this file loads.

document.addEventListener('DOMContentLoaded', () => {
  // 1️⃣ Read user & token
  const user  = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  // 2️⃣ Show welcome + profile pic
  const welcomeMessage  = document.getElementById('welcome-message');
  const profilePicture  = document.getElementById('profile-picture');
  if (user) {
    if (welcomeMessage) welcomeMessage.textContent += ` ${user.firstName}`;
    if (profilePicture) profilePicture.src = user.img;
  }

  // 3️⃣ Rescue form elements
  const rescueForm     = document.getElementById('rescue-form');
  const locationInput  = document.getElementById('rescue-location');
  const timeInput      = document.getElementById('rescue-time');
  const reasonInput    = document.getElementById('rescue-reason');

  // Helper → ISO datetime local
  function getLocalDateTimeString() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }
  timeInput.value = getLocalDateTimeString();

  // 4️⃣ Reverse-geocode via OpenCage
  function fetchLocation() {
    if (!navigator.geolocation) {
      return showModal('❌ Geolocation', 'Browser does not support Geolocation.');
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        const apiKey = '400d2d81eb784ffeac2632a2082a4615';
        fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}`)
          .then(r => r.json())
          .then(data => {
            if (data.results?.length) {
              locationInput.value = data.results[0].formatted;
            } else {
              showModal('❌ Location Error', 'Could not retrieve your address.');
            }
          })
          .catch(err => {
            console.error('Error fetching location:', err);
            showModal('❌ Location Error', 'Something went wrong.');
          });
      },
      err => {
        console.error('Geolocation error:', err);
        showModal('❌ Location Error', err.message);
      }
    );
  }
  fetchLocation();

  // 5️⃣ Submit rescue request
  rescueForm.addEventListener('submit', async e => {
    e.preventDefault();
    const location = locationInput.value;
    const time     = timeInput.value;
    const reason   = reasonInput.value;

    try {
      const res = await fetch(`${BACKEND_URL}/api/rescue/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ location, time, reason })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to submit rescue.');
      showModal('✅ Success', 'Rescue request submitted successfully!');
      rescueForm.reset();
      timeInput.value = getLocalDateTimeString();
      fetchLocation();
    } catch (err) {
      console.error('Submit error:', err);
      showModal('❌ Error', err.message || 'Please try again later.');
    }
  });

  // 6️⃣ Modal helper
  function showModal(title, message) {
    const modal       = document.getElementById('custom-modal');
    const titleEl     = document.getElementById('modal-title');
    const messageEl   = document.getElementById('modal-message');
    if (!modal || !titleEl || !messageEl) {
      return alert(`${title}\n\n${message}`);
    }
    titleEl.textContent   = title;
    messageEl.innerHTML    = message;
    modal.classList.remove('hidden-r');
    document.getElementById('modal-ok').onclick = () => modal.classList.add('hidden-r');
  }

  // 7️⃣ SOCKET.IO – connect & join rooms
  const socket = io(BACKEND_URL, {
    withCredentials: true,
    transports: ['websocket','polling']
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);

    // join personal room for direct events (rescueAccepted, etc.)
    if (user?._id) {
      socket.emit('joinUser', user._id);
      console.log('➡️ joinUser', user._id);
    }

    // join volunteers room so you receive newRescueRequest
    if (user?.role === 'volunteer' && user.available === true) {
      socket.emit('joinAsVolunteer');
      console.log('➡️ joinAsVolunteer');
    }
  });

  socket.on('connect_error', err => {
    console.error('Socket connect error:', err);
  });

  // 8️⃣ For the _requester_ → rescue was accepted
  socket.on('rescueAccepted', data => {
    console.log('🏷 rescueAccepted:', data);
    showModal(
      '🚨 Good news!',
      `A volunteer is on the way!<br><br>Accepted by: <strong>${data.acceptedBy}</strong>`
    );
  });

  // 9️⃣ (Optional) For volunteers → new incoming requests
  socket.on('newRescueRequest', data => {
    console.log('🏷 newRescueRequest:', data);
    // only volunteers in this room will get this
    showModal('🚨 New Rescue Request', data.message);
  });

  socket.on('disconnect', () => console.log('Socket disconnected'));
});

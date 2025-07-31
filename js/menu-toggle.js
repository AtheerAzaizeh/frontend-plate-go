const menuToggle = document.getElementById('menu-toggle');
const sideMenu = document.getElementById('side-menu');
const overlay = document.getElementById('overlay');
const user = JSON.parse(localStorage.getItem('user'));
const statusBadge = document.getElementById('availability-status');
const token = localStorage.getItem('token');

// ✅ Modal message utility
const showModalMessage = (msg) => {
  const modal = document.getElementById("modal");
  const msgEl = document.getElementById("modal-message");
  msgEl.textContent = msg;
  modal.classList.remove("hidden-r");
};

if (statusBadge && user && typeof user.available === 'boolean') {
  statusBadge.textContent = user.available ? '🟢' : '🔴';
}

const availabilitySwitch = document.getElementById('volunteer-updates-switch');

if (availabilitySwitch && user && typeof user.available === 'boolean') {
  availabilitySwitch.checked = user.available;
}

if (user) {
  document.getElementById('welcome-message').textContent += user.firstName;
  document.getElementById('profile-picture').src = user.img;
  document.getElementById('profile-picture-menu').src = user.img;
  document.getElementById('profile-name').innerText = `${user.firstName} ${user.lastName}`;
  document.getElementById('profile-email').innerText = user.email;

  if (user.role === 'volunteer') {
    const volunteerLink = document.getElementById('volunteer-link');
    if (volunteerLink) {
      volunteerLink.style.pointerEvents = 'none';
      volunteerLink.style.opacity = '0.6';
      volunteerLink.style.cursor = 'default';
    }

    const volunteerText = document.getElementById('volunteer-text');
    if (volunteerText) {
      volunteerText.textContent = 'I am a Volunteer';
    }
  }
}

const volunteerLink = document.getElementById('volunteer-link');
const volunteerText = document.getElementById('volunteer-text');

volunteerLink.addEventListener('click', function (event) {
  event.preventDefault();

  fetch(`${BACKEND_URL}/api/user/become-volunteer`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      console.log("✅ Volunteer updated:", data);
      showModalMessage(data.message || 'You are now a volunteer!');
      volunteerText.textContent = 'I am a Volunteer';

      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        user.role = 'volunteer';
        localStorage.setItem('user', JSON.stringify(user));
      }
    })
    .catch(error => {
      console.error('❌ Error becoming a volunteer:', error);
      showModalMessage('Failed to update volunteer status.');
    });
});

const availabilityBtn = document.getElementById('availability-toggle-btn');

if (availabilitySwitch) {
  availabilitySwitch.addEventListener('change', async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/toggle-availability`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await res.json();
      if (res.ok) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
          user.available = result.available;
          localStorage.setItem('user', JSON.stringify(user));
        }

        if (statusBadge) {
          statusBadge.textContent = result.available ? '🟢' : '🔴';
        }

        showModalMessage(result.available
          ? "✅ You are now available to receive rescue requests."
          : "🔕 You are now unavailable.");
      } else {
        showModalMessage(result.message || 'Error updating availability.');
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
      showModalMessage('Something went wrong.');
    }
  });
}

const logoutButton = document.getElementById('logout');
logoutButton.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
});

const fetchAndDisplayUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("No token found. Displaying default info.");
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
      }
      throw new Error("Failed to fetch user data");
    }

    const user = await response.json();

    const profilePicHeader = document.getElementById("profile-picture");
    const welcomeMessage = document.getElementById("welcome-message");
    if (profilePicHeader) profilePicHeader.src = user.profilePicture || "images/alon.png";
    if (welcomeMessage) welcomeMessage.textContent = `Welcome ${user.name.split(" ")[0]}`;

    const profilePicMenu = document.getElementById("profile-picture-menu");
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const profileRole = document.getElementById("profile-role");

    if (profilePicMenu) profilePicMenu.src = user.profilePicture || "images/alon.png";
    if (profileName) profileName.textContent = user.name;
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileRole) profileRole.textContent = user.isVolunteer ? "Volunteer" : "User";
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
};

fetchAndDisplayUser();

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

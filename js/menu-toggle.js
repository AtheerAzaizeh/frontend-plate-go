const menuToggle = document.getElementById('menu-toggle');
const sideMenu = document.getElementById('side-menu');
const overlay = document.getElementById('overlay');

 const fetchAndDisplayUser = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      console.log("No token found. Displaying default info.")
      // Keep default info if not logged in
      return
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/user/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token")
        }
        throw new Error("Failed to fetch user data")
      }

      const user = await response.json()

      // Update header
      const profilePicHeader = document.getElementById("profile-picture")
      const welcomeMessage = document.getElementById("welcome-message")
      if (profilePicHeader) profilePicHeader.src = user.profilePicture || "images/alon.png"
      if (welcomeMessage) welcomeMessage.textContent = `Welcome ${user.name.split(" ")[0]}`

      // Update side menu
      const profilePicMenu = document.getElementById("profile-picture-menu")
      const profileName = document.getElementById("profile-name")
      const profileEmail = document.getElementById("profile-email")
      const profileRole = document.getElementById("profile-role")

      if (profilePicMenu) profilePicMenu.src = user.profilePicture || "images/alon.png"
      if (profileName) profileName.textContent = user.name
      if (profileEmail) profileEmail.textContent = user.email
      if (profileRole) profileRole.textContent = user.isVolunteer ? "Volunteer" : "User"
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }

  // Fetch user data on page load
  fetchAndDisplayUser()

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


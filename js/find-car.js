document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token")
  const user = JSON.parse(localStorage.getItem("user"))

  // This part is now handled by menu-toggle.js, but we can keep it as a fallback
  if (user) {
    const welcomeMessage = document.getElementById("welcome-message")
    const profilePicture = document.getElementById("profile-picture")
    if (welcomeMessage) welcomeMessage.textContent = `Welcome ${user.firstName}`
    if (profilePicture) profilePicture.src = user.img || "images/alon.png"
  }

  document.querySelector(".find-car-button").addEventListener("click", findCar)
  document.getElementById("reportHistoryButton").addEventListener("click", () => {
    window.location.href = "report_history.html"
  })
})

function findCar() {
  const plateInput = document.getElementById("plate-input").value.trim()
  if (!plateInput) {
    alert("Please enter a plate number.")
    return
  }
  const token = localStorage.getItem("token")
  fetch(`${BACKEND_URL}/api/cars/${plateInput}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (response.status === 404) {
        alert("Car with this plate number not found.")
        throw new Error("Car not found")
      }
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText)
      }
      return response.json()
    })
    .then((car) => {
      localStorage.setItem("plate", plateInput)
      window.location.href = `car-details.html?plate=${plateInput}`
    })
    .catch((error) => {
      console.error("Error fetching car:", error)
    })
}

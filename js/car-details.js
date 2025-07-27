document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token")
  const user = JSON.parse(localStorage.getItem("user"))
  const urlParams = new URLSearchParams(window.location.search)
  const plate = urlParams.get("plate")
  const reportId = urlParams.get("reportId")

  if (user) {
    document.getElementById("welcome-message").textContent += " " + user.firstName
    document.getElementById("profile-picture").src = user.img
  }

  // Check if we have either plate or reportId
  if ((!plate && !reportId) || !token) {
    return alert("Invalid request.")
  }

  let carPlate = plate

  // If we have reportId, first get the report to extract the plate
  if (reportId && !plate) {
    fetch(`${BACKEND_URL}/api/reports/${reportId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data) => {
        carPlate = data.report.plate
        fetchCarDetails(carPlate)
      })
      .catch((err) => {
        console.error("Failed to fetch report:", err)
        alert("Report not found")
      })
  } else {
    // If we have plate directly, fetch car details
    fetchCarDetails(carPlate)
  }

  function fetchCarDetails(plateNumber) {
    // Fetch car details
    fetch(`${BACKEND_URL}/api/reports/car/${plateNumber}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data) => {
        const car = data.car
        document.getElementById("plate-number").textContent = car.plate
        document.getElementById("manufacturer").textContent = car.carCompany.toUpperCase()
        document.getElementById("model").textContent = car.model
        document.getElementById("year").textContent = car.year
        document.getElementById("color").textContent = car.color

        document.getElementById("car-image").src = car.image
        const brand = car.carCompany.toLowerCase()
        document.getElementById("company-logo").src = `https://logo.clearbit.com/${brand}.com`
      })
      .catch((err) => {
        console.error("Failed to fetch car:", err)
        alert("Car not found")
      })
  }

  // Modal actions
  document.getElementById("report-btn").onclick = () => {
    document.getElementById("report-modal").classList.remove("hidden-r")
    document.getElementById("step-reason").style.display = "block"
    document.getElementById("step-location").style.display = "none"
    document.getElementById("report-reason").value = ""
  }

  document.getElementById("close-modal").onclick = () => {
    document.getElementById("report-modal").classList.add("hidden-r")
  }

  document.getElementById("report-reason").addEventListener("change", () => {
    if (document.getElementById("report-reason").value) {
      document.getElementById("step-reason").style.display = "none"
      document.getElementById("step-location").style.display = "block"
    }
  })

  document.querySelector(".back-btn2").onclick = () => {
    document.getElementById("step-location").style.display = "none"
    document.getElementById("step-reason").style.display = "block"
  }

  // Show location form only if reason selected
  const reasonSelect = document.getElementById("report-reason")
  const citySelect = document.getElementById("city")
  const streetSelect = document.getElementById("street")
  const locationForm = document.getElementById("step-location")
  const reportBtn = document.querySelector(".report-btn2")

  reasonSelect.addEventListener("change", () => {
    locationForm.style.display = reasonSelect.value ? "block" : "none"
  })

  reportBtn.addEventListener("click", async () => {
    const currentPlate = carPlate || plate
    const reason = document.getElementById("report-reason").value
    const city = document.getElementById("city").value
    const street = document.getElementById("street").value
    const number = document.getElementById("street-number").value

    if (!currentPlate || !reason || !city || !street || !number) {
      alert("Please fill in all fields")
      return
    }

    const token = localStorage.getItem("token")
    const payload = {
      plate: currentPlate,
      reason,
      reportType: "blocking",
      image: "https://i.imgur.com/report.jpg",
      location: {
        city,
        street,
        number,
      },
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/reports/create-with-coordinates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error(await res.text())

      // Success UI
      document.getElementById("report-modal").classList.add("hidden-r")
      document.getElementById("report-success").classList.remove("hidden-r")
    } catch (err) {
      console.error("Failed to send report:", err)
      alert("Failed to send report")
    }
  })

  document.getElementById("ok-success").onclick = () => {
    document.getElementById("report-success").classList.add("hidden-r")
    document.getElementById("contact-owner").classList.remove("hidden-r")
  }

  document.getElementById("close-contact-owner").onclick = () => {
    document.getElementById("contact-owner").classList.add("hidden-r")
  }

  // Updated send message handler
  document.getElementById("send-message").onclick = async () => {
    const currentPlate = carPlate || plate
    if (!currentPlate) return alert("Plate not found")

    try {
      // Create or get chat by plate
      const chatRes = await fetch(`${BACKEND_URL}/api/chat/create-or-get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plate: currentPlate }),
      })

      if (!chatRes.ok) {
        const error = await chatRes.json()
        throw new Error(error.error || "Failed to create chat")
      }

      const chatData = await chatRes.json()

      // Navigate to chat page with chatId and plate
      window.location.href = `chat.html?chatId=${chatData.chatId}&plate=${encodeURIComponent(currentPlate)}`
    } catch (err) {
      console.error("Failed to create chat:", err)
      alert("Failed to start chat: " + err.message)
    }
  }

  // Fetch and populate city/street data (Hebrew)
  fetch(
    "https://raw.githubusercontent.com/GabMic/israeli-cities-and-streets-list/master/israeli_street_and_cities_names.json",
  )
    .then((res) => res.json())
    .then((data) => {
      const citiesMap = {} // { cityName: Set(streetNames) }

      data.streets.forEach((entry) => {
        const city = entry.city_name
        const street = entry.street_name

        if (!citiesMap[city]) citiesMap[city] = new Set()
        citiesMap[city].add(street)
      })

      const sortedCities = Object.keys(citiesMap).sort()
      sortedCities.forEach((city) => {
        const opt = document.createElement("option")
        opt.value = city
        opt.textContent = city
        citySelect.appendChild(opt)
      })

      citySelect.addEventListener("change", () => {
        const selectedCity = citySelect.value
        const streets = citiesMap[selectedCity] || []

        // Clear old options
        streetSelect.innerHTML = '<option value="">Select Street</option>'

        Array.from(streets)
          .sort()
          .forEach((street) => {
            const opt = document.createElement("option")
            opt.value = street
            opt.textContent = street
            streetSelect.appendChild(opt)
          })
      })
    })
    .catch((err) => {
      console.error("Failed to load cities/streets:", err)
    })
})
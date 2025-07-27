let allReports = [];

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"))
  const token = localStorage.getItem("token")

  if (!user || !token) return (location.href = "index.html")

  document.getElementById("welcome-message").textContent += user.firstName
  document.getElementById("profile-picture").src = user.img

  fetchAllReports()

  document.getElementById("searchPlate").addEventListener("input", applyFilters)
  document.getElementById("filterCity").addEventListener("change", applyFilters)
  document.getElementById("filterDate").addEventListener("change", applyFilters)
})

function fetchAllReports() {
  fetch(`${BACKEND_URL}/api/reports/all`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      allReports = data.reports || []
      displayReports(allReports)
      populateCities(allReports)
    })
    .catch((err) => console.error("Error fetching reports:", err))
}

function populateCities(reports) {
  const citySet = new Set(reports.map((r) => r.location?.city).filter(Boolean))
  const citySelect = document.getElementById("filterCity")
  citySet.forEach((city) => {
    const option = document.createElement("option")
    option.value = city
    option.textContent = city
    citySelect.appendChild(option)
  })
}

function applyFilters() {
  const searchPlate = document.getElementById("searchPlate").value.toLowerCase()
  const filterCity = document.getElementById("filterCity").value
  const filterDate = document.getElementById("filterDate").value

  const filtered = allReports.filter((report) => {
    const matchPlate = report.plate.toLowerCase().includes(searchPlate)
    const matchCity = !filterCity || report.location?.city === filterCity
    const matchDate = !filterDate || formatDate(report.date) === formatDate(filterDate)

    return matchPlate && matchCity && matchDate
  })

  displayReports(filtered)
}

function displayReports(reports) {
  const list = document.getElementById("report-list")
  list.innerHTML = ""

  reports.forEach((report) => {
    const item = document.createElement("li")
    item.className = "report-item"

    item.innerHTML = `
      <img src="${report.image || "images/default-car.jpg"}" class="car-img" alt="car" />
      <div class="report-details">
        <div class="plate">${report.plate}</div>
        <div class="desc">${report.reason || "N/A"}</div>
      </div>
      <div class="report-meta">
        <div class="location">
          <i class="fa fa-map-marker-alt"></i>
          <span>${report.location?.street || ""} ${report.location?.number || ""} ${report.location?.city || ""}</span>
        </div>
        <div>${formatDate(report.date)}<br>${report.time || ""}</div>
        <div class="status-icon">${statusIcon(report.reason)}</div>
      </div>
    `

    // Updated click handler to navigate to car-details with reportId
    item.addEventListener("click", () => {
      window.location.href = `car-details.html?reportId=${report._id}`
    })

    list.appendChild(item)
  })
}

function formatDate(dateString) {
  const d = new Date(dateString)
  return d.toLocaleDateString("en-GB")
}

function statusIcon(reason) {
  if (reason.includes("child")) return "🔺"
  if (reason.includes("lights")) return "✅"
  return "🟡"
}

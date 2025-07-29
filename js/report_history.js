(function () {
  "use strict"

  let allReports = [] 

  const elements = {
    welcomeMessage: document.getElementById("welcome-message"),
    profilePicture: document.getElementById("profile-picture"),
    searchInput: document.getElementById("searchPlate"),
    cityFilter: document.getElementById("filterCity"),
    dateFilter: document.getElementById("filterDate"),
    reportList: document.getElementById("report-list"),
  }


  function displayReports(reports) {
    elements.reportList.innerHTML = ""

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
          <div class="status-icon">${getStatusIcon(report.reason)}</div>
        </div>
      `
      item.addEventListener("click", () => {
        window.location.href = `car-details.html?reportId=${report._id}`
      })

      elements.reportList.appendChild(item)
    })
  }


  function populateCitiesFilter(reports) {
    const citySet = new Set(reports.map((r) => r.location?.city).filter(Boolean))

    citySet.forEach((city) => {
      const option = document.createElement("option")
      option.value = city
      option.textContent = city
      elements.cityFilter.appendChild(option)
    })
  }


  function formatDate(dateString) {
    if (!dateString) return "N/A"
    const d = new Date(dateString)
    return d.toLocaleDateString("en-GB") 
  }

  function getStatusIcon(reason = "") {
    if (reason.toLowerCase().includes("child")) return "🔺" 
    if (reason.toLowerCase().includes("lights")) return "✅" 
    return "🟡"
  }

  function applyFilters() {
    const searchPlate = elements.searchInput.value.toLowerCase()
    const filterCity = elements.cityFilter.value
    const filterDate = elements.dateFilter.value

    const filteredReports = allReports.filter((report) => {
      const matchPlate = report.plate.toLowerCase().includes(searchPlate)
      const matchCity = !filterCity || report.location?.city === filterCity
      const matchDate = !filterDate || formatDate(report.date) === formatDate(filterDate)

      return matchPlate && matchCity && matchDate
    })

    displayReports(filteredReports)
  }


  async function fetchAllReports() {
    const token = localStorage.getItem("token")
    try {
      const response = await fetch(`${BACKEND_URL}/api/reports/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      allReports = data.reports || [] 
      displayReports(allReports) 
      populateCitiesFilter(allReports)
    } catch (error) {
      console.error("Error fetching reports:", error)
    }
  }

  function init() {
    const user = JSON.parse(localStorage.getItem("user"))
    const token = localStorage.getItem("token")

    if (!user || !token) {
      window.location.href = "index.html"
      return 
    }

    elements.welcomeMessage.textContent += ` ${user.firstName}`
    elements.profilePicture.src = user.img

    fetchAllReports()

    elements.searchInput.addEventListener("input", applyFilters)
    elements.cityFilter.addEventListener("change", applyFilters)
    elements.dateFilter.addEventListener("change", applyFilters)
  }

  document.addEventListener("DOMContentLoaded", init)
})()
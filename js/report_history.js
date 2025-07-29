let allReports = [];

const elements = {
  searchInput: document.getElementById("searchPlate"),
  cityFilter: document.getElementById("filterCity"),
  dateFilter: document.getElementById("filterDate"),
  welcomeMessage: document.getElementById("welcome-message"),
  profilePicture: document.getElementById("profile-picture"),
  reportList: document.getElementById("report-list"),
};

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB");
}

function statusIcon(reason = "") {
  if (reason.includes("child")) return "🔺";
  if (reason.includes("lights")) return "✅";
  return "🟡";
}

function displayReports(reports) {
  elements.reportList.innerHTML = "";

  reports.forEach((report) => {
    const item = document.createElement("li");
    item.className = "report-item";

    item.innerHTML = `
      <img src="${report.image || "images/default-car.jpg"}"
           onerror="this.onerror=null;this.src='images/default-car.jpg';"
           class="car-img" alt="car" />
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
         <button class="delete-btn" title="Delete Report" data-id="${report._id}">
      🗑️
    </button>
      </div>
    `;

    // Add delete button logic
item.querySelector(".delete-btn").addEventListener("click", async (e) => {
  e.stopPropagation(); // prevent triggering the click on the report item
  const confirmed = confirm("Are you sure you want to delete this report?");
  if (!confirmed) return;

  const reportId = e.target.getAttribute("data-id");
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BACKEND_URL}/api/reports/${reportId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to delete report");

    // Remove from UI
    allReports = allReports.filter((r) => r._id !== reportId);
    displayReports(allReports);
  } catch (err) {
    console.error("Delete error:", err);
    alert("Failed to delete report.");
  }
});


    item.addEventListener("click", () => {
      window.location.href = `car-details.html?reportId=${report._id}`;
    });

    elements.reportList.appendChild(item);
  });
}

function populateCitiesFilter(reports) {
  const citySet = new Set(reports.map((r) => r.location?.city).filter(Boolean));
  elements.cityFilter.innerHTML = `<option value="">All Cities</option>`;
  citySet.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    elements.cityFilter.appendChild(option);
  });
}

function applyFilters() {
  const searchPlate = elements.searchInput.value.toLowerCase();
  const filterCity = elements.cityFilter.value;
  const filterDate = elements.dateFilter.value;

  const filteredReports = allReports.filter((report) => {
    const matchPlate = report.plate.toLowerCase().includes(searchPlate);
    const matchCity = !filterCity || report.location?.city === filterCity;
    const matchDate = !filterDate || formatDate(report.date) === formatDate(filterDate);

    return matchPlate && matchCity && matchDate;
  });

  displayReports(filteredReports);
}

async function fetchAllReports() {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(`${BACKEND_URL}/api/reports/my`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    allReports = data.reports || [];
    displayReports(allReports);
    populateCitiesFilter(allReports);
  } catch (error) {
    console.error("Error fetching reports:", error);
  }
}

function init() {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  if (!user || !token) {
    window.location.href = "index.html";
    return;
  }

  elements.welcomeMessage.textContent += ` ${user.firstName}`;
  elements.profilePicture.src = user.img;

  fetchAllReports();

  elements.searchInput.addEventListener("input", applyFilters);
  elements.cityFilter.addEventListener("change", applyFilters);
  elements.dateFilter.addEventListener("change", applyFilters);
}

document.addEventListener("DOMContentLoaded", init);

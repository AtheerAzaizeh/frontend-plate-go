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
     showCarFinderModal({ message: "Please enter a plate number.", type: "warning" });
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
          showCarFinderModal({ message: "Car with this plate number not found." + response.statusText, type: "error" });
        throw new Error("Car not found")
      }
      if (!response.ok) {
        showCarFinderModal({ message: "Network response was not ok. Try again.", type: "error" });
        throw new Error("Network response was not ok " + response.statusText)
      }
      return response.json()
    })
    .then((car) => {
      localStorage.setItem("plate", plateInput)
    showCarFinderModal({ message: "Car found! Redirecting...", type: "success", timeout: 1200 });
      setTimeout(() => {
        window.location.href = `car-details.html?plate=${plateInput}`;
      }, 1200);
    })
    .catch((error) => {
      showCarFinderModal({ message: "Car with this plate number not found." + error.message, type: "error" });
    })
}

function showCarFinderModal({ message, type = "info", timeout = 2000 }) {
  const modal = document.getElementById("modalCarFinder");
  const msg = document.getElementById("modalCarFinderMessage");
  const icon = document.getElementById("modalCarFinderIcon");

  msg.textContent = message || "";

  if (type === "success") {
    icon.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#4caf50"></i>';
  } else if (type === "error") {
    icon.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:#d32f2f"></i>';
  } else if (type === "warning") {
    icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#ffb300"></i>';
  } else {
    icon.innerHTML = '<i class="fa-solid fa-circle-info" style="color:#2564cf"></i>';
  }

  modal.classList.add("active");

  if (timeout !== false) {
    setTimeout(() => { modal.classList.remove("active"); }, timeout);
  }
}

document.getElementById("modalCarFinderClose").onclick = function() {
  document.getElementById("modalCarFinder").classList.remove("active");
};


function recognizePlate(imageBlob) {
    const formData = new FormData();
    formData.append("upload", imageBlob);

    fetch("https://api.platerecognizer.com/v1/plate-reader/", {
        method: "POST",
        headers: {
            "Authorization": "Token 60719932b2e8d8591f96ece1388544c5f2510d75"
        },
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.results && data.results.length) {
            const plate = data.results[0].plate;
            document.getElementById("plate-input").value = plate;
            showCarFinderModal({ message: "Detected Plate: " + plate, type: "success", timeout: 1300 });
            setTimeout(findCar, 1400);
        } else {
            showCarFinderModal({ message: "No plate detected.", type: "warning" });
        }
    })
    .catch(err => {
        showCarFinderModal({ message: "Plate recognition failed." + err.message, type: "error" });
    });
}
document.getElementById("cameraIcon").addEventListener("click", function() {
    document.getElementById("plateImageInput").click();
});

document.getElementById("plateImageInput").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;
    showCarFinderModal({ message: "Analyzing image...", type: "info", timeout: false });
    recognizePlate(file);
});

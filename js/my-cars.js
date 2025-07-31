document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (user) {
    const welcomeMessage = document.getElementById("welcome-message");
    const profilePictures = document.querySelectorAll("#profile-picture");
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");

    welcomeMessage.textContent += user.firstName;
    profilePictures.forEach(img => (img.src = user.img));
    if (profileName) profileName.textContent = `${user.firstName} ${user.lastName}`;
    if (profileEmail) profileEmail.textContent = user.email;
  }

  const carContainer = document.getElementById("car-container");
  const addCarFormContainer = document.getElementById("addCarFormContainer");
  const carCompanySelect = document.getElementById("carCompanySelect");
  const modelSelect = document.getElementById("modelSelect");
  const yearSelect = document.getElementById("yearSelect");
  const colorSelect = document.getElementById("colorSelect");
  const carInput = document.getElementById("carImageInput");
  const carPreview = document.getElementById("carPreview");

  let carImageUrl = "";
  let carData = {};

  const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dxmqufeag/image/upload";
  const CLOUDINARY_UPLOAD_PRESET = "platego";

  // ─── Fetch Cars ─────────────────────────────────────────────────────
  fetch(`${BACKEND_URL}/api/cars`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(res => res.ok ? res.json() : Promise.reject(res))
    .then(data => {
      carContainer.innerHTML = "";

      const mainCarSection = document.createElement("div");
      mainCarSection.classList.add("main-car-section");
      mainCarSection.innerHTML = `<h2 class="main-car-title">Main car</h2>`;
      carContainer.appendChild(mainCarSection);

      const otherCarSection = document.createElement("div");
      otherCarSection.classList.add("other-car-section");
      otherCarSection.innerHTML = `<h2 class="other-car-title">other car</h2>`;
      carContainer.appendChild(otherCarSection);

      data.forEach((car, index) => {
        const section = index === 0 ? mainCarSection : otherCarSection;
        addCarToSection(car, section);
      });

      addCarBoxToContainer(carContainer);
    })
    .catch(err => console.error("Error fetching cars:", err));

  // ─── Upload Image ────────────────────────────────────────────────────
  carInput.addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });
      const data = await res.json();
      carImageUrl = data.secure_url;
      carPreview.src = carImageUrl;
    } catch (err) {
      console.error("Car upload error:", err);
    }
  });

  // ─── Load Car Company/Model/Year Options ─────────────────────────────
  fetch("../data/car_data_by_make_model_year.json")
    .then(res => res.json())
    .then(data => {
      carData = data;
      Object.keys(data).sort().forEach(brand => {
        const opt = document.createElement("option");
        opt.value = brand;
        opt.textContent = brand;
        carCompanySelect.appendChild(opt);
      });
    });

  carCompanySelect.addEventListener("change", () => {
    const brand = carCompanySelect.value;
    modelSelect.innerHTML = `<option value="">Select Model</option>`;
    yearSelect.innerHTML = `<option value="">Select Year</option>`;

    if (carData[brand]) {
      Object.keys(carData[brand]).sort().forEach(model => {
        modelSelect.innerHTML += `<option value="${model}">${model}</option>`;
      });
    }
  });

  modelSelect.addEventListener("change", () => {
    const brand = carCompanySelect.value;
    const model = modelSelect.value;
    yearSelect.innerHTML = `<option value="">Select Year</option>`;

    if (carData[brand] && carData[brand][model]) {
      carData[brand][model].forEach(year => {
        yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
      });
    }
  });

  // ─── Load Color Options ──────────────────────────────────────────────
  const colors = ["White", "Black", "Silver", "Gray", "Blue", "Red", "Brown", "Green", "Yellow", "Orange", "Gold", "Beige", "Purple"];
  colors.forEach(color => {
    const opt = document.createElement("option");
    opt.value = color;
    opt.textContent = color;
    colorSelect.appendChild(opt);
  });

  // ─── Modal Handling ──────────────────────────────────────────────────
  carContainer.addEventListener("click", e => {
    if (e.target.closest(".add-car-button")) {
      addCarFormContainer.classList.remove("hidden");
    }
  });

  document.querySelector(".close-modal").addEventListener("click", () => {
    addCarFormContainer.classList.add("hidden");
  });

  addCarFormContainer.addEventListener("click", e => {
    if (e.target.id === "addCarFormContainer") {
      addCarFormContainer.classList.add("hidden");
    }
  });

  // ─── Submit Car ──────────────────────────────────────────────────────
  document.getElementById("addCarForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    const editId = form.getAttribute("data-edit-id");

    const carCompany = carCompanySelect.value;
    const model = modelSelect.value;
    const year = yearSelect.value;
    const color = colorSelect.value;
    const plate = document.querySelector("input[name='plate']").value;

    if (!carCompany || !model || !color || !year || !plate || !carImageUrl) {
      return alert("Please fill in all the fields and upload a car image.");
    }

    const payload = { carCompany, model, color, year, plate, image: carImageUrl };

    const url = editId ? `${BACKEND_URL}/api/cars/${editId}` : `${BACKEND_URL}/api/cars`;
    const method = editId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || error.error || res.statusText);
      }

      window.location.reload();
    } catch (err) {
      showCarFinderModal({ message: "Car with this plate already exists.", type: "error" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // Helper Functions
  // ─────────────────────────────────────────────────────────────────────

  function addCarToSection(car, section) {
    const carDiv = document.createElement("div");
    carDiv.classList.add("car-card");

    carDiv.innerHTML = `
      <div class="car-options">
        <div class="dropdown-menu hidden">
          <div class="dropdown-item edit-car" data-id="${car._id}"><i class="fas fa-pen"></i> Edit car</div>
          <div class="dropdown-item replace-main-car"><i class="fas fa-car-side"></i> Replace to main car</div>
          <div class="dropdown-item delete-car" data-id="${car._id}"><i class="fas fa-trash"></i> Delete car</div>
        </div>
        <img src="images/vertical-dots.svg" class="options-button" alt="Options">
      </div>
      <div class="car-content2">
        <img src="${car.image}" alt="Car Image" class="car-img2">
        <div class="car-info">
          <p><strong>${car.carCompany} ${car.model} ${car.year}</strong></p>
          <p>Plate number: ${car.plate}</p>
          <p>Number of reports: ${car.numberOfReports || 0}</p>
          <p>Car Color: ${car.color}</p>
        </div>
      </div>
    `;

    section.appendChild(carDiv);
    setupCarCardEvents(carDiv, car);
  }

  function addCarBoxToContainer(container) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("car-item-wrapper");

    wrapper.innerHTML = `
      <div class="add-car-box">
        <button class="add-car-button">
          <img src="images/plus-icon.svg" alt="Add Icon">
        </button>
        <p>Add Car</p>
      </div>
    `;

    container.appendChild(wrapper);
  }

  function setupCarCardEvents(carDiv, car) {
    const dropdown = carDiv.querySelector(".dropdown-menu");
    const optionsIcon = carDiv.querySelector(".options-button");
    const editBtn = carDiv.querySelector(".edit-car");
    const deleteBtn = carDiv.querySelector(".delete-car");

    optionsIcon.addEventListener("click", e => {
      e.stopPropagation();
      document.querySelectorAll(".dropdown-menu").forEach(d => d.classList.add("hidden"));
      dropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", () => dropdown.classList.add("hidden"));

    deleteBtn.addEventListener("click", () => {
      showConfirmModal("Are you sure you want to delete this car?", () => {
        fetch(`${BACKEND_URL}/api/cars/${car._id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.ok ? window.location.reload() : showCarFinderModal({ message: "Failed to delete car.", type: "error" }))
          .catch(err => {
            console.error("Delete error:", err);
            showCarFinderModal({ message: "Error deleting car. Please try again.", type: "error" });
          });
      });
    });

    editBtn.addEventListener("click", () => {
      carCompanySelect.value = car.carCompany;
      modelSelect.innerHTML = `<option value="${car.model}">${car.model}</option>`;
      yearSelect.innerHTML = `<option value="${car.year}">${car.year}</option>`;
      colorSelect.value = car.color;
      document.querySelector("input[name='plate']").value = car.plate;
      carPreview.src = carImageUrl = car.image;

      addCarFormContainer.classList.remove("hidden");
      document.getElementById("addCarForm").setAttribute("data-edit-id", car._id);
      document.querySelector(".submit-car-btn").textContent = "Update Car";
    });
  }

  function showCarFinderModal({ message, type = "info", timeout = 2000 }) {
    const modal = document.getElementById("modalCarFinder");
    const msg = document.getElementById("modalCarFinderMessage");
    const icon = document.getElementById("modalCarFinderIcon");

    msg.textContent = message;
    icon.innerHTML = {
      success: '<i class="fa-solid fa-circle-check" style="color:#4caf50"></i>',
      error: '<i class="fa-solid fa-circle-xmark" style="color:#d32f2f"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation" style="color:#ffb300"></i>',
      info: '<i class="fa-solid fa-circle-info" style="color:#2564cf"></i>'
    }[type];

    modal.classList.add("active");

    if (timeout !== false) {
      setTimeout(() => modal.classList.remove("active"), timeout);
    }
  }

  document.getElementById("modalCarFinderClose").onclick = () => {
    document.getElementById("modalCarFinder").classList.remove("active");
  };

  document.getElementById("carImageInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    showCarFinderModal({ message: "Analyzing car image for plate...", type: "info", timeout: false });

    const formData = new FormData();
    formData.append("upload", file);

    fetch("https://api.platerecognizer.com/v1/plate-reader/", {
      method: "POST",
      headers: { Authorization: "Token 60719932b2e8d8591f96ece1388544c5f2510d75" },
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.results?.length) {
          const plate = data.results[0].plate;
          document.querySelector('input[name="plate"]').value = plate;
          showCarFinderModal({ message: `Detected Plate: ${plate}`, type: "success", timeout: 1400 });
        } else {
          showCarFinderModal({ message: "No plate detected.", type: "warning" });
        }
      })
      .catch(() => showCarFinderModal({ message: "Plate recognition failed.", type: "error" }));

    setTimeout(() => (e.target.value = ""), 1200);
  });

  function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById("confirm-modal");
    document.getElementById("confirm-message").textContent = message;
    modal.classList.remove("hidden-r");

    document.getElementById("confirm-yes-btn").onclick = () => {
      modal.classList.add("hidden-r");
      onConfirm();
    };

    document.getElementById("confirm-cancel-btn").onclick = () => modal.classList.add("hidden-r");
  }
});
  
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dxmqufeag/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "platego";

let profileImageUrl = null;
let carImageUrl = null;

const profileInput = document.getElementById("profileImageInput");
const profilePreview = document.getElementById("profilePreview");
const carInput = document.getElementById("carImageInput");
const carPreview = document.getElementById("carPreview");

const addressSelect = document.getElementById("addressSelect");
const carCompanySelect = document.getElementById("carCompanySelect");
const modelSelect = document.getElementById("modelSelect");
const yearSelect = document.getElementById("yearSelect");
const colorSelect = document.getElementById("colorSelect");

// Profile image upload
profileInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  try {
    const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });
    const data = await res.json();
    profileImageUrl = data.secure_url;
    profilePreview.src = profileImageUrl;
  } catch (err) {
    console.error("Profile upload error:", err);
  }
});

// Car image upload
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

// Load cities
fetch("../backend/data-json/israel_cities.json")
  .then(res => res.json())
  .then(data => {
    const cityNames = [...new Set(data.map(city => city.city))];
    cityNames.sort().forEach(city => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      addressSelect.appendChild(opt);
    });
  })
  .catch(console.error);

// Load car brands/models/years
let carData = {};
fetch("../backend/data-json/car_data_by_make_model_year.json")
  .then(res => res.json())
  .then(data => {
    carData = data;
    const brands = Object.keys(data).sort();
    brands.forEach(brand => {
      const opt = document.createElement("option");
      opt.value = brand;
      opt.textContent = brand;
      carCompanySelect.appendChild(opt);
    });
  })
  .catch(console.error);

carCompanySelect.addEventListener("change", () => {
  const brand = carCompanySelect.value;
  modelSelect.innerHTML = '<option value="">Select Model</option>';
  yearSelect.innerHTML = '<option value="">Select Year</option>';
  if (!brand || !carData[brand]) return;

  const models = Object.keys(carData[brand]).sort();
  models.forEach(model => {
    const opt = document.createElement("option");
    opt.value = model;
    opt.textContent = model;
    modelSelect.appendChild(opt);
  });
});

modelSelect.addEventListener("change", () => {
  const brand = carCompanySelect.value;
  const model = modelSelect.value;
  yearSelect.innerHTML = '<option value="">Select Year</option>';
  if (!brand || !model || !carData[brand][model]) return;

  carData[brand][model].forEach(year => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    yearSelect.appendChild(opt);
  });
});

// Load car colors
const colors = ["White", "Black", "Silver", "Gray", "Blue", "Red", "Brown", "Green", "Yellow", "Orange", "Gold", "Beige", "Purple"];
colors.forEach(c => {
  const opt = document.createElement("option");
  opt.value = c;
  opt.textContent = c;
  colorSelect.appendChild(opt);
});

// Validate Israeli phone
function isValidIsraeliPhone(number) {
  return /^05\d{8}$/.test(number);
}

// Animated signup message functions
function showSignupMessage({ text = "", type = "signup-success", loading = false }) {
  const msg = document.getElementById("message");
  msg.className = `signup-message ${type} active`;
  msg.style.display = "flex";
  if (loading) {
    msg.innerHTML = `<span class="spinner"></span> <span>${text}</span>`;
  } else {
    msg.innerHTML = `<span>${text}</span>`;
  }
}

function hideSignupMessage() {
  const msg = document.getElementById("message");
  msg.className = "signup-message";
  msg.style.display = "none";
  msg.innerHTML = "";
}

// Form submission with animated feedback
const form = document.getElementById("signupForm");
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const phoneNumber = form.phoneNumber.value;
  if (!isValidIsraeliPhone(phoneNumber)) {
    showSignupMessage({ text: "Phone number must be Israeli and start with 05", type: "signup-error" });
    setTimeout(hideSignupMessage, 2300);
    return;
  }

  showSignupMessage({ text: "Signing up... Please wait", type: "signup-loading", loading: true });

  const formData = {
    firstName: form.firstName.value,
    lastName: form.lastName.value,
    phoneNumber,
    email: form.email.value,
    password: form.password.value,
    volunteerStatus: form.volunteerStatus.value,
    address: form.address.value,
    img: profileImageUrl,
    carCompany: form.carCompany.value,
    model: form.model.value,
    color: form.color.value,
    year: parseInt(form.year.value),
    plate: form.plate.value,
    image: carImageUrl
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const result = await res.json();
    if (res.ok) {
      showSignupMessage({ text: result.message || "Signup completed.", type: "signup-success" });
      setTimeout(() => (window.location.href = "index.html"), 1500);
    } else {
      showSignupMessage({ text: result.message || "Signup failed. Please try again.", type: "signup-error" });
      setTimeout(hideSignupMessage, 2300);
    }
  } catch (err) {
    showSignupMessage({ text: "Signup failed. Please try again." + err.message, type: "signup-error" });
    setTimeout(hideSignupMessage, 2300);
  }
});


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


document.getElementById("carImageInput").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;

    showCarFinderModal({ message: "Analyzing car image for plate...", type: "info", timeout: false });

    const formData = new FormData();
    formData.append("upload", file);

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
            const plateInput = document.querySelector('input[name="plate"]');
            if (plateInput) plateInput.value = plate;
            showCarFinderModal({ message: "Detected Plate: " + plate, type: "success", timeout: 1400 });
        } else {
            showCarFinderModal({ message: "No plate detected.", type: "warning" });
        }
    })
    .catch(err => {
        showCarFinderModal({ message: "Plate recognition failed.", type: "error" });
    });

    setTimeout(() => { e.target.value = ""; }, 1200);
});

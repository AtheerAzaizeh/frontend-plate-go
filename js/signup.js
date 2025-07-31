/**
 * signup-page.js
 *
 * This script handles the user signup form, including image uploads,
 * dynamic population of form selects, form validation, and submission.
 * It also includes functionality for license plate recognition.
 */

(function () {

  // --- 1. CONFIGURATION & CONSTANTS ---
  const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dxmqufeag/image/upload";
  const CLOUDINARY_UPLOAD_PRESET = "platego";
  const PLATE_RECOGNIZER_API_URL = "https://api.platerecognizer.com/v1/plate-reader/";
  const PLATE_RECOGNIZER_TOKEN = "Token 60719932b2e8d8591f96ece1388544c5f2510d75";

  // --- 2. APPLICATION STATE ---
  const state = {
    profileImageUrl: null,
    carImageUrl: null,
    carData: {},
  };

  // --- 3. DOM ELEMENT REFERENCES ---
  const elements = {
    signupForm: document.getElementById("signupForm"),
    // Image Inputs & Previews
    profileImageInput: document.getElementById("profileImageInput"),
    profilePreview: document.getElementById("profilePreview"),
    carImageInput: document.getElementById("carImageInput"),
    carPreview: document.getElementById("carPreview"),
    // Form Selects
    addressSelect: document.getElementById("addressSelect"),
    carCompanySelect: document.getElementById("carCompanySelect"),
    modelSelect: document.getElementById("modelSelect"),
    yearSelect: document.getElementById("yearSelect"),
    colorSelect: document.getElementById("colorSelect"),
    // UI Feedback
    messageBox: document.getElementById("message"),
    modalCarFinder: document.getElementById("modalCarFinder"),
    modalCarFinderMessage: document.getElementById("modalCarFinderMessage"),
    modalCarFinderIcon: document.getElementById("modalCarFinderIcon"),
    modalCarFinderClose: document.getElementById("modalCarFinderClose"),
  };

  // --- 4. API & DATA HANDLING ---

  /**
   * Uploads a file to Cloudinary and returns the secure URL.
   * @param {File} file - The file to upload.
   * @returns {Promise<string|null>} The secure URL of the uploaded image, or null on failure.
   */
  async function uploadImage(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });
      const data = await res.json();
      return data.secure_url || null;
    } catch (err) {
      console.error("Image upload error:", err);
      return null;
    }
  }

  /**
   * Fetches and populates the city selection dropdown.
   */
function loadCities() {
  const GITHUB_CITIES_URL =
    'https://raw.githubusercontent.com/GabMic/' +
    'israeli-cities-and-streets-list/master/' +
    'israeli_street_and_cities_names.json';

  fetch(GITHUB_CITIES_URL)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch cities (status ${res.status})`);
      return res.json();
    })
    .then(data => {
      // Extract every entry.city_name, dedupe and sort
      const cityNames = Array.from(
        new Set(data.streets.map(entry => entry.city_name))
      ).sort((a, b) =>
        // Optionally sort with Hebrew locale:
        a.localeCompare(b, 'he') 
      );

      // Clear any existing options, then populate
      elements.addressSelect.innerHTML = '';
      populateSelect(elements.addressSelect, cityNames, 'Select City');
    })
    .catch(err => console.error('Error loading cities:', err));
}

  /**
   * Fetches car data and populates the car company dropdown.
   */
  function loadCarData() {
    fetch("../data/car_data_by_make_model_year.json")
      .then(res => res.json())
      .then(data => {
        state.carData = data;
        const brands = Object.keys(data).sort();
        populateSelect(elements.carCompanySelect, brands, "Select Company");
      })
      .catch(err => console.error("Error loading car data:", err));
  }

  // --- 5. UI & HELPER FUNCTIONS ---

  /**
   * Populates a select dropdown with options.
   * @param {HTMLSelectElement} selectElement - The dropdown element to populate.
   * @param {Array<string>} options - An array of string options.
   * @param {string} [placeholder] - Optional placeholder text for the first option.
   */
  function populateSelect(selectElement, options, placeholder) {
    selectElement.innerHTML = ""; // Clear existing options
    if (placeholder) {
      selectElement.add(new Option(placeholder, ""));
    }
    options.forEach(optionValue => {
      selectElement.add(new Option(optionValue, optionValue));
    });
  }

  /**
   * Populates the car color selection dropdown.
   */
  function populateCarColors() {
    const colors = ["White", "Black", "Silver", "Gray", "Blue", "Red", "Brown", "Green", "Yellow", "Orange", "Gold", "Beige", "Purple"];
    populateSelect(elements.colorSelect, colors, "Select Color");
  }

  /**
   * Validates an Israeli phone number format (starts with 05, 10 digits total).
   * @param {string} number - The phone number to validate.
   * @returns {boolean} True if the number is valid.
   */
  function isValidIsraeliPhone(number) {
    return /^05\d{8}$/.test(number);
  }

  /**
   * Shows an animated message to the user (e.g., for signup status).
   * @param {object} options - Configuration for the message.
   * @param {string} options.text - The message text.
   * @param {string} [options.type='signup-success'] - The message type (for styling).
   * @param {boolean} [options.loading=false] - Whether to show a loading spinner.
   */
  function showSignupMessage({ text = "", type = "signup-success", loading = false }) {
    const msg = elements.messageBox;
    msg.className = `signup-message ${type} active`;
    msg.style.display = "flex";
    msg.innerHTML = loading ? `<span class="spinner"></span> <span>${text}</span>` : `<span>${text}</span>`;
  }

  /**
   * Hides the animated signup message.
   */
  function hideSignupMessage() {
    const msg = elements.messageBox;
    msg.className = "signup-message";
    msg.style.display = "none";
    msg.innerHTML = "";
  }

  /**
   * Shows a modal with a message and icon.
   * @param {object} options - Configuration for the modal.
   * @param {string} options.message - The message to display.
   * @param {string} [options.type='info'] - The type (success, error, warning, info).
   * @param {number|boolean} [options.timeout=2000] - Auto-hide delay in ms, or false to disable.
   */
  function showCarFinderModal({ message, type = "info", timeout = 2000 }) {
    const iconMap = {
      success: '<i class="fa-solid fa-circle-check" style="color:#4caf50"></i>',
      error: '<i class="fa-solid fa-circle-xmark" style="color:#d32f2f"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation" style="color:#ffb300"></i>',
      info: '<i class="fa-solid fa-circle-info" style="color:#2564cf"></i>',
    };
    elements.modalCarFinderMessage.textContent = message || "";
    elements.modalCarFinderIcon.innerHTML = iconMap[type] || iconMap.info;
    elements.modalCarFinder.classList.add("active");

    if (timeout !== false) {
      setTimeout(() => elements.modalCarFinder.classList.remove("active"), timeout);
    }
  }

  // --- 6. EVENT HANDLERS ---

  /**
   * Handles the change event for the profile image input.
   */
  async function handleProfileImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      state.profileImageUrl = imageUrl;
      elements.profilePreview.src = imageUrl;
    }
  }

  /**
   * Handles the change event for the car image input and triggers plate recognition.
   */
  async function handleCarImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    // First, upload to Cloudinary for the form
    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      state.carImageUrl = imageUrl;
      elements.carPreview.src = imageUrl;
    }

    // Second, send to Plate Recognizer API
    showCarFinderModal({ message: "Analyzing car image for plate...", type: "info", timeout: false });
    const formData = new FormData();
    formData.append("upload", file);

    try {
      const res = await fetch(PLATE_RECOGNIZER_API_URL, {
        method: "POST",
        headers: { "Authorization": PLATE_RECOGNIZER_TOKEN },
        body: formData,
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const plate = data.results[0].plate;
        const plateInput = elements.signupForm.plate;
        if (plateInput) plateInput.value = plate;
        showCarFinderModal({ message: `Detected Plate: ${plate}`, type: "success", timeout: 2000 });
      } else {
        showCarFinderModal({ message: "No plate detected.", type: "warning" });
      }
    } catch (err) {
      showCarFinderModal({ message: "Plate recognition failed.", type: "error" });
    }
  }

  /**
   * Handles the signup form submission.
   */
  async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;

    if (!isValidIsraeliPhone(form.phoneNumber.value)) {
      showSignupMessage({ text: "Phone number must be Israeli and start with 05", type: "signup-error" });
      setTimeout(hideSignupMessage, 2300);
      return;
    }

    showSignupMessage({ text: "Signing up... Please wait", type: "signup-loading", loading: true });

    const formData = {
      firstName: form.firstName.value,
      lastName: form.lastName.value,
      phoneNumber: form.phoneNumber.value,
      email: form.email.value,
      password: form.password.value,
      address: form.address.value,
      img: state.profileImageUrl,
      carCompany: form.carCompany.value,
      model: form.model.value,
      color: form.color.value,
      year: parseInt(form.year.value, 10),
      plate: form.plate.value,
      image: state.carImageUrl,
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (res.ok) {
        showSignupMessage({ text: result.message || "Signup completed.", type: "signup-success" });
        setTimeout(() => (window.location.href = "index.html"), 1500);
      } else {
        throw new Error(result.message || "Signup failed. Please try again.");
      }
    } catch (err) {
      showSignupMessage({ text: err.message, type: "signup-error" });
      setTimeout(hideSignupMessage, 2300);
    }
  }

  // --- 7. INITIALIZATION & EVENT LISTENERS ---

  /**
   * Sets up all event listeners for the page.
   */
  function setupEventListeners() {
    elements.profileImageInput.addEventListener("change", handleProfileImageChange);
    elements.carImageInput.addEventListener("change", handleCarImageChange);
    elements.signupForm.addEventListener("submit", handleFormSubmit);
    elements.modalCarFinderClose.addEventListener("click", () => elements.modalCarFinder.classList.remove("active"));

    // Event listeners for dependent car data dropdowns
    elements.carCompanySelect.addEventListener("change", () => {
      const brand = elements.carCompanySelect.value;
      const models = brand ? Object.keys(state.carData[brand] || {}).sort() : [];
      populateSelect(elements.modelSelect, models, "Select Model");
      populateSelect(elements.yearSelect, [], "Select Year"); // Reset year
    });

    elements.modelSelect.addEventListener("change", () => {
      const brand = elements.carCompanySelect.value;
      const model = elements.modelSelect.value;
      const years = (brand && model && state.carData[brand]?.[model]) ? state.carData[brand][model] : [];
      populateSelect(elements.yearSelect, years, "Select Year");
    });
  }

  /**
   * Initializes the page by loading data and setting up listeners.
   */
  function init() {
    loadCities();
    loadCarData();
    populateCarColors();
    setupEventListeners();
  }

  // Run the initialization function when the DOM is fully loaded.
  document.addEventListener("DOMContentLoaded", init);

})();
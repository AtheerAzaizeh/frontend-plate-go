document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Initialize user profile display
    if (user) {
        const welcomeMessage = document.getElementById('welcome-message');
        const profilePictures = document.querySelectorAll('#profile-picture');

        welcomeMessage.textContent += user.firstName;
        profilePictures.forEach(img => {
            img.src = user.img;
        });

        // Update side menu profile info
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        if (profileName) profileName.textContent = user.firstName + ' ' + user.lastName;
        if (profileEmail) profileEmail.textContent = user.email;
    }

    // Fetch and display cars
    fetch(`${BACKEND_URL}/api/cars`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            const carContainer = document.getElementById('car-container');
            
            // Clear container and create sections
            carContainer.innerHTML = '';
            
            // Create main car section
            const mainCarSection = document.createElement('div');
            mainCarSection.classList.add('main-car-section');
            mainCarSection.innerHTML = '<h2 class="main-car-title">Main car</h2>';
            carContainer.appendChild(mainCarSection);
            
            // Create other car section
            const otherCarSection = document.createElement('div');
            otherCarSection.classList.add('other-car-section');
            otherCarSection.innerHTML = '<h2 class="other-car-title">other car</h2>';
            carContainer.appendChild(otherCarSection);
            
            // Display cars (for now, show all in both sections as per design)
            data.forEach((car, index) => {
                if (index === 0) {
                    addCarToSection(car, mainCarSection);
                } else {
                    addCarToSection(car, otherCarSection);
                }
            });
            
            // Add the "Add Car" box at the end
            addCarBoxToContainer(carContainer);
        })
        .catch(error => console.error('Error fetching cars:', error));

    // Modal and form handling
    const carContainer = document.getElementById('car-container');
    const addCarFormContainer = document.getElementById('addCarFormContainer');
    let carImageUrl = "";

    // Add car button click handler
    carContainer.addEventListener('click', (event) => {
        const target = event.target.closest('.add-car-button');
        if (target) {
            addCarFormContainer.classList.remove('hidden');
        }
    });

    // Close modal handlers
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('addCarFormContainer').classList.add('hidden');
    });

    document.getElementById('addCarFormContainer').addEventListener('click', (e) => {
        if (e.target.id === 'addCarFormContainer') {
            e.target.classList.add('hidden');
        }
    });

    // Cloudinary image upload
    const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dxmqufeag/image/upload";
    const CLOUDINARY_UPLOAD_PRESET = "platego";

    const carInput = document.getElementById("carImageInput");
    const carPreview = document.getElementById("carPreview");

    carInput.addEventListener("change", async function () {
        const file = this.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        try {
            const res = await fetch(CLOUDINARY_UPLOAD_URL, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            carImageUrl = data.secure_url;
            carPreview.src = carImageUrl;
        } catch (err) {
            console.error("Car upload error:", err);
        }
    });

    // Car data handling
    let carData = {};
    const carCompanySelect = document.getElementById("carCompanySelect");
    const modelSelect = document.getElementById("modelSelect");
    const yearSelect = document.getElementById("yearSelect");
    const colorSelect = document.getElementById("colorSelect");

    fetch("data/car_data_by_make_model_year.json")
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
        });

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

    // Initialize color options
    const colors = ["White", "Black", "Silver", "Gray", "Blue", "Red", "Brown", "Green", "Yellow", "Orange", "Gold", "Beige", "Purple"];
    colors.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        colorSelect.appendChild(opt);
    });

    // Form submission
    document.getElementById("addCarForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const editId = form.getAttribute("data-edit-id");

        const carCompany = carCompanySelect.value;
        const model = modelSelect.value;
        const color = colorSelect.value;
        const year = yearSelect.value;
        const plate = document.querySelector("input[name='plate']").value;

        if (!carCompany || !model || !color || !year || !plate || !carImageUrl) {
            return alert("Please fill in all the fields and upload a car image.");
        }

        const carPayload = {
            carCompany,
            model,
            color,
            year,
            plate,
            image: carImageUrl
        };

        const url = editId
            ? `${BACKEND_URL}/api/cars/${editId}`
            : `${BACKEND_URL}/api/cars`;

        const method = editId ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(carPayload)
            });

            if (!res.ok) throw new Error("Failed to save car");
            const car = await res.json();

            if (editId) {
                window.location.reload();
            } else {
                window.location.reload(); // Reload to properly reorganize sections
            }

            addCarFormContainer.classList.add("hidden");
            form.reset();
            form.removeAttribute("data-edit-id");
            document.querySelector('.submit-car-btn').textContent = "Add Car";
            carImageUrl = "";

        } catch (err) {
            console.error("Error saving car:", err);
            alert("Error saving car. Please try again.");
        }
    });

    // Helper function to add car to specific section
    function addCarToSection(car, section) {
        const carDiv = document.createElement('div');
        carDiv.classList.add('car-card');

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

    // Helper function to add "Add Car" box
    function addCarBoxToContainer(container) {
        const addCarBox = document.createElement('div');
        addCarBox.classList.add('add-car-box');

        addCarBox.innerHTML = `
            <button class="add-car-button">
                <img src="images/plus-icon.svg" alt="Add Icon">
            </button>
            <p>Add Car</p>
        `;

        container.appendChild(addCarBox);
    }

    // Setup event handlers for car cards
    function setupCarCardEvents(carDiv, car) {
        const dropdown = carDiv.querySelector('.dropdown-menu');
        const optionsIcon = carDiv.querySelector('.options-button');
        const editBtn = carDiv.querySelector('.edit-car');
        const deleteBtn = carDiv.querySelector('.delete-car');

        // Options dropdown toggle
        optionsIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.add('hidden'));
            dropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });

        // Delete car
        deleteBtn.addEventListener('click', () => {
            const confirmDelete = confirm('Are you sure you want to delete this car?');
            if (confirmDelete) {
                fetch(`${BACKEND_URL}/api/cars/${car._id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                    .then(response => {
                        if (response.ok) {
                            window.location.reload();
                        } else {
                            alert('Failed to delete car.');
                        }
                    })
                    .catch(err => {
                        console.error('Delete error:', err);
                        alert('Error deleting car. Please try again.');
                    });
            }
        });

        // Edit car
        editBtn.addEventListener('click', () => {
            // Populate form with car data
            carCompanySelect.value = car.carCompany;
            
            // Populate model dropdown
            modelSelect.innerHTML = `<option value="${car.model}">${car.model}</option>`;
            
            // Populate year dropdown
            yearSelect.innerHTML = `<option value="${car.year}">${car.year}</option>`;
            
            colorSelect.value = car.color;
            document.querySelector("input[name='plate']").value = car.plate;
            carImageUrl = car.image;
            carPreview.src = car.image;

            // Show modal and set edit mode
            document.getElementById('addCarFormContainer').classList.remove('hidden');
            document.querySelector('.submit-car-btn').textContent = "Update Car";
            document.getElementById('addCarForm').setAttribute('data-edit-id', car._id);
        });
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
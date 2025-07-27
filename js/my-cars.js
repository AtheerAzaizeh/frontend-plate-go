document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        const welcomeMessage = document.getElementById('welcome-message');
        const profilePicture = document.getElementById('profile-picture');

        welcomeMessage.textContent += user.firstName;
        profilePicture.src = user.img;
    }

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
            data.forEach(car => {
                addCarToDOM(car);
            });
        })
        .catch(error => console.error('Error fetching cars:', error));

const carContainer = document.getElementById('car-container');
const addCarFormContainer = document.getElementById('addCarFormContainer');
let carImageUrl = "";

carContainer.addEventListener('click', (event) => {
  const target = event.target.closest('.add-car-button');
  if (target) {
    addCarFormContainer.classList.remove('hidden');
  }
});

document.querySelector('.close-modal').addEventListener('click', () => {
  document.getElementById('addCarFormContainer').classList.add('hidden');
});

document.getElementById('addCarFormContainer').addEventListener('click', (e) => {
  if (e.target.id === 'addCarFormContainer') {
    e.target.classList.add('hidden');
  }
});

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

let carData = {};
fetch("data/car_data_by_make_model_year.json")
  .then(res => res.json())
  .then(data => {
    carData = data;
    const carCompanySelect = document.getElementById("carCompanySelect");
    const brands = Object.keys(data).sort();
    brands.forEach(brand => {
      const opt = document.createElement("option");
      opt.value = brand;
      opt.textContent = brand;
      carCompanySelect.appendChild(opt);
    });
  });

document.getElementById("carCompanySelect").addEventListener("change", () => {
  const brand = carCompanySelect.value;
  const modelSelect = document.getElementById("modelSelect");
  const yearSelect = document.getElementById("yearSelect");

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

document.getElementById("modelSelect").addEventListener("change", () => {
  const brand = carCompanySelect.value;
  const model = modelSelect.value;
  const yearSelect = document.getElementById("yearSelect");

  yearSelect.innerHTML = '<option value="">Select Year</option>';
  if (!brand || !model || !carData[brand][model]) return;

  carData[brand][model].forEach(year => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    yearSelect.appendChild(opt);
  });
});

const colors = ["White", "Black", "Silver", "Gray", "Blue", "Red", "Brown", "Green", "Yellow", "Orange", "Gold", "Beige", "Purple"];
const colorSelect = document.getElementById("colorSelect");
colors.forEach(c => {
  const opt = document.createElement("option");
  opt.value = c;
  opt.textContent = c;
  colorSelect.appendChild(opt);
});

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
      addCarToDOM(car);
    }

    addCarFormContainer.classList.add("hidden");
    form.reset();
    form.removeAttribute("data-edit-id");
    document.querySelector('.submit-car-btn').textContent = "Add Car";

  } catch (err) {
    console.error("Error saving car:", err);
  }
});


function addCarToDOM(car) {
  const carContainer = document.getElementById('car-container');

  const existingAddBox = carContainer.querySelector('.add-car-box');
  if (existingAddBox) {
    carContainer.removeChild(existingAddBox);
  }

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
    <div class="car-content">
      <img src="${car.image}" alt="Car Image" class="car-img2">
      <div class="car-info">
        <p><strong>${car.carCompany} ${car.model} ${car.year}</strong></p>
        <p>Plate number: ${car.plate}</p>
        <p>Number of reports: ${car.numberOfReports || 0}</p>
        <p>Car Color: ${car.color}</p>
      </div>
    </div>
  `;

  carContainer.appendChild(carDiv);

  const addcar = document.createElement('div');
  addcar.classList.add('add-car-box');

  addcar.innerHTML = `
    <button class="add-car-button">
      <img src="images/plus-icon.svg" alt="Add Icon">
    </button>
    <p>Add Car</p>`;

  carContainer.appendChild(addcar);

  const dropdown = carDiv.querySelector('.dropdown-menu');
  const optionsIcon = carDiv.querySelector('.options-button');
  const editBtn = carDiv.querySelector('.edit-car');
  const deleteBtn = carDiv.querySelector('.delete-car');

  optionsIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.add('hidden'));
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    dropdown.classList.add('hidden');
  });

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
            carDiv.remove();
          } else {
            alert('Failed to delete car.');
          }
        })
        .catch(err => {
          console.error('Delete error:', err);
        });
    }
  });

  editBtn.addEventListener('click', () => {
    carCompanySelect.value = car.carCompany;
    modelSelect.innerHTML = `<option value="${car.model}">${car.model}</option>`;
    yearSelect.innerHTML = `<option value="${car.year}">${car.year}</option>`;
    colorSelect.value = car.color;
    document.querySelector("input[name='plate']").value = car.plate;
    carImageUrl = car.image;
    carPreview.src = car.image;

    document.getElementById('addCarFormContainer').classList.remove('hidden');
    document.querySelector('.submit-car-btn').textContent = "Update Car";
    document.getElementById('addCarForm').setAttribute('data-edit-id', car._id);
  });
}
});
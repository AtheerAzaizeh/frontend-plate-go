const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dxmqufeag/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "platego";

// PROFILE IMAGE UPLOAD
const profileInput = document.getElementById("profileImageInput");
const profilePreview = document.getElementById("profilePreview");
let profileImageUrl = null;

profileInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

<<<<<<< Updated upstream
    fetch(`${BACKEND_URL}/api/users/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        const messageDiv = document.getElementById('message');
        messageDiv.className = 'signup-message signup-success';
        messageDiv.innerText = 'Registration successful!';
        messageDiv.style.display = 'block';
         window.location.href = 'index.html';
    })
    .catch(error => {
        console.error('Error:', error);
        const messageDiv = document.getElementById('message');
        messageDiv.className = 'signup-message signup-error';
        messageDiv.innerText = 'Registration failed: ' + error.message;
        messageDiv.style.display = 'block';
=======
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
>>>>>>> Stashed changes
    });
    const data = await res.json();
    profileImageUrl = data.secure_url;
    profilePreview.src = profileImageUrl;
  } catch (err) {
    console.error("Error uploading profile image:", err);
  }
});

// CAR IMAGE UPLOAD
const carInput = document.getElementById("carImageInput");
const carPreview = document.getElementById("carPreview");
let carImageUrl = null;

carInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    carImageUrl = data.secure_url;
    carPreview.src = carImageUrl;
  } catch (err) {
    console.error("Error uploading car image:", err);
  }
});

// FORM SUBMIT
document.getElementById('signupForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const formData = {
    phoneNumber: event.target.phoneNumber.value,
    firstName: event.target.firstName.value,
    lastName: event.target.lastName.value,
    email: event.target.email.value,
    password: event.target.password.value,
    address: event.target.address.value,
    img: profileImageUrl,
    cars: [
      {
        model: event.target.carModel.value,
        color: event.target.carColor.value,
        numberOfReports: 0,
        image: carImageUrl,
        plate: event.target.carPlate.value
      }
    ]
  };

  console.log("carImageUrl:", carImageUrl);
  console.log("Sending Form Data:", formData);


  fetch('https://platego-smi4.onrender.com/api/users/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  })
  .then(response => {
    if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
    return response.json();
  })
  .then(data => {
    const messageDiv = document.getElementById('message');
    messageDiv.className = 'signup-message signup-success';
    messageDiv.innerText = 'Registration successful!';
    messageDiv.style.display = 'block';
    window.location.href = 'index.html';
  })
  .catch(error => {
    const messageDiv = document.getElementById('message');
    messageDiv.className = 'signup-message signup-error';
    messageDiv.innerText = 'Registration failed: ' + error.message;
    messageDiv.style.display = 'block';
  });
});

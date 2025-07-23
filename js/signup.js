const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dxmqufeag/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "platego";

let profileImageUrl = null;
let carImageUrl = null;

const profileInput = document.getElementById("profileImageInput");
const profilePreview = document.getElementById("profilePreview");

const carInput = document.getElementById("carImageInput");
const carPreview = document.getElementById("carPreview");

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

function isValidIsraeliPhone(number) {
  return /^05\d{8}$/.test(number);
}

const form = document.getElementById("signupForm");
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const phoneNumber = form.phoneNumber.value;
  if (!isValidIsraeliPhone(phoneNumber)) {
    alert("Phone number must be Israeli and start with 05");
    return;
  }

  const formData = {
    firstName: form.firstName.value,
    lastName: form.lastName.value,
    phoneNumber,
    email: form.email.value,
    password: form.password.value,
    role: form.role.value,
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
    const msg = document.getElementById("message");
    msg.style.display = "block";
    msg.innerText = result.message || "Signup completed.";
    msg.className = res.ok ? "signup-message signup-success" : "signup-message signup-error";

    if (res.ok) {
      setTimeout(() => (window.location.href = "index.html"), 1500);
    }
  } catch (err) {
    console.error("Signup error:", err);
    const msg = document.getElementById("message");
    msg.style.display = "block";
    msg.innerText = "Signup failed. Please try again.";
    msg.className = "signup-message signup-error";
  }
});

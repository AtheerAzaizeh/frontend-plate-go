document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        const welcomeMessage = document.getElementById('welcome-message');
        const profilePicture = document.getElementById('profile-picture');

        welcomeMessage.textContent += user.firstName;
        profilePicture.src = user.img;
    }

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const plateNumber = urlParams.get('plate');

    fetch(`https://backend-3-vnac.onrender.com/api/cars/${plateNumber}`, {
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
    .then(car => {
        displayCarDetails(car);
        currentCar = car; 
    })
    .catch(error => {
        console.error('Error fetching car:', error);
        document.getElementById('car-not-found-popup').style.display = 'block';
    });

    document.getElementById('make-report-button').addEventListener('click', openReportForm);
    document.getElementById('close-report-form').addEventListener('click', closeReportForm);
    document.getElementById('submit-report-reason').addEventListener('click', submitReportReason);
    document.getElementById('close-location-form').addEventListener('click', closeLocationForm);
    document.getElementById('submit-location').addEventListener('click', submitLocation);
    document.getElementById('close-not-found-popup').addEventListener('click', closeModal);
    document.getElementById('locate-me-button').addEventListener('click', locateMe);
});

let reportReason = '';
let reportDetails = {};
let currentCar = null; 

function displayCarDetails(car) {
    currentCar = car; 
    document.getElementById('car-plate-number').innerText = car.plate;
    document.getElementById('car-image-wrapper').innerHTML = `<img src="${car.image}" alt="Car Image">`;
    document.getElementById('car-company').innerText = `Company: ${car.carCompany}`;
    document.getElementById('car-model').innerText = `Model: ${car.model}`;
    document.getElementById('car-color').innerText = `Color: ${car.color}`;
    document.getElementById('car-year').innerText = `Year: ${car.year}`;
}

function openReportForm() {
    document.getElementById('report-form-modal').style.display = 'block';
    document.querySelector('.car-info-wrapper').style.opacity = '0.5';
}

function closeReportForm() {
    document.getElementById('report-form-modal').style.display = 'none';
    document.querySelector('.car-info-wrapper').style.opacity = '1';
}

function submitReportReason() {
    reportReason = document.getElementById('report-reason').value;
    closeReportForm();
    openLocationForm();
}

function openLocationForm() {
    document.getElementById('location-form-modal').style.display = 'block';
}

function closeLocationForm() {
    document.getElementById('location-form-modal').style.display = 'none';
    document.querySelector('.car-info-wrapper').style.opacity = '1';
}

function closeModal() {
    document.getElementById('car-not-found-popup').style.display = 'none';
}

function submitLocation() {
    const token = localStorage.getItem('token');
    const location = document.getElementById('report-location').value;
    const report = {
        plate: currentCar.plate,
        reason: reportReason,
        location: location,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        image: currentCar.image,
        map: null,
        carID: currentCar.carID,
        userID: currentCar.userID
    };

    fetch('https://backend-3-vnac.onrender.com/api/reports', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(report)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log('Report created successfully:', data);
        showSuccessModal();
    })
    .catch(error => {
        console.error('Error creating report:', error);
    });
}

function showSuccessModal() {
    const successModal = document.getElementById('successModal');
    successModal.style.display = 'block';

    
    const sendMessageButton = document.createElement('button');
    sendMessageButton.innerText = 'Cancel';
    sendMessageButton.onclick = () => {
        const carDetails = encodeURIComponent(JSON.stringify(currentCar));
        window.location.href = `report_history.html?car=${carDetails}`;
    };

    const modalContent = successModal.querySelector('.modal-content');
    modalContent.appendChild(sendMessageButton);
}

function closeSuccessModal() {
    const successModal = document.getElementById('successModal');
    successModal.style.display = 'none';
    window.location.href = 'report_history.html';
}

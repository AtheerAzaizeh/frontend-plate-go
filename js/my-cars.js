document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        const welcomeMessage = document.getElementById('welcome-message');
        const profilePicture = document.getElementById('profile-picture');

        welcomeMessage.textContent += user.firstName;
        profilePicture.src = user.img;
    }

    fetch('https://backend-3-vnac.onrender.com/api/cars', {
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

    const addCarButton = document.querySelector('.add-car-button');
    addCarButton.addEventListener('click', () => {
        const carCompany = prompt('Enter car company:');
        const model = prompt('Enter car model:');
        const color = prompt('Enter car color:');
        const year = prompt('Enter car year:');
        const plate = prompt('Enter car plate:');
        const image = prompt('Enter car image URL:');
        const numberOfReports = 0;

        if (carCompany && model && color && year && plate && image) {
            fetch('https://backend-3-vnac.onrender.com/api/cars', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ carCompany, model, color, year, plate, image, numberOfReports })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(car => {
                addCarToDOM(car);
            })
            .catch(error => console.error('Error adding car:', error));
        } else {
            alert('Please fill in all the details.');
        }
    });

    function addCarToDOM(car) {
        const carContainer = document.getElementById('car-container');

        const carDiv = document.createElement('div');
        carDiv.classList.add('car');

        const carDetailsDiv = document.createElement('div');
        carDetailsDiv.classList.add('car-details');

        const carImageDiv = document.createElement('div');
        carImageDiv.classList.add('car-image');

        carDetailsDiv.innerHTML = `
            <p><strong>plateNumber:</strong> ${car.plate}</p>
            <p><strong>Company:</strong> ${car.carCompany}</p>
            <p><strong>Model:</strong> ${car.model}</p>
            <p><strong>Color:</strong> ${car.color}</p>
            <p><strong>Year:</strong> ${car.year}</p>
            <p><strong>Number of Reports:</strong> ${car.numberOfReports}</p>
            <span class="options-button"><i class="fa fa-trash"></i></span>
        `;

        carImageDiv.innerHTML = `<img src="${car.image}" alt="Car Image">`;

        carDiv.appendChild(carDetailsDiv);
        carDiv.appendChild(carImageDiv);

        carContainer.appendChild(carDiv);

        const optionsButton = carDetailsDiv.querySelector('.options-button');
        optionsButton.addEventListener('click', () => {
            const confirmDelete = confirm('Are you sure you want to delete this car?');
            if (confirmDelete) {
                fetch(`https://backend-3-vnac.onrender.com/api/cars/${car.carID}`, {
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
                });
            }
        });
    }
});

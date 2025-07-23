document.getElementById('signupForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = {
        phoneNumber: event.target.phoneNumber.value,
        firstName: event.target.firstName.value,
        lastName: event.target.lastName.value,
        email: event.target.email.value,
        password: event.target.password.value,
        address: event.target.address.value,
        img: event.target.img.value,
        cars: [
            {
                model: event.target.carModel.value,
                color: event.target.carColor.value,
                numberOfReports: 0,
                image: event.target.carImage.value,
                plate: event.target.carPlate.value
            }
        ]
    };

    console.log('Form Data:', formData);

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
    });
});

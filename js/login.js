document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = {
        email: event.target.email.value,
        password: event.target.password.value
    };

    console.log('Form Data:', formData);

    fetch(`${BACKEND_URL}/api/auth/login`, {
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
        messageDiv.className = 'login-message login-success';
        messageDiv.innerText = 'Login successful!';
        messageDiv.style.display = 'block';

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        window.location.href = 'home-page.html';
    })
    .catch(error => {
        console.error('Error:', error);
        const messageDiv = document.getElementById('message');
        messageDiv.className = 'login-message login-error';
        messageDiv.innerText = 'Login failed: ' + error.message;
        messageDiv.style.display = 'block';
    });
});

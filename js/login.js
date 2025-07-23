document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const formData = {
        emailOrPhone: event.target.email.value,
        password: event.target.password.value
    };

    try {
        const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const messageDiv = document.getElementById('message');

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Login failed');
        }

        const data = await res.json();
        messageDiv.className = 'login-message login-success';
        messageDiv.innerText = 'Login successful!';
        messageDiv.style.display = 'block';

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        setTimeout(() => {
            window.location.href = 'home-page.html';
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        const messageDiv = document.getElementById('message');
        messageDiv.className = 'login-message login-error';
        messageDiv.innerText = 'Login failed: ' + error.message;
        messageDiv.style.display = 'block';
    }
});

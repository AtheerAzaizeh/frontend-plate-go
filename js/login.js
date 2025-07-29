function showLoginMessage({ text = "", type = "login-success", loading = false }) {
    const msg = document.getElementById("message");
    msg.className = `login-message ${type} active`;
    msg.style.display = "flex";
    if (loading) {
        msg.innerHTML = `<span class="spinner"></span> <span>${text}</span>`;
    } else {
        msg.innerHTML = `<span>${text}</span>`;
    }
}

function hideLoginMessage() {
    const msg = document.getElementById("message");
    msg.className = "login-message";
    msg.style.display = "none";
    msg.innerHTML = "";
}

document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    showLoginMessage({ text: "Logging in... Please wait", type: "login-loading", loading: true });

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

        if (!res.ok) {
            const err = await res.json();
            showLoginMessage({ text: err.message || 'Login failed', type: "login-error" });
            setTimeout(hideLoginMessage, 2500);
            throw new Error(err.message || 'Login failed');
        }

        const data = await res.json();
        showLoginMessage({ text: 'Login successful!', type: "login-success" });

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        setTimeout(() => {
            window.location.href = 'home-page.html';
        }, 1300);

    } catch (error) {
        showLoginMessage({ text: 'Login failed: ' + error.message, type: "login-error" });
        setTimeout(hideLoginMessage, 2500);
    }
});

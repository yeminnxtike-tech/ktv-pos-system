document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const showPasswordBtn = document.getElementById('show-password');
    const loginBtn = document.getElementById('login-btn');
    
    if (showPasswordBtn) {
        showPasswordBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                showToast('ကျေးဇူးပြု၍ အသုံးပြုသူအမည်နှင့် စကားဝှက် ထည့်ပါ', 'error');
                return;
            }
            
            // Disable button and show loading
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> လော့ဂ်အင် လုပ်နေသည်...';
            }
            
            // Submit form
            setTimeout(() => {
                loginForm.submit();
            }, 1000);
        });
    }
    
    // Auto-focus on username
    if (usernameInput) {
        usernameInput.focus();
    }
    
    // Enter key to submit
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }
});

function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 15px;
            right: 15px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        document.body.appendChild(container);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    toast.style.cssText = `
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
        font-family: 'Noto Sans Myanmar', sans-serif;
        font-size: 13px;
        min-width: 280px;
        max-width: 350px;
        color: white;
    `;
    
    toast.innerHTML = message;
    container.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

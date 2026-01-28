// utils.js - Common utility functions for KTV POS

// Toast notification system
const ktvUtils = {
    showToast: function(message, type = 'info') {
        console.log('Showing toast:', message, type);
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        
        // Set icon based on type
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'warning') icon = 'fa-exclamation-triangle';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-message">${message}</div>
            <div class="toast-close">
                <i class="fas fa-times"></i>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(toast);
        
        // Show toast with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 5000);
        
        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        });
        
        return toast;
    },
    
    // Confirm dialog
    confirmDialog: function(message) {
        return new Promise((resolve) => {
            const result = confirm(message);
            resolve(result);
        });
    },
    
    // Format currency
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('my-MM').format(amount) + ' ကျပ်';
    },
    
    // Loading overlay
    showLoading: function(message = 'ဆာဗာနှင့်ချိတ်ဆက်နေပါသည်...') {
        // Remove existing loading
        this.hideLoading();
        
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.id = 'ktv-loading-overlay';
        loading.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;
        document.body.appendChild(loading);
    },
    
    hideLoading: function() {
        const loading = document.getElementById('ktv-loading-overlay');
        if (loading && loading.parentNode) {
            document.body.removeChild(loading);
        }
    },
    
    // Fetch with error handling
    fetchWithError: async function(url, options = {}) {
        this.showLoading();
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            this.hideLoading();
            
            if (!data.success) {
                throw new Error(data.error || 'အမှားတစ်ခုဖြစ်နေသည်');
            }
            
            return data;
        } catch (error) {
            this.hideLoading();
            console.error('Fetch error:', error);
            this.showToast(error.message || 'ဆာဗာနှင့်ချိတ်ဆက်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
            throw error;
        }
    }
};

// Make it globally available
window.ktvUtils = ktvUtils;

// Add toast CSS if not exists
if (!document.querySelector('#ktv-utils-css')) {
    const toastCSS = `
        .toast-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 300px;
            max-width: 400px;
            background: rgba(26, 35, 126, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 100000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            backdrop-filter: blur(10px);
        }

        .toast-notification.show {
            transform: translateX(0);
        }

        .toast-notification.success {
            border-left: 4px solid #4CAF50;
        }

        .toast-notification.error {
            border-left: 4px solid #F44336;
        }

        .toast-notification.warning {
            border-left: 4px solid #FF9800;
        }

        .toast-notification.info {
            border-left: 4px solid #2196F3;
        }

        .toast-icon {
            font-size: 20px;
            flex-shrink: 0;
        }

        .toast-notification.success .toast-icon {
            color: #4CAF50;
        }

        .toast-notification.error .toast-icon {
            color: #F44336;
        }

        .toast-notification.warning .toast-icon {
            color: #FF9800;
        }

        .toast-notification.info .toast-icon {
            color: #2196F3;
        }

        .toast-message {
            flex: 1;
            color: #ffffff;
            font-size: 14px;
            line-height: 1.4;
        }

        .toast-close {
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            padding: 5px;
            border-radius: 50%;
            transition: background 0.2s;
            flex-shrink: 0;
        }

        .toast-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
        }

        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            backdrop-filter: blur(3px);
        }

        .loading-spinner {
            text-align: center;
            color: #ffffff;
        }

        .loading-spinner .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #ff4081;
            animation: spin 1s ease-in-out infinite;
            margin: 0 auto 15px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .loading-text {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            margin-top: 10px;
        }
    `;

    const style = document.createElement('style');
    style.id = 'ktv-utils-css';
    style.textContent = toastCSS;
    document.head.appendChild(style);
}

console.log('KTV Utils loaded successfully');

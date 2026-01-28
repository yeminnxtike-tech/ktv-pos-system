/**
 * KTV POS System - Base JavaScript
 * Common functions for all pages
 */

// Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    // Remove existing toasts
    const existingToasts = container.querySelectorAll('.toast-notification');
    if (existingToasts.length > 3) {
        existingToasts[0].remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    
    // Set styles based on type
    if (type === 'error') {
        toast.style.background = 'linear-gradient(135deg, #ff5252, #d32f2f)';
    } else if (type === 'info') {
        toast.style.background = 'linear-gradient(135deg, #4fc3f7, #0288d1)';
    } else if (type === 'warning') {
        toast.style.background = 'linear-gradient(135deg, #ff9800, #ef6c00)';
    } else {
        toast.style.background = 'linear-gradient(135deg, #1a237e, #311b92)';
    }
    
    container.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, 3000);
}

// Confirm Dialog
function showConfirm(message, onConfirm, onCancel = null) {
    if (confirm(message)) {
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    } else {
        if (typeof onCancel === 'function') {
            onCancel();
        }
    }
}

// Format Currency (Myanmar Style)
function formatCurrency(amount) {
    if (isNaN(amount)) amount = 0;
    return new Intl.NumberFormat('my-MM').format(amount) + ' Ks';
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Format Time
function formatTime(dateString) {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Load Data from API
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('ဒေတာယူခြင်းမအောင်မြင်ပါ', 'error');
        throw error;
    }
}

// Save to LocalStorage with expiration
function setLocalStorage(key, data, expiresInHours = 24) {
    const item = {
        data: data,
        expiry: new Date().getTime() + (expiresInHours * 60 * 60 * 1000)
    };
    localStorage.setItem(key, JSON.stringify(item));
}

// Get from LocalStorage with expiration check
function getLocalStorage(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    const now = new Date().getTime();
    
    if (now > item.expiry) {
        localStorage.removeItem(key);
        return null;
    }
    
    return item.data;
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Validate Form
function validateForm(formId, rules) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    let isValid = true;
    const errors = [];
    
    for (const field in rules) {
        const input = form.querySelector(`[name="${field}"]`);
        if (!input) continue;
        
        const value = input.value.trim();
        const rule = rules[field];
        
        if (rule.required && !value) {
            isValid = false;
            errors.push(`${rule.label} လိုအပ်ပါသည်`);
            input.classList.add('error');
        } else if (rule.minLength && value.length < rule.minLength) {
            isValid = false;
            errors.push(`${rule.label} အနည်းဆုံး ${rule.minLength} လုံးရှိရပါမည်`);
            input.classList.add('error');
        } else if (rule.pattern && !rule.pattern.test(value)) {
            isValid = false;
            errors.push(`${rule.label} ပုံစံမမှန်ပါ`);
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    }
    
    if (!isValid && errors.length > 0) {
        showToast(errors[0], 'error');
    }
    
    return isValid;
}

// Initialize tooltips
function initTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function(e) {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            tooltip.style.position = 'absolute';
            tooltip.style.background = 'rgba(0,0,0,0.8)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '5px 10px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '11px';
            tooltip.style.zIndex = '10000';
            tooltip.style.whiteSpace = 'nowrap';
            
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
            tooltip.style.left = (rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';
            
            this._tooltip = tooltip;
        });
        
        element.addEventListener('mouseleave', function() {
            if (this._tooltip && this._tooltip.parentNode) {
                this._tooltip.parentNode.removeChild(this._tooltip);
            }
        });
    });
}

// Pagination helper
function createPagination(currentPage, totalPages, onPageChange) {
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    // Previous button
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-sm';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = () => onPageChange(currentPage - 1);
        pagination.appendChild(prevBtn);
    }
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => onPageChange(i);
        pagination.appendChild(pageBtn);
    }
    
    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-sm';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = () => onPageChange(currentPage + 1);
        pagination.appendChild(nextBtn);
    }
    
    return pagination;
}

// Export functions to window object
window.ktvUtils = {
    showToast,
    showConfirm,
    formatCurrency,
    formatDate,
    formatTime,
    fetchData,
    setLocalStorage,
    getLocalStorage,
    debounce,
    validateForm,
    initTooltips,
    createPagination
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initTooltips();
    
    // Add error class to form inputs on invalid
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('invalid', function(e) {
            e.preventDefault();
            this.classList.add('error');
        });
        
        input.addEventListener('input', function() {
            this.classList.remove('error');
        });
    });
    
    // Auto-hide flash messages after 5 seconds
    setTimeout(() => {
        const flashMessages = document.getElementById('flash-messages');
        if (flashMessages) {
            flashMessages.style.transition = 'opacity 0.5s ease';
            flashMessages.style.opacity = '0';
            setTimeout(() => {
                if (flashMessages.parentNode) {
                    flashMessages.parentNode.removeChild(flashMessages);
                }
            }, 500);
        }
    }, 5000);
    
    // Backup button functionality
    const backupBtn = document.querySelector('.btn-backup');
    if (backupBtn) {
        backupBtn.addEventListener('click', function() {
            showConfirm('Database ကို ကူးယူမှာသေချာပါသလား?', function() {
                // Simulate backup process
                showToast('Database ကူးယူနေပါသည်...', 'info');
                
                setTimeout(() => {
                    showToast('Database ကူးယူပြီးပါပြီ', 'success');
                }, 1500);
            });
        });
    }
    
    // Update database size indicator
    function updateDbInfo() {
        // This would typically come from an API
        const dbSize = '0.7';
        const dbCount = '58';
        
        document.querySelectorAll('#db-size, #db-size-footer').forEach(el => {
            el.textContent = `${dbSize} MB`;
        });
        
        const dbCountEl = document.getElementById('db-count');
        if (dbCountEl) {
            dbCountEl.textContent = dbCount;
        }
    }
    
    updateDbInfo();
});

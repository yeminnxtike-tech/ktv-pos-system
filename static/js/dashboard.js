document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded');
    
    // Initialize charts
    initCharts();
    
    // Update time
    updateTime();
    setInterval(updateTime, 60000);
    
    // Setup event listeners
    setupEventListeners();
    
    // Load data
    loadDashboardData();
});

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('my-MM', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    
    const timeElements = document.querySelectorAll('.current-time');
    timeElements.forEach(el => {
        el.textContent = timeStr;
    });
}

function initCharts() {
    // Sales Chart
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        const salesChart = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'အရောင်း (သိန်း)',
                    data: [120, 150, 180, 200, 220, 250, 280, 300, 320, 350, 380, 400],
                    borderColor: '#ff4081',
                    backgroundColor: 'rgba(255, 64, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            callback: function(value) {
                                return value + 'K';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Category Chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        const categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Beer', 'အရက်', 'အစား', 'အခန်း', 'အခြား'],
                datasets: [{
                    data: [35, 25, 20, 15, 5],
                    backgroundColor: [
                        '#ff4081',
                        '#9c27b0',
                        '#4CAF50',
                        '#2196F3',
                        '#FF9800'
                    ],
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            padding: 20
                        }
                    }
                }
            }
        });
    }
}

function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.querySelector('i').className = 'fas fa-spinner fa-spin';
            loadDashboardData();
            setTimeout(() => {
                this.querySelector('i').className = 'fas fa-sync-alt';
                showToast('ဒေတာများ ပြန်လည်တင်ပြီးပါပြီ', 'success');
            }, 1000);
        });
    }
    
    // Quick action buttons
    const quickActionBtns = document.querySelectorAll('.quick-action');
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            handleQuickAction(action);
        });
    });
}

function handleQuickAction(action) {
    switch(action) {
        case 'new-order':
            window.location.href = '/sale';
            break;
        case 'check-room':
            window.location.href = '/rooms';
            break;
        case 'add-item':
            window.location.href = '/menu?action=add';
            break;
        case 'view-report':
            window.location.href = '/reports';
            break;
        default:
            console.log('Unknown action:', action);
    }
}

function loadDashboardData() {
    // This would typically fetch from API
    console.log('Loading dashboard data...');
    
    // Simulate API call
    setTimeout(() => {
        // Update stats
        const stats = {
            todaySales: '1,250,000',
            activeRooms: '8',
            totalOrders: '45',
            lowStockItems: '3'
        };
        
        Object.keys(stats).forEach(key => {
            const el = document.getElementById(key);
            if (el) {
                el.textContent = stats[key];
            }
        });
    }, 500);
}

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

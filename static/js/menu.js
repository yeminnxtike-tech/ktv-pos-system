// Menu Page JavaScript with Sale Integration
// Updated to handle real-time stock updates and sale synchronization

// ===========================
// Global Variables
// ===========================
let allMenuItems = [];
let filteredItems = [];
let currentFilter = 'all';
let currentStatusFilter = 'all';

// ===========================
// Initialization
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Menu page loaded - Initializing...');
    
    // Initialize filters and search
    setupEventListeners();
    
    // Load initial data
    loadMenuData();
    
    // Update stats
    updateStats();
    
    console.log('Menu page initialization complete');
});

// ===========================
// Event Listeners Setup
// ===========================
function setupEventListeners() {
    // Add item button
    const addBtn = document.getElementById('add-item-btn');
    if (addBtn) {
        addBtn.addEventListener('click', openAddItemModal);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadMenuData();
            showToast('Menu items ပြန်လည်တင်နေပါသည်...', 'info');
        });
    }
    
    // Search input
    const searchInput = document.getElementById('menu-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterMenuItems();
        });
    }
    
    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            currentFilter = this.value;
            filterMenuItems();
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentStatusFilter = this.value;
            filterMenuItems();
        });
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// ===========================
// Data Loading Functions
// ===========================
function loadMenuData() {
    const menuBody = document.getElementById('menu-items-body');
    
    // Show loading
    menuBody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center">
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Menu items တင်နေပါသည်...</p>
                </div>
            </td>
        </tr>
    `;
    
    fetch('/api/menu_items_full')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.items) {
                allMenuItems = data.items;
                renderMenuItems(allMenuItems);
                updateStats();
            } else {
                throw new Error(data.error || 'Failed to load menu items');
            }
        })
        .catch(error => {
            console.error('Error loading menu items:', error);
            menuBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Menu items တင်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်</p>
                            <button onclick="loadMenuData()" class="btn btn-sm btn-primary mt-2">
                                <i class="fas fa-redo"></i> ပြန်လည်တင်ရန်
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            showToast('Menu items တင်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
        });
}

// ===========================
// Rendering Functions
// ===========================
function renderMenuItems(items) {
    const menuBody = document.getElementById('menu-items-body');
    
    if (!items || items.length === 0) {
        menuBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>မီနူးပစ္စည်းများ မရှိသေးပါ</p>
                        <p class="small">ပစ္စည်းအသစ်ထည့်ရန် အောက်ပါခလုတ်ကို နှိပ်ပါ</p>
                        <button onclick="openAddItemModal()" class="btn btn-sm btn-primary mt-2">
                            <i class="fas fa-plus"></i> ပစ္စည်းအသစ်ထည့်ရန်
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    items.forEach((item, index) => {
        const isLowStock = item.stock > 0 && item.stock <= (item.min_stock || 5);
        const isOutOfStock = item.stock <= 0;
        
        // Determine status badge
        let statusBadge = '';
        if (item.status === 'inactive') {
            statusBadge = '<span class="status-badge status-inactive">Inactive</span>';
        } else if (isOutOfStock) {
            statusBadge = '<span class="status-badge status-out">Out of Stock</span>';
        } else if (item.status === 'active') {
            statusBadge = '<span class="status-badge status-active">Active</span>';
        } else {
            statusBadge = `<span class="status-badge">${item.status}</span>`;
        }
        
        // Stock display
        let stockClass = '';
        if (isOutOfStock) stockClass = 'out-of-stock';
        else if (isLowStock) stockClass = 'low-stock';
        
        html += `
            <tr data-item-id="${item.id}" 
                data-category="${item.category_name || 'other'}" 
                data-status="${item.status}"
                data-stock="${item.stock}">
                
                <td>${index + 1}</td>
                
                <td>
                    <div class="item-image">
                        ${item.image_url ? 
                            `<img src="${item.image_url}" alt="${item.name}" 
                                  onerror="this.src='https://via.placeholder.com/60x60/1a237e/ffffff?text=No+Image'">` :
                            `<div class="no-image">
                                <i class="fas fa-utensils"></i>
                             </div>`
                        }
                    </div>
                </td>
                
                <td>
                    <div class="item-name">${item.name}</div>
                    ${item.description ? 
                        `<small class="item-desc">${item.description.substring(0, 50)}${item.description.length > 50 ? '...' : ''}</small>` : 
                        ''
                    }
                </td>
                
                <td>
                    <span class="category-badge category-${item.category_name || 'other'}">
                        ${item.category_display || item.category_name || 'Other'}
                    </span>
                </td>
                
                <td class="text-success">
                    <strong>${item.sale_price ? item.sale_price.toLocaleString() : '0'} Ks</strong>
                    ${item.cost_price ? 
                        `<br><small class="text-muted">ကြေး: ${item.cost_price.toLocaleString()} Ks</small>` : 
                        ''
                    }
                </td>
                
                <td>
                    <div class="stock-info">
                        <span class="stock-value ${stockClass}">
                            ${item.stock} ${item.unit || 'ခု'}
                        </span>
                        ${item.min_stock ? 
                            `<br><small class="min-stock">(min: ${item.min_stock})</small>` : 
                            ''
                        }
                    </div>
                </td>
                
                <td>
                    ${statusBadge}
                </td>
                
                <td>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-info" onclick="openEditItemModal(${item.id})" title="ပြင်ဆင်ရန်">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="updateStock(${item.id})" title="လက်ကျန်ပြင်ရန်">
                            <i class="fas fa-box"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="uploadImage(${item.id})" title="ပုံထည့်ရန်">
                            <i class="fas fa-image"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteItem(${item.id})" title="ဖျက်ရန်">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    menuBody.innerHTML = html;
}

// ===========================
// Filter Functions
// ===========================
function filterMenuItems() {
    const searchText = document.getElementById('menu-search').value.toLowerCase();
    
    filteredItems = allMenuItems.filter(item => {
        // Search filter
        const matchesSearch = !searchText || 
            item.name.toLowerCase().includes(searchText) ||
            (item.description && item.description.toLowerCase().includes(searchText));
        
        // Category filter
        const matchesCategory = currentFilter === 'all' || 
            item.category_name === currentFilter;
        
        // Status filter
        const isOutOfStock = item.stock <= 0;
        const isLowStock = item.stock > 0 && item.stock <= (item.min_stock || 5);
        
        let matchesStatus = true;
        if (currentStatusFilter !== 'all') {
            switch(currentStatusFilter) {
                case 'active':
                    matchesStatus = item.status === 'active';
                    break;
                case 'inactive':
                    matchesStatus = item.status === 'inactive';
                    break;
                case 'out_of_stock':
                    matchesStatus = isOutOfStock;
                    break;
                case 'low_stock':
                    matchesStatus = isLowStock && item.status === 'active';
                    break;
            }
        }
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    renderMenuItems(filteredItems);
    updateStats();
}

// ===========================
// Stats Functions
// ===========================
function updateStats() {
    const activeCount = allMenuItems.filter(item => item.status === 'active').length;
    const lowStockCount = allMenuItems.filter(item => 
        item.stock > 0 && item.stock <= (item.min_stock || 5) && item.status === 'active'
    ).length;
    const outOfStockCount = allMenuItems.filter(item => item.stock <= 0 && item.status === 'active').length;
    
    document.getElementById('active-count').textContent = activeCount;
    document.getElementById('low-stock-count').textContent = lowStockCount;
    document.getElementById('out-of-stock-count').textContent = outOfStockCount;
}

// ===========================
// Item Modal Functions
// ===========================
function openAddItemModal() {
    const modal = document.getElementById('item-modal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('modal-title').textContent = 'ပစ္စည်းအသစ်ထည့်ရန်';
        document.getElementById('item-form').reset();
        document.getElementById('item-id').value = '';
    }
}

function openEditItemModal(itemId) {
    fetch(`/api/menu_item/${itemId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.item) {
                const item = data.item;
                const modal = document.getElementById('item-modal');
                
                document.getElementById('modal-title').textContent = 'ပစ္စည်းပြင်ဆင်ရန်';
                document.getElementById('item-id').value = item.id;
                document.getElementById('item-name').value = item.name;
                document.getElementById('category').value = item.category_id || '';
                document.getElementById('unit').value = item.unit || 'ခု';
                document.getElementById('sale-price').value = item.sale_price;
                document.getElementById('cost-price').value = item.cost_price || '';
                document.getElementById('stock').value = item.stock;
                document.getElementById('min-stock').value = item.min_stock || 5;
                document.getElementById('description').value = item.description || '';
                document.getElementById('item-status').value = item.status || 'active';
                
                if (modal) {
                    modal.style.display = 'block';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching item:', error);
            showToast('ပစ္စည်းအချက်အလက် ယူရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
        });
}

function closeItemModal() {
    const modal = document.getElementById('item-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function saveItem() {
    const form = document.getElementById('item-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validation
    if (!data.name || !data.name.trim()) {
        showToast('ပစ္စည်းအမည် ထည့်သွင်းပါ', 'error');
        return;
    }
    
    if (!data.category_id) {
        showToast('Category ရွေးပါ', 'error');
        return;
    }
    
    if (!data.sale_price || parseInt(data.sale_price) <= 0) {
        showToast('ရောင်းဈေး ထည့်သွင်းပါ', 'error');
        return;
    }
    
    // Convert numeric values
    data.sale_price = parseInt(data.sale_price) || 0;
    data.cost_price = parseInt(data.cost_price) || 0;
    data.stock = parseInt(data.stock) || 0;
    data.min_stock = parseInt(data.min_stock) || 5;
    data.category_id = parseInt(data.category_id) || null;
    
    const isEdit = data.item_id && data.item_id !== '';
    const url = isEdit ? '/api/update_menu_item' : '/api/add_menu_item';
    const method = isEdit ? 'PUT' : 'POST';
    
    // Disable save button and show loading
    const saveBtn = document.querySelector('#item-modal .btn-primary');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> သိမ်းဆည်းနေသည်...';
    saveBtn.disabled = true;
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('ပစ္စည်းသိမ်းဆည်းပြီးပါပြီ', 'success');
            closeItemModal();
            
            // Reload data after a short delay
            setTimeout(() => {
                loadMenuData();
            }, 500);
        } else {
            showToast(data.error || 'သိမ်းဆည်းရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving item:', error);
        showToast('ဆာဗာနှင့်ချိတ်ဆက်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
    })
    .finally(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    });
}

// ===========================
// Item Management Functions
// ===========================
function deleteItem(itemId) {
    const row = document.querySelector(`tr[data-item-id="${itemId}"]`);
    const itemName = row ? row.querySelector('.item-name').textContent : 'ဤပစ္စည်း';
    
    if (!confirm(`${itemName} ကို ဖျက်မှာသေချာပါသလား?\n\nမှတ်ချက်: ဤပစ္စည်းကို ဖျက်လိုက်ပါက ရှိပြီးသား အရောင်းမှတ်တမ်းများတွင် ပျက်စီးသွားနိုင်သည်။`)) {
        return;
    }
    
    fetch(`/api/delete_item/${itemId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('ပစ္စည်းဖျက်ပြီးပါပြီ', 'success');
            
            // Remove from UI
            const itemRow = document.querySelector(`tr[data-item-id="${itemId}"]`);
            if (itemRow) {
                itemRow.remove();
                updateStats();
            }
        } else {
            showToast(data.error || 'ဖျက်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting item:', error);
        showToast('ဆာဗာနှင့်ချိတ်ဆက်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
    });
}

function updateStock(itemId) {
    const row = document.querySelector(`tr[data-item-id="${itemId}"]`);
    const itemName = row ? row.querySelector('.item-name').textContent : 'ဤပစ္စည်း';
    const currentStock = row ? parseInt(row.getAttribute('data-stock')) : 0;
    
    const adjustment = prompt(`${itemName} အတွက် လက်ကျန်ပြင်ဆင်ရန်\n\nလက်ရှိလက်ကျန်: ${currentStock}\n\nပြင်ဆင်မည့်အရေအတွက် (အပေါင်း သို့မဟုတ် အနှုတ်):`, "0");
    
    if (adjustment === null) return;
    
    const quantity = parseInt(adjustment);
    if (isNaN(quantity)) {
        showToast('အရေအတွက် နံပါတ်သာ ထည့်သွင်းပါ', 'error');
        return;
    }
    
    const reason = prompt('ပြင်ဆင်ခြင်း၏ အကြောင်းရင်း (optional):', '');
    
    fetch('/api/update_stock', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            item_id: itemId,
            quantity: quantity,
            reason: reason || '',
            notes: ''
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`လက်ကျန်ပြင်ဆင်ပြီးပါပြီ (${currentStock} → ${data.new_stock})`, 'success');
            
            // Update UI without full reload
            if (row) {
                row.setAttribute('data-stock', data.new_stock);
                
                const stockValue = row.querySelector('.stock-value');
                if (stockValue) {
                    stockValue.textContent = `${data.new_stock} ${row.querySelector('.stock-value').textContent.split(' ')[1] || 'ခု'}`;
                    
                    // Update stock class
                    stockValue.classList.remove('out-of-stock', 'low-stock');
                    if (data.new_stock <= 0) {
                        stockValue.classList.add('out-of-stock');
                    } else if (data.new_stock <= 5) {
                        stockValue.classList.add('low-stock');
                    }
                }
            }
            
            updateStats();
        } else {
            showToast(data.error || 'လက်ကျန်ပြင်ဆင်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating stock:', error);
        showToast('ဆာဗာနှင့်ချိတ်ဆက်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
    });
}

function uploadImage(itemId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            showToast('ကျေးဇူးပြု၍ ပုံဖိုင်သာရွေးပါ', 'error');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            showToast('ဖိုင်အရွယ်အစား 2MB ထက်မကျော်ရ', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('image', file);
        formData.append('item_id', itemId);
        
        fetch('/api/upload_item_image', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('ပုံတင်ပြီးပါပြီ', 'success');
                
                // Update image in UI
                const row = document.querySelector(`tr[data-item-id="${itemId}"]`);
                if (row && data.image_url) {
                    const imgContainer = row.querySelector('.item-image');
                    if (imgContainer) {
                        imgContainer.innerHTML = `<img src="${data.image_url}" alt="Menu item image">`;
                    }
                }
            } else {
                showToast(data.error || 'ပုံတင်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
            }
        })
        .catch(error => {
            console.error('Error uploading image:', error);
            showToast('ဆာဗာနှင့်ချိတ်ဆက်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
        });
    };
    
    input.click();
}

// ===========================
// Utility Functions
// ===========================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    
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
    
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
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
    
    // Add animation styles if not already present
    if (!document.querySelector('#toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    return container;
}

// ===========================
// Global Function Exports
// ===========================
window.openAddItemModal = openAddItemModal;
window.openEditItemModal = openEditItemModal;
window.closeItemModal = closeItemModal;
window.saveItem = saveItem;
window.deleteItem = deleteItem;
window.updateStock = updateStock;
window.uploadImage = uploadImage;

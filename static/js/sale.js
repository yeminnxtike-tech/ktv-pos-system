// Sale Page JavaScript - Complete Implementation for KTV POS System
// Updated with proper room handling

// ===========================
// Global Variables
// ===========================
let orderItems = [];
let currentCategory = 'all';
let menuItems = [];
let currentRoomId = null;
let currentRoomName = 'မရွေးရသေးပါ';
let currentRoomData = null;

// ===========================
// Initialization
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sale page loaded - Initializing...');
    
    // Get room data from template variables
    const roomInfoElement = document.getElementById('room-info-section');
    const roomAlert = roomInfoElement ? roomInfoElement.querySelector('.alert-warning') : null;
    
    if (roomAlert) {
        // No room selected
        currentRoomId = null;
        currentRoomName = 'မရွေးရသေးပါ';
        disableOrderActions();
        showRoomAlert();
    } else {
        // Room is selected
        initRoomFromTemplate();
    }
    
    // Initialize all components
    setupEventListeners();
    loadMenuItems();
    
    // Update date/time initially
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    // Load user info
    loadUserInfo();
    
    console.log('Sale page initialization complete');
});

// ===========================
// Room Functions
// ===========================
function initRoomFromTemplate() {
    // Extract room info from template
    const roomInfoCard = document.querySelector('.room-info-card');
    if (!roomInfoCard) return;
    
    // Try to get room info from various sources
    currentRoomId = getRoomIdFromSession();
    
    if (currentRoomId) {
        // Load room details from API
        loadRoomDetails(currentRoomId);
    } else {
        // Extract from DOM
        const roomNameElement = roomInfoCard.querySelector('h4');
        if (roomNameElement) {
            const roomNameText = roomNameElement.textContent.replace('📌', '').trim();
            currentRoomName = roomNameText;
            updateRoomDisplay();
        }
        
        // Load existing order
        loadExistingOrder();
    }
}

function getRoomIdFromSession() {
    // Try multiple methods to get room ID
    const urlParams = new URLSearchParams(window.location.search);
    let roomId = urlParams.get('room_id');
    
    if (!roomId) {
        roomId = localStorage.getItem('ktv_current_room_id');
    }
    
    if (!roomId) {
        // Try to extract from page data
        const roomInfo = document.querySelector('[data-room-id]');
        if (roomInfo) {
            roomId = roomInfo.dataset.roomId;
        }
    }
    
    return roomId ? parseInt(roomId) : null;
}

function loadRoomDetails(roomId) {
    if (!roomId) return;
    
    // Use the API endpoint if available, otherwise use session data
    fetch('/api/room/' + roomId)
        .then(response => {
            if (!response.ok) {
                throw new Error('Room API not available');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.room) {
                currentRoomData = data.room;
                currentRoomId = data.room.id;
                currentRoomName = data.room.room_name || data.room.room_number;
                
                // Save to localStorage
                localStorage.setItem('ktv_current_room_id', currentRoomId);
                localStorage.setItem('ktv_current_room_name', currentRoomName);
                
                updateRoomDisplay();
                enableOrderActions();
                loadExistingOrder();
            }
        })
        .catch(error => {
            console.log('Using session room data instead of API');
            // Use session data
            currentRoomId = roomId;
            currentRoomName = localStorage.getItem('ktv_current_room_name') || 'Room ' + roomId;
            updateRoomDisplay();
            enableOrderActions();
            loadExistingOrder();
        });
}

function loadExistingOrder() {
    if (!currentRoomId) return;
    
    // Try to load saved order from server
    fetch('/api/get_room_order/' + currentRoomId)
        .then(response => {
            if (!response.ok) {
                return { success: false };
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.order) {
                // Load existing order items
                orderItems = data.order.order_data || [];
                updateOrderDisplay();
                updatePaymentSummary();
                showToast('အရင်သိမ်းဆည်းထားသော Order ကို ပြန်လည်ထည့်သွင်းပြီးပါပြီ', 'info');
            }
        })
        .catch(error => {
            console.log('No existing order found or API not available');
        });
}

function updateRoomDisplay() {
    const roomDisplay = document.getElementById('current-room-display');
    if (roomDisplay) {
        if (currentRoomName !== 'မရွေးရသေးပါ') {
            roomDisplay.textContent = currentRoomName;
            roomDisplay.style.color = '#4CAF50';
            roomDisplay.style.fontWeight = 'bold';
        } else {
            roomDisplay.textContent = currentRoomName;
            roomDisplay.style.color = '#ff5252';
        }
    }
}

function showRoomAlert() {
    if (currentRoomId === null) {
        Swal.fire({
            title: 'အခန်းမရွေးထားပါ',
            html: `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-door-closed fa-4x" style="color: #ff9800; margin-bottom: 20px;"></i>
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        အရောင်းစနစ်ကို အသုံးပြုရန် အခန်းတစ်ခု ရွေးရန်လိုအပ်ပါသည်။
                    </p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'အခန်းရွေးရန်',
            cancelButtonText: 'နောက်မှ',
            customClass: {
                confirmButton: 'btn btn-primary',
                cancelButton: 'btn btn-secondary'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/rooms';
            }
        });
    }
}

function disableOrderActions() {
    // Disable all order-related buttons
    const buttons = ['checkout-btn', 'save-order-btn', 'save-order-btn-bottom', 
                     'clear-order-btn', 'final-checkout-btn', 'print-bill-btn'];
    
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });
    
    // Disable menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.opacity = '0.5';
        item.style.cursor = 'not-allowed';
        item.onclick = null;
    });
}

function enableOrderActions() {
    // Enable all order-related buttons
    const buttons = ['checkout-btn', 'save-order-btn', 'save-order-btn-bottom', 
                     'clear-order-btn', 'final-checkout-btn', 'print-bill-btn'];
    
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
}

function changeRoom() {
    Swal.fire({
        title: 'အခန်းပြောင်းရန်',
        text: 'လက်ရှိအခန်းကိုပြောင်းမှာသေချာပါသလား? မသိမ်းထားသောအချက်များ ပျက်သွားနိုင်ပါသည်။',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'အခန်းပြောင်းမည်',
        cancelButtonText: 'မပြောင်းတော့ပါ',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            // Clear current room data
            localStorage.removeItem('ktv_current_room_id');
            localStorage.removeItem('ktv_current_room_name');
            window.location.href = '/rooms';
        }
    });
}

// ===========================
// Event Listeners Setup
// ===========================
function setupEventListeners() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('active');
        });
    }
    
    // Category filter
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            loadMenuItemsByCategory(currentCategory);
        });
    });
    
    // Menu search
    const menuSearch = document.getElementById('menu-search');
    const searchBtn = document.getElementById('search-btn');
    if (menuSearch) {
        menuSearch.addEventListener('input', function() {
            filterMenuItems(this.value);
        });
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            filterMenuItems(document.getElementById('menu-search').value);
        });
    }
    
    // Action buttons
    document.getElementById('go-rooms-btn')?.addEventListener('click', () => {
        window.location.href = '/rooms';
    });
    
    document.getElementById('refresh-menu-btn')?.addEventListener('click', () => {
        loadMenuItems();
        showToast('Menu ပြန်လည်ဖွင့်ပြီးပါပြီ', 'info');
    });
    
    document.getElementById('clear-order-btn')?.addEventListener('click', clearOrder);
    document.getElementById('save-order-btn')?.addEventListener('click', saveOrder);
    document.getElementById('save-order-btn-bottom')?.addEventListener('click', saveOrder);
    document.getElementById('checkout-btn')?.addEventListener('click', processCheckout);
    document.getElementById('final-checkout-btn')?.addEventListener('click', processCheckout);
    document.getElementById('print-bill-btn')?.addEventListener('click', printBill);
    
    // Tax and service checkboxes
    document.getElementById('tax-checkbox')?.addEventListener('change', updatePaymentSummary);
    document.getElementById('service-checkbox')?.addEventListener('change', updatePaymentSummary);
    
    // Customer count
    document.getElementById('customer-count')?.addEventListener('change', function() {
        const value = parseInt(this.value);
        if (value < 1) this.value = 1;
        if (value > 50) this.value = 50;
    });
}

// ===========================
// Date and Time Functions
// ===========================
function updateDateTime() {
    const now = new Date();
    
    // Format date (dd-mm-yyyy)
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}-${month}-${year}`;
    
    // Format time (hh:mm)
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    // Update all date elements
    document.querySelectorAll('[id^="current-date"]').forEach(el => {
        el.textContent = dateStr;
    });
    
    // Update all time elements
    document.querySelectorAll('[id^="current-time"]').forEach(el => {
        el.textContent = timeStr;
    });
}

// ===========================
// User Functions
// ===========================
function loadUserInfo() {
    fetch('/api/user_info')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update sidebar user name
                const sidebarUserName = document.getElementById('sidebar-user-name');
                if (sidebarUserName) {
                    sidebarUserName.textContent = data.user.full_name || 'အက်မင်';
                }
                
                // Update staff name in info bar
                const staffName = document.getElementById('staff-name');
                if (staffName) {
                    staffName.textContent = data.user.full_name || 'အက်မင်';
                }
                
                // Update login time
                const loginTime = document.getElementById('login-time');
                if (loginTime) {
                    const now = new Date();
                    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                                   now.getMinutes().toString().padStart(2, '0');
                    loginTime.textContent = `လော့ဂ်အင်: ${timeStr}`;
                }
            }
        })
        .catch(error => {
            console.log('User info not available');
        });
}

// ===========================
// Menu Functions
// ===========================
function loadMenuItems() {
    const menuGrid = document.getElementById('menu-items-grid');
    if (!menuGrid) return;
    
    // Show loading state
    menuGrid.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 15px;">Menu items တင်နေပါသည်...</p>
        </div>
    `;
    
    // Fetch menu items from API
    fetch('/api/menu_items')
        .then(response => {
            if (!response.ok) {
                throw new Error('API not available');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.items) {
                menuItems = data.items;
                loadMenuItemsByCategory(currentCategory);
            } else {
                throw new Error('No items data');
            }
        })
        .catch(error => {
            console.log('Using sample menu data');
            loadSampleMenuData();
        });
}

function loadSampleMenuData() {
    menuItems = [
        { id: 1, name: 'VIP Room', category_name: 'room', sale_price: 50000, stock: 10, image_url: null },
        { id: 2, name: 'Standard Room', category_name: 'room', sale_price: 30000, stock: 15, image_url: null },
        { id: 3, name: 'Heineken Beer', category_name: 'beer', sale_price: 5000, stock: 50, image_url: null },
        { id: 4, name: 'Tiger Beer', category_name: 'beer', sale_price: 4500, stock: 40, image_url: null },
        { id: 5, name: 'Orange Juice', category_name: 'juice', sale_price: 3000, stock: 30, image_url: null },
        { id: 6, name: 'Red Wine', category_name: 'wine', sale_price: 25000, stock: 15, image_url: null },
        { id: 7, name: 'Fried Chicken', category_name: 'chicken', sale_price: 12000, stock: 20, image_url: null },
        { id: 8, name: 'Grilled Prawn', category_name: 'prawn', sale_price: 15000, stock: 15, image_url: null },
        { id: 9, name: 'Pork Curry', category_name: 'pork', sale_price: 10000, stock: 25, image_url: null },
        { id: 10, name: 'Fried Fish', category_name: 'fish', sale_price: 8000, stock: 18, image_url: null },
        { id: 11, name: 'Coca Cola', category_name: 'drink', sale_price: 2000, stock: 60, image_url: null },
        { id: 12, name: 'Fried Rice', category_name: 'rice', sale_price: 5000, stock: 40, image_url: null },
        { id: 13, name: 'Mojito Cocktail', category_name: 'cocktail', sale_price: 8000, stock: 20, image_url: null },
        { id: 14, name: 'အမဲသား', category_name: 'pork', sale_price: 15000, stock: 12, image_url: null },
        { id: 15, name: 'ပုစွန်ကြော်', category_name: 'prawn', sale_price: 18000, stock: 8, image_url: null }
    ];
    
    loadMenuItemsByCategory(currentCategory);
}

function loadMenuItemsByCategory(category) {
    const menuGrid = document.getElementById('menu-items-grid');
    if (!menuGrid) return;
    
    // Filter by category
    let filteredItems = menuItems;
    if (category !== 'all') {
        filteredItems = menuItems.filter(item => item.category_name === category);
    }
    
    if (filteredItems.length === 0) {
        menuGrid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px 20px; color: rgba(255, 255, 255, 0.6);">
                <i class="fas fa-box-open fa-2x"></i>
                <p style="margin-top: 15px; font-size: 14px;">ဤ Category တွင် Menu မရှိပါ</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    filteredItems.forEach(item => {
        const isOutOfStock = item.stock <= 0;
        const stockClass = isOutOfStock ? 'out-of-stock' : '';
        
        html += `
            <div class="menu-item ${stockClass}" 
                 data-id="${item.id}" 
                 data-name="${item.name}" 
                 data-price="${item.sale_price}" 
                 data-category="${item.category_name}"
                 data-stock="${item.stock}"
                 title="${item.name} - ${formatCurrency(item.sale_price)} (လက်ကျန်: ${item.stock})">
                ${item.image_url ? 
                    `<img src="${item.image_url}" alt="${item.name}" class="item-image">` : 
                    `<div class="item-icon">
                        <i class="fas fa-${getIconForCategory(item.category_name)}"></i>
                    </div>`
                }
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">${formatCurrency(item.sale_price)}</div>
                    <div class="item-stock ${isOutOfStock ? 'out-of-stock' : ''}">
                        ${isOutOfStock ? 'Out of Stock' : `Stock: ${item.stock}`}
                    </div>
                </div>
            </div>
        `;
    });
    
    menuGrid.innerHTML = html;
    
    // Attach click events to menu items
    attachMenuItemsEvents();
}

function getIconForCategory(category) {
    const icons = {
        'room': 'door-closed',
        'beer': 'beer',
        'juice': 'glass-whiskey',
        'wine': 'wine-glass-alt',
        'chicken': 'drumstick-bite',
        'prawn': 'fish',
        'pork': 'bacon',
        'fish': 'fish',
        'seafood': 'crab',
        'drink': 'wine-bottle',
        'rice': 'utensils',
        'cocktail': 'cocktail',
        'vegetable': 'carrot',
        'lady': 'female'
    };
    return icons[category] || 'box';
}

function filterMenuItems(searchText) {
    const menuGrid = document.getElementById('menu-items-grid');
    if (!menuGrid) return;
    
    searchText = searchText.toLowerCase().trim();
    
    // First filter by current category
    let filteredItems = menuItems;
    if (currentCategory !== 'all') {
        filteredItems = menuItems.filter(item => item.category_name === currentCategory);
    }
    
    // Then filter by search text
    if (searchText) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchText) ||
            (item.category_name && item.category_name.toLowerCase().includes(searchText))
        );
    }
    
    if (filteredItems.length === 0) {
        menuGrid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px 20px; color: rgba(255, 255, 255, 0.6);">
                <i class="fas fa-search fa-2x"></i>
                <p style="margin-top: 15px; font-size: 14px;">ရှာဖွေမှုနှင့် ကိုက်ညီသော Menu မရှိပါ</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    filteredItems.forEach(item => {
        const isOutOfStock = item.stock <= 0;
        const stockClass = isOutOfStock ? 'out-of-stock' : '';
        
        html += `
            <div class="menu-item ${stockClass}" 
                 data-id="${item.id}" 
                 data-name="${item.name}" 
                 data-price="${item.sale_price}" 
                 data-category="${item.category_name}"
                 data-stock="${item.stock}">
                ${item.image_url ? 
                    `<img src="${item.image_url}" alt="${item.name}" class="item-image">` : 
                    `<div class="item-icon">
                        <i class="fas fa-${getIconForCategory(item.category_name)}"></i>
                    </div>`
                }
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">${formatCurrency(item.sale_price)}</div>
                    <div class="item-stock ${isOutOfStock ? 'out-of-stock' : ''}">
                        ${isOutOfStock ? 'Out of Stock' : `Stock: ${item.stock}`}
                    </div>
                </div>
            </div>
        `;
    });
    
    menuGrid.innerHTML = html;
    
    // Attach click events
    attachMenuItemsEvents();
}

function attachMenuItemsEvents() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            if (this.classList.contains('out-of-stock')) {
                showToast('ဤပစ္စည်း လက်ကျန်ကုန်နေပါသည်', 'error');
                return;
            }
            
            // Check if room is selected
            if (currentRoomId === null) {
                showRoomAlert();
                return;
            }
            
            const itemId = parseInt(this.getAttribute('data-id'));
            const itemName = this.getAttribute('data-name');
            const itemPrice = parseInt(this.getAttribute('data-price'));
            const itemStock = parseInt(this.getAttribute('data-stock'));
            
            addToOrder(itemId, itemName, itemPrice, itemStock);
        });
    });
}

// ===========================
// Order Functions
// ===========================
function addToOrder(itemId, itemName, itemPrice, itemStock) {
    // Check if room is selected
    if (currentRoomId === null) {
        showRoomAlert();
        return false;
    }
    
    // Check if item already in order
    const existingIndex = orderItems.findIndex(item => item.id === itemId);
    
    if (existingIndex !== -1) {
        // Check stock before increasing quantity
        const newQuantity = orderItems[existingIndex].quantity + 1;
        if (newQuantity > itemStock) {
            showToast(`${itemName} လက်ကျန်မလုံလောက်ပါ (လက်ကျန်: ${itemStock})`, 'error');
            return false;
        }
        
        orderItems[existingIndex].quantity = newQuantity;
        orderItems[existingIndex].total = newQuantity * itemPrice;
    } else {
        // Check stock before adding new item
        if (itemStock < 1) {
            showToast(`${itemName} လက်ကျန်ကုန်နေပါသည်`, 'error');
            return false;
        }
        
        orderItems.push({
            id: itemId,
            name: itemName,
            price: itemPrice,
            quantity: 1,
            total: itemPrice,
            stock: itemStock
        });
    }
    
    updateOrderDisplay();
    updatePaymentSummary();
    showToast(`${itemName} ကို order ထည့်ပြီးပါပြီ`, 'success');
    return true;
}

function updateOrderDisplay() {
    const orderBody = document.getElementById('order-items-body');
    const orderCount = document.getElementById('order-count');
    
    if (!orderBody) return;
    
    // Update order count
    if (orderCount) {
        orderCount.textContent = orderItems.length;
    }
    
    if (orderItems.length === 0) {
        orderBody.innerHTML = `
            <tr class="empty-order">
                <td colspan="6">
                    <div style="text-align: center; padding: 40px 20px; color: rgba(255, 255, 255, 0.7);">
                        <i class="fas fa-shopping-cart fa-2x"></i>
                        <p style="margin-top: 15px; font-size: 14px;">အခုလောလောဆယ် Order မရှိပါ</p>
                        <p style="font-size: 12px; margin-top: 5px;">Menu များကို နှိပ်၍ Order ထည့်ပါ</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    orderItems.forEach((item, index) => {
        html += `
            <tr data-id="${item.id}">
                <td>${index + 1}</td>
                <td class="item-name-cell">${item.name}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>
                    <div class="quantity-control">
                        <button class="qty-btn" onclick="updateOrderQuantity(${item.id}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="text" class="qty-input" value="${item.quantity}" 
                               onchange="updateOrderQuantity(${item.id}, 0, this.value)">
                        <button class="qty-btn" onclick="updateOrderQuantity(${item.id}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td>${formatCurrency(item.total)}</td>
                <td>
                    <button class="remove-btn" onclick="removeFromOrder(${item.id})" title="ဖယ်ရှားရန်">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    orderBody.innerHTML = html;
}

function updateOrderQuantity(itemId, change, customValue = null) {
    const item = orderItems.find(item => item.id === itemId);
    if (!item) return;
    
    let newQuantity;
    if (customValue !== null) {
        newQuantity = parseInt(customValue) || 1;
    } else {
        newQuantity = item.quantity + change;
    }
    
    if (newQuantity < 1) {
        removeFromOrder(itemId);
        return;
    }
    
    // Check stock
    const menuItem = menuItems.find(m => m.id === itemId);
    if (menuItem && newQuantity > menuItem.stock) {
        showToast(`${item.name} လက်ကျန်မလုံလောက်ပါ (လက်ကျန်: ${menuItem.stock})`, 'error');
        return;
    }
    
    item.quantity = newQuantity;
    item.total = newQuantity * item.price;
    
    updateOrderDisplay();
    updatePaymentSummary();
}

function removeFromOrder(itemId) {
    const itemIndex = orderItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    const itemName = orderItems[itemIndex].name;
    orderItems.splice(itemIndex, 1);
    
    updateOrderDisplay();
    updatePaymentSummary();
    showToast(`${itemName} ကို order မှ ဖယ်ရှားပြီးပါပြီ`, 'success');
}

function clearOrder() {
    if (orderItems.length === 0) {
        showToast('ဖျက်ရန် order မရှိပါ', 'info');
        return;
    }
    
    Swal.fire({
        title: 'Order ဖျက်ရန်',
        text: 'လက်ရှိ order အားလုံးကို ဖျက်မှာသေချာပါသလား?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ဖျက်မည်',
        cancelButtonText: 'မဖျက်တော့ပါ',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            orderItems = [];
            updateOrderDisplay();
            updatePaymentSummary();
            showToast('Order အားလုံးကို ဖျက်လိုက်ပါပြီ', 'success');
        }
    });
}

// ===========================
// Checkout Functions
// ===========================
function updatePaymentSummary() {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    
    // Get checkbox states
    const taxCheckbox = document.getElementById('tax-checkbox');
    const serviceCheckbox = document.getElementById('service-checkbox');
    
    const applyTax = taxCheckbox ? taxCheckbox.checked : false;
    const applyService = serviceCheckbox ? serviceCheckbox.checked : false;
    
    // Calculate charges
    const tax = applyTax ? Math.round(subtotal * 0.05) : 0;
    const service = applyService ? Math.round(subtotal * 0.1) : 0;
    const total = subtotal + tax + service;
    
    // Update UI elements
    const subTotalEl = document.getElementById('sub-total');
    const taxEl = document.getElementById('tax-amount');
    const serviceEl = document.getElementById('service-charge');
    const totalEl = document.getElementById('total-amount');
    
    if (subTotalEl) subTotalEl.textContent = formatCurrency(subtotal);
    if (taxEl) taxEl.textContent = formatCurrency(tax);
    if (serviceEl) serviceEl.textContent = formatCurrency(service);
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

function saveOrder() {
    if (orderItems.length === 0) {
        showToast('သိမ်းဆည်းရန် order မရှိပါ', 'error');
        return;
    }
    
    if (currentRoomId === null) {
        showRoomAlert();
        return;
    }
    
    const applyTax = document.getElementById('tax-checkbox')?.checked || false;
    const applyService = document.getElementById('service-checkbox')?.checked || false;
    const customerCount = document.getElementById('customer-count')?.value || 1;
    const notes = document.getElementById('order-notes')?.value || '';
    
    // Show loading
    Swal.fire({
        title: 'သိမ်းဆည်းနေသည်...',
        text: 'လုပ်ဆောင်နေပါသည်၊ ကျေးဇူးပြု၍စောင့်ပါ',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Save order to server
    fetch('/api/save_room_order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            room_id: currentRoomId,
            order_items: orderItems,
            apply_tax: applyTax,
            apply_service: applyService,
            customer_count: customerCount,
            notes: notes
        })
    })
    .then(response => response.json())
    .then(data => {
        Swal.close();
        if (data.success) {
            showToast('Order သိမ်းဆည်းပြီးပါပြီ', 'success');
        } else {
            Swal.fire('အမှား', data.error || 'Order သိမ်းဆည်းရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
        }
    })
    .catch(error => {
        Swal.close();
        console.error('Error saving order:', error);
        Swal.fire('အမှား', 'ဆာဗာနှင့်ချိတ်ဆက်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
    });
}

function processCheckout() {
    if (orderItems.length === 0) {
        showToast('Checkout လုပ်ရန် Order ထည့်ပါ!', 'error');
        return;
    }
    
    if (currentRoomId === null) {
        showRoomAlert();
        return;
    }
    
    // Check stock for all items
    let hasInsufficientStock = false;
    let insufficientItems = [];
    
    orderItems.forEach(orderItem => {
        const menuItem = menuItems.find(item => item.id === orderItem.id);
        if (!menuItem) {
            hasInsufficientStock = true;
            insufficientItems.push(`${orderItem.name} (မတွေ့ပါ)`);
        } else if (orderItem.quantity > menuItem.stock) {
            hasInsufficientStock = true;
            insufficientItems.push(`${orderItem.name} (လိုအပ်ချက်: ${orderItem.quantity}, လက်ကျန်: ${menuItem.stock})`);
        }
    });
    
    if (hasInsufficientStock) {
        Swal.fire({
            title: 'လက်ကျန်မလုံလောက်ပါ',
            html: `<div style="text-align: left;">
                <p>အောက်ပါပစ္စည်းများ လက်ကျန်မလုံလောက်ပါ:</p>
                <ul style="margin-left: 20px; margin-top: 10px;">
                    ${insufficientItems.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>`,
            icon: 'error'
        });
        return;
    }
    
    const applyTax = document.getElementById('tax-checkbox')?.checked || false;
    const applyService = document.getElementById('service-checkbox')?.checked || false;
    const total = document.getElementById('total-amount').textContent;
    const customerCount = document.getElementById('customer-count')?.value || 1;
    const notes = document.getElementById('order-notes')?.value || '';
    
    Swal.fire({
        title: 'Checkout လုပ်ရန်',
        html: `
            <div style="text-align: left;">
                <p><strong>အခန်း:</strong> ${currentRoomName}</p>
                <p><strong>လူဦးရေ:</strong> ${customerCount} ဦး</p>
                <p><strong>စုစုပေါင်း:</strong> ${total}</p>
                <p style="color: #ff9800; margin-top: 10px;">
                    <i class="fas fa-exclamation-circle"></i>
                    Checkout လုပ်ပြီးရင် Order အားလုံးဖျက်သိမ်းပြီး အခန်းအဆင်သင့်ဖြစ်သွားမည်။
                </p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Checkout လုပ်မည်',
        cancelButtonText: 'မလုပ်တော့ပါ',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            // Show loading
            Swal.fire({
                title: 'Checkout လုပ်နေသည်...',
                text: 'လုပ်ဆောင်နေပါသည်',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            fetch('/api/checkout_sale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    room_id: currentRoomId,
                    order_items: orderItems,
                    apply_tax: applyTax,
                    apply_service: applyService,
                    customer_count: customerCount,
                    notes: notes
                })
            })
            .then(response => response.json())
            .then(data => {
                Swal.close();
                if (data.success) {
                    // Print bill
                    printBill(data.bill_number, data.totals);
                    
                    // Clear order
                    orderItems = [];
                    updateOrderDisplay();
                    updatePaymentSummary();
                    
                    // Clear room from localStorage
                    localStorage.removeItem('ktv_current_room_id');
                    localStorage.removeItem('ktv_current_room_name');
                    
                    showToast('Checkout အောင်မြင်ပါပြီ!', 'success');
                    
                    // Redirect to rooms page after a delay
                    setTimeout(() => {
                        Swal.fire({
                            title: 'အောင်မြင်ပါပြီ',
                            text: 'Checkout လုပ်ပြီးပါပြီ။ အခန်းစာမျက်နှာသို့ ပြန်သွားမည်။',
                            icon: 'success',
                            confirmButtonText: 'အိုကေ',
                            timer: 3000,
                            timerProgressBar: true
                        }).then(() => {
                            window.location.href = '/rooms';
                        });
                    }, 1000);
                } else {
                    Swal.fire('အမှား', data.error || 'Checkout လုပ်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
                }
            })
            .catch(error => {
                Swal.close();
                console.error('Error during checkout:', error);
                Swal.fire('အမှား', 'ဆာဗာနှင့်ချိတ်ဆက်ရာတွင် အမှားတစ်ခုဖြစ်နေသည်', 'error');
            });
        }
    });
}

function printBill(billNumber = null, totals = null) {
    // Create a print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('my-MM');
    const timeStr = now.toLocaleTimeString('my-MM', { hour: '2-digit', minute: '2-digit', hour12: false });
    const subtotal = totals ? totals.subtotal : orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = totals ? totals.tax : (parseInt(document.getElementById('tax-amount').textContent) || 0);
    const service = totals ? totals.service_charge : (parseInt(document.getElementById('service-charge').textContent) || 0);
    const total = totals ? totals.total : subtotal + tax + service;
    const billNo = billNumber || `BILL-${Date.now().toString().slice(-8)}`;
    
    const printContent = `
        <!DOCTYPE html>
        <html lang="my">
        <head>
            <meta charset="UTF-8">
            <title>Bill - SMILE WORLD KTV</title>
            <style>
                /* Reset and base styles */
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Noto Sans Myanmar', 'Pyidaungsu', sans-serif;
                    font-size: 10pt;
                    line-height: 1.2;
                    color: #000;
                    background: #fff;
                    width: 148mm; /* A4 စာရွက်တစ်ဝက်ချိုး */
                    height: 105mm; /* Landscape orientation */
                    padding: 3mm;
                    margin: 0;
                }
                
                /* Invoice header - more compact */
                .invoice-header {
                    text-align: center;
                    padding-bottom: 2mm;
                    margin-bottom: 2mm;
                    border-bottom: 1px solid #000;
                }
                
                .invoice-header h1 {
                    color: #ff4081;
                    margin: 0;
                    font-size: 14pt;
                    font-weight: bold;
                    line-height: 1;
                }
                
                .invoice-header p {
                    margin: 0;
                    font-size: 8pt;
                    line-height: 1.1;
                }
                
                /* Invoice info - compact layout */
                .invoice-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3mm;
                    font-size: 8pt;
                }
                
                .invoice-info div {
                    line-height: 1.1;
                }
                
                .invoice-info p {
                    margin: 0 0 1mm 0;
                }
                
                /* Table styles - compact */
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 3mm;
                    font-size: 8pt;
                    table-layout: fixed;
                }
                
                th, td {
                    border: 1px solid #000;
                    padding: 1mm;
                    text-align: left;
                    vertical-align: top;
                    word-wrap: break-word;
                }
                
                th {
                    background-color: #f0f0f0;
                    font-weight: bold;
                    font-size: 7pt;
                    padding: 0.5mm 1mm;
                }
                
                /* Column widths for slip printer */
                .col-no { width: 8mm; }      /* စဉ် */
                .col-name { width: 50mm; }   /* အမည် */
                .col-price { width: 25mm; }  /* ဈေးနှုန်း */
                .col-qty { width: 15mm; }    /* အရေအတွက် */
                .col-total { width: 30mm; }  /* စုစုပေါင်း */
                
                td:first-child, th:first-child { width: 8mm; }      /* စဉ် */
                td:nth-child(2), th:nth-child(2) { width: 50mm; }   /* အမည် */
                td:nth-child(3), th:nth-child(3) { width: 25mm; }   /* ဈေးနှုန်း */
                td:nth-child(4), th:nth-child(4) { width: 15mm; }   /* အရေအတွက် */
                td:nth-child(5), th:nth-child(5) { width: 30mm; }   /* စုစုပေါင်း */
                
                /* Footer */
                .footer {
                    text-align: center;
                    margin-top: 2mm;
                    padding-top: 1mm;
                    border-top: 1px dashed #000;
                    font-size: 7pt;
                    color: #666;
                    line-height: 1;
                }
                
                /* Text alignment */
                .text-right {
                    text-align: right;
                }
                
                .text-center {
                    text-align: center;
                }
                
                /* Total rows */
                .total-row {
                    font-weight: bold;
                    background-color: #f9f9f9;
                }
                
                .final-total {
                    background-color: #e8f5e8;
                    border-top: 2px solid #000;
                    border-bottom: 2px solid #000;
                }
                
                /* Print-specific styles */
                @media print {
                    body { 
                        margin: 0 !important;
                        padding: 3mm !important;
                        width: 148mm !important;
                        height: 105mm !important;
                    }
                    
                    .no-print { 
                        display: none !important; 
                    }
                    
                    /* Page setup for A4 half size landscape */
                    @page {
                        size: 148mm 105mm; /* A4 တစ်ဝက်ချိုး landscape */
                        margin: 3mm;
                    }
                    
                    /* Force black text for printing */
                    * {
                        color: #000 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
                
                /* Button styles for preview */
                .no-print {
                    margin-top: 3mm;
                    text-align: center;
                }
                
                .print-btn, .close-btn {
                    padding: 5px 15px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-family: 'Noto Sans Myanmar', sans-serif;
                    font-size: 9pt;
                    margin: 0 5px;
                }
                
                .print-btn {
                    background: #ff4081;
                    color: white;
                }
                
                .close-btn {
                    background: #666;
                    color: white;
                }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <h1>SMILE WORLD KTV</h1>
                <p>မြို့ရှောင်လမ်း၊ မှော်ဘီမြို့</p>
                <p>ဖုန်း - ၀၉-၄၂၅၅၇၃၅၉၈</p>
            </div>
            
            <div class="invoice-info">
                <div>
                    <p><strong>ရက်စွဲ:</strong> ${dateStr}</p>
                    <p><strong>အချိန်:</strong> ${timeStr}</p>
                    <p><strong>Bill No:</strong> ${billNo}</p>
                </div>
                <div class="text-right">
                    <p><strong>အခန်း:</strong> ${currentRoomName}</p>
                    <p><strong>လူဦးရေ:</strong> ${document.getElementById('customer-count')?.value || 1} ဦး</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th class="text-center col-no">စဉ်</th>
                        <th class="col-name">အမည်</th>
                        <th class="text-right col-price">ဈေးနှုန်း</th>
                        <th class="text-center col-qty">အရေအတွက်</th>
                        <th class="text-right col-total">စုစုပေါင်း</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderItems.map((item, index) => `
                        <tr>
                            <td class="text-center">${index + 1}</td>
                            <td>${item.name}</td>
                            <td class="text-right">${item.price.toLocaleString()}</td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-right">${item.total.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="4" class="text-right">စုစုပေါင်း:</td>
                        <td class="text-right">${subtotal.toLocaleString()}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="4" class="text-right">Tax (5%):</td>
                        <td class="text-right">${tax.toLocaleString()}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="4" class="text-right">Service Charge (10%):</td>
                        <td class="text-right">${service.toLocaleString()}</td>
                    </tr>
                    <tr class="total-row final-total">
                        <td colspan="4" class="text-right"><strong>ကျသင့်ငွေ:</strong></td>
                        <td class="text-right"><strong>${total.toLocaleString()}</strong></td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p><strong>ကျေးဇူးတင်ပါသည်!</strong></p>
                <p>Generated by KTV POS System</p>
                <p>${now.toLocaleString('my-MM')}</p>
            </div>
            
            <div class="no-print">
                <button class="print-btn" onclick="window.print()">
                    Print Bill
                </button>
                <button class="close-btn" onclick="window.close()">
                    Close
                </button>
            </div>
            
            <script>
                window.onload = function() {
                    // Auto-print after a short delay
                    setTimeout(function() {
                        window.print();
                        // Auto-close after printing (optional)
                        // setTimeout(function() { window.close(); }, 1000);
                    }, 300);
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// ===========================
// Utility Functions
// ===========================
function formatCurrency(amount) {
    return new Intl.NumberFormat('my-MM').format(amount) + ' KS';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    // Set color based on type
    let bgColor = '#1a237e'; // info - blue
    let icon = 'ℹ️';
    
    if (type === 'error') {
        bgColor = '#c62828';
        icon = '❌';
    } else if (type === 'success') {
        bgColor = '#2e7d32';
        icon = '✅';
    } else if (type === 'warning') {
        bgColor = '#ff9800';
        icon = '⚠️';
    }
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-family: 'Noto Sans Myanmar', sans-serif;
        font-size: 13px;
        min-width: 280px;
        max-width: 350px;
        color: white;
        background: ${bgColor};
        border: 1px solid rgba(255, 255, 255, 0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    toast.innerHTML = `
        <span style="font-size: 16px;">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
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

// Add CSS animations for toast
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

// Make functions globally available
window.updateOrderQuantity = updateOrderQuantity;
window.removeFromOrder = removeFromOrder;
window.addToOrder = addToOrder;
window.clearOrder = clearOrder;
window.saveOrder = saveOrder;
window.processCheckout = processCheckout;
window.printBill = printBill;
window.changeRoom = changeRoom;
window.formatCurrency = formatCurrency;
window.showToast = showToast;

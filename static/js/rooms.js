// Rooms Page JavaScript - Complete Working Version with Database Integration
document.addEventListener('DOMContentLoaded', function() {
    console.log('Rooms.js loaded - Database integrated version');
    
    // State variables
    let currentSelectedRoom = null;
    let allRooms = [];
    
    // DOM Elements
    const roomsGrid = document.getElementById('rooms-grid');
    const newOrderBtn = document.getElementById('new-order');
    const addRoomBtn = document.getElementById('add-room');
    const searchBtn = document.getElementById('search-btn');
    
    // Stats elements
    const totalRoomsElement = document.getElementById('total-rooms');
    const availableRoomsElement = document.getElementById('available-rooms');
    const occupiedRoomsElement = document.getElementById('occupied-rooms');
    const roomsWithOrdersElement = document.getElementById('rooms-with-orders');
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    const roomSearchInput = document.getElementById('room-search');
    
    // Initialize
    initializeRoomsApp();
    
    async function initializeRoomsApp() {
        try {
            await loadRooms();
            setupEventListeners();
            updateStats();
            updateDateTime();
        } catch (error) {
            console.error('Error initializing rooms app:', error);
            showNotification('စနစ်စတင်ရာတွင် အမှားဖြစ်ခဲ့သည်', 'error');
        }
    }
    
    function setupEventListeners() {
        // New order button
        if (newOrderBtn) {
            newOrderBtn.addEventListener('click', () => {
                window.location.href = '/sale';
            });
        }
        
        // Add room button
        if (addRoomBtn) {
            addRoomBtn.addEventListener('click', () => openRoomEditModal());
        }
        
        // Search button
        if (searchBtn) {
            searchBtn.addEventListener('click', searchRooms);
        }
        
        // Filter buttons
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const type = this.getAttribute('data-type');
                filterRooms(type);
            });
        });
        
        // Search input - real-time search
        if (roomSearchInput) {
            roomSearchInput.addEventListener('input', function() {
                const searchTerm = this.value.trim();
                if (searchTerm.length === 0 || searchTerm.length >= 2) {
                    searchRooms();
                }
            });
            
            roomSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchRooms();
                }
            });
        }
        
        // Modal event listeners
        document.getElementById('save-room')?.addEventListener('click', saveRoom);
        document.getElementById('cancel-room')?.addEventListener('click', () => closeModal(document.getElementById('room-edit-modal')));
        document.getElementById('confirm-delete')?.addEventListener('click', confirmDeleteRoom);
        document.getElementById('cancel-delete')?.addEventListener('click', () => closeModal(document.getElementById('delete-room-modal')));
        document.getElementById('close-view')?.addEventListener('click', () => closeModal(document.getElementById('room-view-modal')));
        document.getElementById('use-this-room')?.addEventListener('click', useSelectedRoom);
        
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                closeModal(modal);
            });
        });
        
        // Modal close when clicking outside
        window.addEventListener('click', (e) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        });
    }
    
    async function loadRooms() {
        try {
            // Load rooms from API
            const response = await fetch('/api/rooms');
            if (response.ok) {
                allRooms = await response.json();
                displayRooms(allRooms);
                showNotification(`အခန်း ${allRooms.length} ခု ရယူပြီးပါပြီ`, 'success');
            } else {
                showNotification('အခန်းများရယူရာတွင် အမှားဖြစ်ခဲ့သည်', 'error');
            }
            
        } catch (error) {
            console.error('Error loading rooms:', error);
            showNotification('အခန်းများရယူရာတွင် အမှားဖြစ်ခဲ့သည်', 'error');
        }
    }
    
    function updateStats() {
        if (!allRooms || !Array.isArray(allRooms)) return;
        
        const totalRooms = allRooms.length;
        const availableRooms = allRooms.filter(room => room.status === 'available').length;
        const occupiedRooms = allRooms.filter(room => room.status === 'occupied').length;
        
        if (totalRoomsElement) totalRoomsElement.textContent = totalRooms;
        if (availableRoomsElement) availableRoomsElement.textContent = availableRooms;
        if (occupiedRoomsElement) occupiedRoomsElement.textContent = occupiedRooms;
        
        // Get rooms with pending orders
        fetch('/api/rooms')
            .then(response => response.json())
            .then(rooms => {
                let roomsWithOrders = 0;
                rooms.forEach(room => {
                    // Check if room has pending orders
                    fetch(`/api/get_room_order/${room.id}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.success && data.order) {
                                roomsWithOrders++;
                                if (roomsWithOrdersElement) {
                                    roomsWithOrdersElement.textContent = roomsWithOrders;
                                }
                            }
                        });
                });
            });
    }
    
    function displayRooms(rooms) {
        if (!roomsGrid) return;
        
        roomsGrid.innerHTML = '';
        
        if (!rooms || rooms.length === 0) {
            roomsGrid.innerHTML = `
                <div class="no-rooms-message">
                    <i class="fas fa-door-closed fa-3x"></i>
                    <p>အခန်းများ မရှိသေးပါ</p>
                    <p>ကျေးဇူးပြု၍ အခန်းအသစ်ထည့်သွင်းပါ</p>
                </div>
            `;
            return;
        }
        
        rooms.forEach(room => {
            const roomElement = createRoomElement(room);
            roomsGrid.appendChild(roomElement);
        });
    }
    
    function createRoomElement(room) {
        const roomElement = document.createElement('div');
        
        // Status translation
        const statusMap = {
            'available': 'လစ်လပ်ပါသည်',
            'occupied': 'ရှိပါသည်',
            'reserved': 'ကြိုတင်ယူထား',
            'cleaning': 'သန့်ရှင်းရေးလုပ်',
            'inactive': 'မသုံးတော့ပါ'
        };
        
        const statusText = statusMap[room.status] || room.status;
        
        // Set room card class based on status
        let roomClass = `room-card ${room.status === 'occupied' ? 'occupied' : 
                        room.status === 'available' ? 'available' : 
                        room.status === 'inactive' ? 'inactive' : 'reserved'}`;
        
        roomElement.className = roomClass;
        roomElement.dataset.id = room.id;
        
        // Get pending orders count for this room
        let orderCount = 0;
        fetch(`/api/get_room_order/${room.id}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.order) {
                    orderCount = 1;
                    const orderBadge = roomElement.querySelector('.order-count-badge');
                    if (orderBadge) {
                        orderBadge.textContent = `📦 မှာစာရှိ`;
                    }
                }
            });
        
        roomElement.innerHTML = `
            <div class="room-header">
                <div class="room-name">${room.room_name}</div>
                <div class="room-status-badge ${room.status}">${statusText}</div>
            </div>
            <div class="room-type">
                <i class="fas ${getRoomTypeIcon(room.room_type)}"></i>
                ${getRoomTypeDisplay(room.room_type)}
            </div>
            <div class="room-details">
                <div class="detail-item">
                    <i class="fas fa-hashtag"></i>
                    <span>${room.room_number}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-users"></i>
                    <span>${room.capacity} ဦး</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>${room.hourly_rate.toLocaleString()} ကျပ်</span>
                </div>
            </div>
            ${orderCount > 0 ? `
                <div class="room-order-info">
                    <div class="order-count-badge">
                        <i class="fas fa-shopping-cart"></i> မှာစာရှိ
                    </div>
                </div>
            ` : ''}
            <div class="room-actions">
                <button class="btn-action view-btn" data-room-id="${room.id}" title="အခန်းကြည့်မည်">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn-action edit-btn" data-room-id="${room.id}" title="အခန်းပြင်မည်">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-action delete-btn" data-room-id="${room.id}" title="အခန်းဖျက်မည်">
                    <i class="fas fa-trash"></i> Delete
                </button>
                <button class="btn-action use-btn" data-room-id="${room.id}" title="ဤအခန်းကို သုံးမည်">
                    <i class="fas fa-shopping-cart"></i> Use
                </button>
            </div>
        `;
        
        // Add event listeners to action buttons
        setupRoomActionButtons(roomElement, room);
        
        return roomElement;
    }
    
    function getRoomTypeIcon(type) {
        switch(type) {
            case 'vip': return 'fa-crown';
            case 'standard': return 'fa-home';
            case 'family': return 'fa-users';
            default: return 'fa-door-closed';
        }
    }
    
    function getRoomTypeDisplay(type) {
        switch(type) {
            case 'vip': return 'VIP';
            case 'standard': return 'Standard';
            case 'family': return 'Family';
            default: return type;
        }
    }
    
    function setupRoomActionButtons(roomElement, room) {
        // View button
        roomElement.querySelector('.view-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            viewRoom(room);
        });
        
        // Edit button
        roomElement.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editRoom(room);
        });
        
        // Delete button
        roomElement.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteRoom(room);
        });
        
        // Use button
        roomElement.querySelector('.use-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            useRoom(room);
        });
        
        // Room card click - also goes to sale
        roomElement.addEventListener('click', () => {
            useRoom(room);
        });
    }
    
    function viewRoom(room) {
        console.log('View room:', room);
        currentSelectedRoom = room;
        
        // Status translation
        const statusMap = {
            'available': 'လစ်လပ်ပါသည်',
            'occupied': 'ရှိပါသည်',
            'reserved': 'ကြိုတင်ယူထား',
            'cleaning': 'သန့်ရှင်းရေးလုပ်',
            'inactive': 'မသုံးတော့ပါ'
        };
        
        const statusText = statusMap[room.status] || room.status;
        
        // Update modal with room details
        document.getElementById('view-room-name').textContent = room.room_name || '-';
        document.getElementById('view-room-type').textContent = getRoomTypeDisplay(room.room_type) || '-';
        document.getElementById('view-room-capacity').textContent = room.capacity || '0';
        document.getElementById('view-room-price').textContent = room.hourly_rate ? room.hourly_rate.toLocaleString() + ' ကျပ်' : '-';
        document.getElementById('view-room-status').textContent = statusText;
        document.getElementById('view-room-created').textContent = room.created_at ? new Date(room.created_at).toLocaleDateString('my-MM') : '-';
        document.getElementById('view-room-description').textContent = room.notes || 'အချက်အလက်မရှိပါ';
        
        // Check for pending orders
        fetch(`/api/get_room_order/${room.id}`)
            .then(response => response.json())
            .then(data => {
                const ordersList = document.getElementById('room-orders-list');
                if (data.success && data.order) {
                    ordersList.innerHTML = `
                        <div class="order-item">
                            <div class="order-header">
                                <span>Pending Order</span>
                                <span>${new Date(data.order.created_at).toLocaleDateString('my-MM')}</span>
                            </div>
                            <div class="order-details">
                                <span>${data.order.order_data ? JSON.parse(data.order.order_data).length : 0} items</span>
                                <span class="order-total">${data.order.total_amount ? data.order.total_amount.toLocaleString() : '0'} ကျပ်</span>
                            </div>
                        </div>
                    `;
                    document.getElementById('room-orders-section').style.display = 'block';
                } else {
                    ordersList.innerHTML = `
                        <p style="text-align: center; color: #999; padding: 20px;">
                            ယခင်အမှာစာများ မရှိပါ
                        </p>
                    `;
                    document.getElementById('room-orders-section').style.display = 'none';
                }
            });
        
        // Open view modal
        openModal(document.getElementById('room-view-modal'));
    }
    
    function editRoom(room) {
        console.log('Edit room:', room);
        currentSelectedRoom = room;
        
        // Fill form with room data
        document.getElementById('room-id').value = room.id || '';
        document.getElementById('room-name').value = room.room_name || '';
        document.getElementById('room-type').value = room.room_type || 'standard';
        document.getElementById('room-capacity').value = room.capacity || 4;
        document.getElementById('room-price').value = room.hourly_rate || 30000;
        document.getElementById('room-status').value = room.status || 'available';
        document.getElementById('room-description-input').value = room.notes || '';
        
        // Update modal title
        document.getElementById('room-modal-title').textContent = room.id ? 'အခန်းပြင်ဆင်ခြင်း' : 'အခန်းအသစ်ထည့်သွင်းခြင်း';
        
        // Open edit modal
        openModal(document.getElementById('room-edit-modal'));
    }
    
    function deleteRoom(room) {
        console.log('Delete room:', room);
        currentSelectedRoom = room;
        
        // Set confirmation message
        const message = `"${room.room_name}" အခန်းကို ဖျက်ရန် သေချာပါသလား?`;
        document.getElementById('delete-room-message').textContent = message;
        
        // Open delete modal
        openModal(document.getElementById('delete-room-modal'));
    }
    
    function useRoom(room) {
        console.log('Use room:', room);
        
        // Redirect to the select room route
        window.location.href = `/room/${room.id}/select`;
    }
    
    function searchRooms() {
        const searchTerm = roomSearchInput.value.trim().toLowerCase();
        
        if (!searchTerm) {
            displayRooms(allRooms);
            return;
        }
        
        const filteredRooms = allRooms.filter(room => {
            return (
                (room.room_name && room.room_name.toLowerCase().includes(searchTerm)) ||
                (room.room_number && room.room_number.toLowerCase().includes(searchTerm)) ||
                (room.room_type && room.room_type.toLowerCase().includes(searchTerm)) ||
                (room.notes && room.notes.toLowerCase().includes(searchTerm))
            );
        });
        
        displayRooms(filteredRooms);
    }
    
    function filterRooms(type) {
        let filteredRooms = [];
        
        switch(type) {
            case 'all':
                filteredRooms = allRooms;
                break;
            case 'VIP':
                filteredRooms = allRooms.filter(room => room.room_type === 'vip');
                break;
            case 'Standard':
                filteredRooms = allRooms.filter(room => room.room_type === 'standard');
                break;
            case 'Family':
                filteredRooms = allRooms.filter(room => room.room_type === 'family');
                break;
            case 'occupied':
                filteredRooms = allRooms.filter(room => room.status === 'occupied');
                break;
            case 'available':
                filteredRooms = allRooms.filter(room => room.status === 'available');
                break;
            case 'has-orders':
                // We'll filter dynamically
                filteredRooms = allRooms.filter(room => {
                    // This would need async checking, so for now show all
                    return true;
                });
                break;
            default:
                filteredRooms = allRooms;
        }
        
        displayRooms(filteredRooms);
    }
    
    async function saveRoom() {
        // Get form data
        const roomId = document.getElementById('room-id').value;
        const roomName = document.getElementById('room-name').value.trim();
        const roomType = document.getElementById('room-type').value;
        const roomCapacity = parseInt(document.getElementById('room-capacity').value);
        const roomPrice = parseFloat(document.getElementById('room-price').value);
        const roomStatus = document.getElementById('room-status').value;
        const roomDescription = document.getElementById('room-description-input').value.trim();
        
        // Validation
        if (!roomName) {
            showNotification('ကျေးဇူးပြု၍ အခန်းအမည် ထည့်ပါ', 'error');
            return;
        }
        
        if (!roomType) {
            showNotification('ကျေးဇူးပြု၍ အခန်းအမျိုးအစား ရွေးပါ', 'error');
            return;
        }
        
        if (isNaN(roomCapacity) || roomCapacity < 1) {
            showNotification('လူဦးရေစွမ်းရည် မှန်ကန်စွာ ထည့်ပါ', 'error');
            return;
        }
        
        if (isNaN(roomPrice) || roomPrice < 0) {
            showNotification('အခန်းခ မှန်ကန်စွာ ထည့်ပါ', 'error');
            return;
        }
        
        try {
            const roomData = {
                room_name: roomName,
                room_type: roomType,
                hourly_rate: roomPrice,
                capacity: roomCapacity,
                status: roomStatus,
                notes: roomDescription
            };
            
            let response;
            let message;
            
            if (roomId) {
                // Update existing room
                response = await fetch(`/api/rooms/update/${roomId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(roomData)
                });
                message = `"${roomName}" အခန်းကို ပြင်ဆင်ပြီးပါပြီ`;
            } else {
                // Create new room
                response = await fetch('/api/rooms/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(roomData)
                });
                message = `"${roomName}" အခန်း ထပ်ထည့်ပြီးပါပြီ`;
            }
            
            const result = await response.json();
            
            if (result.success) {
                showNotification(message, 'success');
                
                // Reload rooms
                await loadRooms();
                updateStats();
                
                // Close modal
                closeModal(document.getElementById('room-edit-modal'));
            } else {
                showNotification(result.error || 'အမှားတစ်ခုဖြစ်နေသည်', 'error');
            }
            
        } catch (error) {
            console.error('Error saving room:', error);
            showNotification('အခန်းသိမ်းဆည်းရာတွင် အမှားဖြစ်ခဲ့သည်', 'error');
        }
    }
    
    async function confirmDeleteRoom() {
        if (!currentSelectedRoom) return;
        
        try {
            const response = await fetch(`/api/rooms/delete/${currentSelectedRoom.id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification(result.message || `"${currentSelectedRoom.room_name}" အခန်း ဖျက်ပြီးပါပြီ`, 'success');
                
                // Reload rooms
                await loadRooms();
                updateStats();
                
                closeModal(document.getElementById('delete-room-modal'));
                currentSelectedRoom = null;
            } else {
                showNotification(result.error || 'ဖျက်ရာတွင် အမှားဖြစ်နေသည်', 'error');
            }
            
        } catch (error) {
            console.error('Error deleting room:', error);
            showNotification('အခန်းဖျက်ရာတွင် အမှားဖြစ်ခဲ့သည်', 'error');
        }
    }
    
    function useSelectedRoom() {
        if (currentSelectedRoom) {
            useRoom(currentSelectedRoom);
        }
    }
    
    function openRoomEditModal() {
        // Reset form for new room
        document.getElementById('room-id').value = '';
        document.getElementById('room-name').value = '';
        document.getElementById('room-type').value = 'standard';
        document.getElementById('room-capacity').value = 4;
        document.getElementById('room-price').value = 30000;
        document.getElementById('room-status').value = 'available';
        document.getElementById('room-description-input').value = '';
        
        // Update modal title
        document.getElementById('room-modal-title').textContent = 'အခန်းအသစ်ထည့်သွင်းခြင်း';
        
        // Open modal
        openModal(document.getElementById('room-edit-modal'));
    }
    
    function openModal(modal) {
        if (modal) {
            modal.style.display = 'block';
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }
    
    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }
    
    function updateDateTime() {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        const dateStr = `${day}-${month}-${year}`;
        
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        
        document.getElementById('current-date').textContent = dateStr;
        document.getElementById('current-time').textContent = timeStr;
    }
    
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
});

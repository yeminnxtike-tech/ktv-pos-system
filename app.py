""" KTV POS System - Complete Application with Menu-Sale Integration ဗမာဘာသာဖြင့် ရေးသားထားသော KTV အရောင်းစနစ် """

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import os
import sqlite3
from datetime import datetime, date, timedelta
import json
import uuid
from werkzeug.utils import secure_filename
import hashlib

app = Flask(__name__)
app.secret_key = 'ktv_pos_system_secret_key_2026'
app.config['DATABASE'] = 'ktv_pos.db'
app.config['UPLOAD_FOLDER'] = 'static/uploads/menu_images'
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 2MB max file size
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Database functions
def get_db():
    conn = sqlite3.connect(app.config['DATABASE'])
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Rooms table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_number TEXT UNIQUE NOT NULL,
            room_name TEXT,
            room_type TEXT DEFAULT 'standard',
            hourly_rate INTEGER DEFAULT 10000,
            status TEXT DEFAULT 'available', -- available, occupied, reserved, cleaning
            capacity INTEGER DEFAULT 4,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Room Orders (temporary orders for rooms)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS room_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER NOT NULL,
            order_data TEXT NOT NULL, -- JSON data of order items
            subtotal INTEGER DEFAULT 0,
            tax INTEGER DEFAULT 0,
            service_charge INTEGER DEFAULT 0,
            total_amount INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending', -- pending, completed, cancelled
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (room_id) REFERENCES rooms (id)
        )
    ''')
    
    # Items/Categories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            display_name TEXT,
            icon_class TEXT,
            color_code TEXT,
            sort_order INTEGER DEFAULT 0
        )
    ''')
    
    # Menu Items table (with image support)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category_id INTEGER,
            sale_price INTEGER NOT NULL,
            cost_price INTEGER,
            stock INTEGER DEFAULT 0,
            min_stock INTEGER DEFAULT 5,
            unit TEXT DEFAULT 'ခု',
            image_path TEXT,
            status TEXT DEFAULT 'active', -- active, inactive, out_of_stock
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
    ''')
    
    # Sales table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_number TEXT UNIQUE NOT NULL,
            room_id INTEGER,
            customer_count INTEGER DEFAULT 1,
            subtotal INTEGER NOT NULL,
            tax_amount INTEGER DEFAULT 0,
            service_charge INTEGER DEFAULT 0,
            discount INTEGER DEFAULT 0,
            total_amount INTEGER NOT NULL,
            payment_method TEXT DEFAULT 'cash',
            payment_status TEXT DEFAULT 'paid', -- paid, pending, cancelled
            staff_id INTEGER,
            sale_date DATE DEFAULT CURRENT_DATE,
            sale_time TIME DEFAULT CURRENT_TIME,
            notes TEXT,
            FOREIGN KEY (room_id) REFERENCES rooms (id),
            FOREIGN KEY (staff_id) REFERENCES users (id)
        )
    ''')
    
    # Sale Items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER,
            menu_item_id INTEGER,
            item_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price INTEGER NOT NULL,
            total_price INTEGER NOT NULL,
            FOREIGN KEY (sale_id) REFERENCES sales (id),
            FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
        )
    ''')
    
    # Stock transactions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            menu_item_id INTEGER,
            transaction_type TEXT NOT NULL, -- purchase, sale, adjustment, wastage
            quantity INTEGER NOT NULL,
            unit_price INTEGER,
            total_amount INTEGER,
            reference_id INTEGER, -- sale_id or purchase_id
            notes TEXT,
            staff_id INTEGER,
            transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (menu_item_id) REFERENCES menu_items (id),
            FOREIGN KEY (staff_id) REFERENCES users (id)
        )
    ''')
    
    # Insert default admin user
    cursor.execute("SELECT COUNT(*) FROM users WHERE username = 'admin'")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
            ('admin', hashlib.md5('admin123'.encode()).hexdigest(), 'အက်မင်', 'admin')
        )
        cursor.execute(
            "INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
            ('staff', hashlib.md5('staff123'.encode()).hexdigest(), 'ဝန်ထမ်း', 'staff')
        )
    
    # Insert default categories (13 categories from sale page)
    categories = [
        ('all', 'အားလုံး', 'fas fa-th', '#4CAF50'),
        ('room', 'အခန်း', 'fas fa-door-closed', '#FF4081'),
        ('lady', 'Lady', 'fas fa-female', '#9C27B0'),
        ('beer', 'Beer', 'fas fa-beer', '#FF9800'),
        ('juice', 'Juice', 'fas fa-glass-whiskey', '#4CAF50'),
        ('wine', 'အရက်', 'fas fa-wine-glass-alt', '#F44336'),
        ('chicken', 'ကြက်', 'fas fa-drumstick-bite', '#FF5722'),
        ('prawn', 'ပုဇွန်', 'fas fa-fish', '#FFEB3B'),
        ('pork', 'ဝက်', 'fas fa-bacon', '#795548'),
        ('fish', 'ငါး', 'fas fa-fish', '#2196F3'),
        ('seafood', 'Seafood', 'fas fa-crab', '#00BCD4'),
        ('drink', 'အရည်သောက်', 'fas fa-wine-bottle', '#9C27B0'),
        ('rice', 'ထမင်း', 'fas fa-utensils', '#FF9800'),
        ('cocktail', 'Cocktail', 'fas fa-cocktail', '#E91E63'),
        ('vegetable', 'အသီးအရွက်', 'fas fa-carrot', '#8BC34A')
    ]
    
    cursor.execute("SELECT COUNT(*) FROM categories")
    if cursor.fetchone()[0] == 0:
        for i, (name, display_name, icon_class, color_code) in enumerate(categories):
            cursor.execute(
                "INSERT INTO categories (name, display_name, icon_class, color_code, sort_order) VALUES (?, ?, ?, ?, ?)",
                (name, display_name, icon_class, color_code, i)
            )
    
    # Insert sample menu items
    cursor.execute("SELECT COUNT(*) FROM menu_items")
    if cursor.fetchone()[0] == 0:
        sample_items = [
            ('VIP Room', 'room', 50000, 0, 10, 'active', 'ခု'),
            ('Standard Room', 'room', 30000, 0, 15, 'active', 'ခု'),
            ('Heineken Beer', 'beer', 5000, 3000, 50, 'active', 'ပုလင်း'),
            ('Tiger Beer', 'beer', 4500, 2800, 40, 'active', 'ပုလင်း'),
            ('Orange Juice', 'juice', 3000, 1500, 30, 'active', 'ခွက်'),
            ('Red Wine', 'wine', 25000, 18000, 15, 'active', 'ပုလင်း'),
            ('Fried Chicken', 'chicken', 12000, 8000, 20, 'active', 'ခု'),
            ('Grilled Prawn', 'prawn', 15000, 10000, 15, 'active', 'ခု'),
            ('Pork Curry', 'pork', 10000, 7000, 25, 'active', 'ပွဲ'),
            ('Fried Fish', 'fish', 8000, 5000, 18, 'active', 'ခု'),
            ('Coca Cola', 'drink', 2000, 1200, 60, 'active', 'ပုလင်း'),
            ('Fried Rice', 'rice', 5000, 3000, 40, 'active', 'ပွဲ'),
            ('Mojito Cocktail', 'cocktail', 8000, 5000, 20, 'active', 'ခွက်'),
            ('Salad', 'vegetable', 4000, 2000, 25, 'active', 'ပွဲ'),
            ('အမဲသား', 'pork', 15000, 10000, 12, 'active', 'ခု'),
            ('ပုစွန်ကြော်', 'prawn', 18000, 12000, 8, 'active', 'ခု'),
            ('ဟိုတယ်အခန်း', 'room', 20000, 0, 5, 'active', 'ခု')
        ]
        
        for name, category_name, sale_price, cost_price, stock, status, unit in sample_items:
            cursor.execute("SELECT id FROM categories WHERE name = ?", (category_name,))
            category_result = cursor.fetchone()
            
            if category_result:
                category_id = category_result[0]
                cursor.execute(
                    """INSERT INTO menu_items (name, category_id, sale_price, cost_price, stock, min_stock, unit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (name, category_id, sale_price, cost_price, stock, 5, unit, status)
                )
    
    # Insert sample rooms
    cursor.execute("SELECT COUNT(*) FROM rooms")
    if cursor.fetchone()[0] == 0:
        sample_rooms = [
            ('R001', 'VIP 1', 'vip', 50000, 'available', 8),
            ('R002', 'VIP 2', 'vip', 50000, 'available', 8),
            ('R003', 'Standard 1', 'standard', 30000, 'available', 6),
            ('R004', 'Standard 2', 'standard', 30000, 'available', 6),
            ('R005', 'Family 1', 'family', 80000, 'available', 12),
            ('R006', 'Standard 3', 'standard', 30000, 'available', 6),
            ('R007', 'VIP 3', 'vip', 50000, 'available', 8),
            ('R008', 'Family 2', 'family', 80000, 'available', 12)
        ]
        
        for room_number, room_name, room_type, hourly_rate, status, capacity in sample_rooms:
            cursor.execute(
                "INSERT INTO rooms (room_number, room_name, room_type, hourly_rate, status, capacity) VALUES (?, ?, ?, ?, ?, ?)",
                (room_number, room_name, room_type, hourly_rate, status, capacity)
            )
    
    conn.commit()
    conn.close()

# User class for Flask-Login
class User(UserMixin):
    def __init__(self, user_dict):
        self.id = user_dict['id']
        self.username = user_dict['username']
        self.full_name = user_dict['full_name']
        self.role = user_dict['role']

@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return User(dict(user))
    return None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Custom Jinja2 filter for low stock calculation
def low_stock_items_filter(items):
    count = 0
    for item in items:
        min_stock = getattr(item, 'min_stock', 5)
        if hasattr(item, 'stock') and item.stock > 0 and item.stock <= min_stock:
            count += 1
    return count

app.jinja_env.filters['low_stock_items'] = low_stock_items_filter

# Template filter for currency formatting
@app.template_filter('format_currency')
def format_currency_filter(value):
    """Format currency in Myanmar style"""
    try:
        value = int(value)
        return f"{value:,} KS"
    except:
        return "0 KS"

# Helper function to calculate order totals
def calculate_order_totals(order_items, apply_tax=True, apply_service=True):
    subtotal = sum(item['quantity'] * item['price'] for item in order_items)
    
    tax = 0
    service_charge = 0
    
    if apply_tax:
        tax = int(subtotal * 0.05)  # 5% tax
    
    if apply_service:
        service_charge = int(subtotal * 0.10)  # 10% service charge
    
    total = subtotal + tax + service_charge
    
    return {
        'subtotal': subtotal,
        'tax': tax,
        'service_charge': service_charge,
        'total': total
    }

# Context processor for date/time
@app.context_processor
def inject_current_datetime():
    return {
        'current_date': datetime.now().strftime("%d-%m-%Y"),
        'current_time': datetime.now().strftime("%H:%M")
    }

# ==================== ROUTES ====================

@app.route('/')
@login_required
def index():
    return redirect(url_for('dashboard'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        password_hash = hashlib.md5(password.encode()).hexdigest()
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ? AND password_hash = ?",
                      (username, password_hash))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            user_obj = User(dict(user))
            login_user(user_obj)
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['full_name'] = user['full_name']
            session['role'] = user['role']
            
            flash('လော့ဂ်အင် အောင်မြင်ပါသည်။', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    # Clear session
    session.clear()
    logout_user()
    flash('လော့ဂ်အောက် အောင်မြင်ပါသည်။', 'success')
    return redirect(url_for('login'))

#=========== DASHBOARD ROUTES ==========

@app.route('/dashboard')
@login_required
def dashboard():
    conn = get_db()
    cursor = conn.cursor()
    
    # Get today's sales
    cursor.execute("""
        SELECT COALESCE(SUM(total_amount), 0) as total_sales FROM sales
        WHERE DATE(sale_date) = DATE('now')
    """)
    today_sales = cursor.fetchone()[0]
    
    # Get total rooms
    cursor.execute("SELECT COUNT(*) FROM rooms")
    total_rooms = cursor.fetchone()[0]
    
    # Get occupied rooms
    cursor.execute("SELECT COUNT(*) FROM rooms WHERE status = 'occupied'")
    occupied_rooms = cursor.fetchone()[0]
    
    # Get low stock items
    cursor.execute("""
        SELECT COUNT(*) FROM menu_items
        WHERE stock <= min_stock AND status = 'active'
    """)
    low_stock_items = cursor.fetchone()[0]
    
    # Get recent sales
    cursor.execute("""
        SELECT s.*, r.room_name, u.full_name as staff_name
        FROM sales s
        LEFT JOIN rooms r ON s.room_id = r.id
        LEFT JOIN users u ON s.staff_id = u.id
        ORDER BY s.sale_date DESC, s.sale_time DESC
        LIMIT 10
    """)
    recent_sales = cursor.fetchall()
    
    conn.close()
    
    return render_template('dashboard.html',
                         today_sales=today_sales,
                         total_rooms=total_rooms,
                         occupied_rooms=occupied_rooms,
                         low_stock_items=low_stock_items,
                         recent_sales=recent_sales)

#=========== SALE ROUTES ==========

@app.route('/sale')
@login_required
def sale():
    room_id = request.args.get('room_id', type=int)
    
    # If room_id not in URL, check session
    if not room_id and 'current_room_id' in session:
        room_id = session['current_room_id']
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Get selected room details
    selected_room = None
    if room_id:
        cursor.execute("SELECT * FROM rooms WHERE id = ?", (room_id,))
        selected_room = cursor.fetchone()
        
        # Update session
        if selected_room:
            session['current_room_id'] = room_id
            session['current_room_name'] = selected_room['room_name']
            session['current_room_number'] = selected_room['room_number']
    
    # Get all categories for filtering
    cursor.execute("SELECT * FROM categories ORDER BY sort_order")
    categories = cursor.fetchall()
    
    conn.close()
    
    # Get current datetime for template
    current_datetime = {
        'date': datetime.now().strftime('%d-%m-%Y'),
        'time': datetime.now().strftime('%H:%M')
    }
    
    return render_template('sale.html',
                         categories=categories,
                         selected_room=selected_room,
                         room_id=room_id,
                         current_datetime=current_datetime)

#=========== ROOMS ROUTES ==========

@app.route('/rooms')
@login_required
def rooms():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM rooms ORDER BY room_number")
    rooms = cursor.fetchall()
    
    # Get pending orders count for each room
    room_orders = {}
    for room in rooms:
        cursor.execute("SELECT COUNT(*) FROM room_orders WHERE room_id = ? AND status = 'pending'", (room['id'],))
        pending_orders = cursor.fetchone()[0]
        room_orders[room['id']] = pending_orders
    
    conn.close()
    
    return render_template('rooms.html', rooms=rooms, room_orders=room_orders)

@app.route('/room/<int:room_id>/select')
@login_required
def select_room(room_id):
    """Select a room and redirect to sale page"""
    print(f"DEBUG: Selecting room {room_id}")
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rooms WHERE id = ?", (room_id,))
    room = cursor.fetchone()
    conn.close()
    
    if room:
        # Store room info in session
        session['current_room_id'] = room_id
        session['current_room_name'] = room['room_name']
        session['current_room_number'] = room['room_number']
        
        print(f"DEBUG: Session set - room_id: {room_id}, room_name: {room['room_name']}")
        
        flash(f'"{room["room_name"]}" အခန်းကို ရွေးချယ်ပြီးပါပြီ', 'success')
        
        # Redirect to sale page with room_id
        return redirect(url_for('sale', room_id=room_id))
    else:
        flash('အခန်းမရှိပါ။', 'error')
        return redirect(url_for('rooms'))

# ==================== ROOM MANAGEMENT APIs ====================

@app.route('/api/rooms/update/<int:room_id>', methods=['PUT'])
@login_required
def api_update_room(room_id):
    """Update room details"""
    try:
        data = request.json
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE rooms SET
                room_name = ?, room_type = ?, hourly_rate = ?,
                capacity = ?, status = ?, notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            data.get('room_name'),
            data.get('room_type'),
            data.get('hourly_rate'),
            data.get('capacity'),
            data.get('status'),
            data.get('notes'),
            room_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Room updated successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/rooms/delete/<int:room_id>', methods=['DELETE'])
@login_required
def api_delete_room(room_id):
    """Delete a room"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if room has pending orders
        cursor.execute("SELECT COUNT(*) FROM room_orders WHERE room_id = ? AND status = 'pending'", (room_id,))
        pending_orders = cursor.fetchone()[0]
        
        if pending_orders > 0:
            return jsonify({'success': False, 'error': 'Cannot delete room with pending orders'})
        
        # Check if room has sales history
        cursor.execute("SELECT COUNT(*) FROM sales WHERE room_id = ?", (room_id,))
        sales_history = cursor.fetchone()[0]
        
        if sales_history > 0:
            # Soft delete - mark as inactive instead
            cursor.execute("UPDATE rooms SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (room_id,))
            message = 'Room marked as inactive (has sales history)'
        else:
            # Hard delete
            cursor.execute("DELETE FROM rooms WHERE id = ?", (room_id,))
            message = 'Room deleted successfully'
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': message})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/rooms/create', methods=['POST'])
@login_required
def api_create_room():
    """Create new room"""
    try:
        data = request.json
        
        # Generate room number
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM rooms")
        room_count = cursor.fetchone()[0]
        room_number = f"R{(room_count + 1):03d}"
        
        cursor.execute("""
            INSERT INTO rooms (room_number, room_name, room_type, hourly_rate, capacity, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            room_number,
            data.get('room_name'),
            data.get('room_type'),
            data.get('hourly_rate'),
            data.get('capacity'),
            data.get('status', 'available'),
            data.get('notes', '')
        ))
        
        room_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Room created successfully',
            'room_id': room_id,
            'room_number': room_number
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

#=========== MENU ROUTES ==========

@app.route('/menu')
@login_required
def menu():
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all menu items with category info
    cursor.execute("""
        SELECT mi.*, c.name as category_name, c.display_name as category_display
        FROM menu_items mi
        LEFT JOIN categories c ON mi.category_id = c.id
        ORDER BY c.sort_order, mi.name
    """)
    items = cursor.fetchall()
    
    # Get all categories
    cursor.execute("SELECT * FROM categories WHERE name != 'all' ORDER BY sort_order")
    categories = cursor.fetchall()
    
    conn.close()
    
    return render_template('menu.html', items=items, categories=categories)

# ==================== MENU MANAGEMENT APIs ====================

@app.route('/api/add_menu_item', methods=['POST'])
@login_required
def add_menu_item():
    """Add new menu item from menu page"""
    try:
        data = request.json
        
        # Validation
        required_fields = ['name', 'category_id', 'sale_price']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'{field} is required'})
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Insert menu item
        cursor.execute("""
            INSERT INTO menu_items (name, category_id, sale_price, cost_price, stock, min_stock, unit, description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('name'),
            data.get('category_id'),
            data.get('sale_price', 0),
            data.get('cost_price', 0),
            data.get('stock', 0),
            data.get('min_stock', 5),
            data.get('unit', 'ခု'),
            data.get('description', ''),
            data.get('status', 'active')
        ))
        
        item_id = cursor.lastrowid
        
        # Record stock transaction if stock is added
        if data.get('stock', 0) > 0:
            cursor.execute("""
                INSERT INTO stock_transactions (menu_item_id, transaction_type, quantity, unit_price, total_amount, staff_id, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                item_id, 'purchase', data.get('stock', 0),
                data.get('cost_price', 0),
                data.get('stock', 0) * data.get('cost_price', 0),
                current_user.id, 'Initial stock'
            ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'item_id': item_id,
            'message': 'Menu item added successfully'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/update_menu_item', methods=['PUT'])
@login_required
def update_menu_item():
    """Update existing menu item"""
    try:
        data = request.json
        
        if 'item_id' not in data or not data['item_id']:
            return jsonify({'success': False, 'error': 'Item ID is required'})
        
        conn = get_db()
        cursor = conn.cursor()
        
        # First get current item to check stock changes
        cursor.execute("SELECT stock FROM menu_items WHERE id = ?", (data['item_id'],))
        current_item = cursor.fetchone()
        
        if not current_item:
            return jsonify({'success': False, 'error': 'Item not found'})
        
        current_stock = current_item['stock']
        new_stock = data.get('stock', current_stock)
        
        # Update item
        cursor.execute("""
            UPDATE menu_items SET
                name = ?, category_id = ?, sale_price = ?, cost_price = ?,
                stock = ?, min_stock = ?, unit = ?, description = ?,
                status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            data.get('name'),
            data.get('category_id'),
            data.get('sale_price', 0),
            data.get('cost_price', 0),
            new_stock,
            data.get('min_stock', 5),
            data.get('unit', 'ခု'),
            data.get('description', ''),
            data.get('status', 'active'),
            data.get('item_id')
        ))
        
        # Record stock adjustment if stock changed
        stock_difference = new_stock - current_stock
        if stock_difference != 0:
            cursor.execute("""
                INSERT INTO stock_transactions (menu_item_id, transaction_type, quantity, unit_price, total_amount, staff_id, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                data['item_id'], 'adjustment', stock_difference,
                data.get('cost_price', 0),
                abs(stock_difference) * data.get('cost_price', 0),
                current_user.id,
                f'Manual adjustment from {current_stock} to {new_stock}'
            ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Menu item updated successfully'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/delete_item/<int:item_id>', methods=['DELETE'])
@login_required
def delete_item(item_id):
    """Delete menu item"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # First check if item exists in any pending orders
        cursor.execute("""
            SELECT ro.id, ro.room_id, r.room_name
            FROM room_orders ro
            JOIN rooms r ON ro.room_id = r.id
            WHERE ro.status = 'pending' AND ro.order_data LIKE ?
        """, (f'%"id":{item_id}%',))
        
        pending_orders = cursor.fetchall()
        
        if pending_orders:
            order_info = []
            for order in pending_orders:
                order_info.append(f"Room {order['room_name']} (Order ID: {order['id']})")
            
            return jsonify({
                'success': False,
                'error': f'Cannot delete item. It exists in pending orders:\n' + '\n'.join(order_info)
            })
        
        # Also check if item has been sold before
        cursor.execute("SELECT COUNT(*) FROM sale_items WHERE menu_item_id = ?", (item_id,))
        sale_count = cursor.fetchone()[0]
        
        if sale_count > 0:
            # Soft delete - set status to inactive instead of deleting
            cursor.execute("UPDATE menu_items SET status = 'inactive' WHERE id = ?", (item_id,))
            message = 'Item deactivated (has sales history)'
        else:
            # Hard delete - no sales history
            cursor.execute("DELETE FROM menu_items WHERE id = ?", (item_id,))
            message = 'Item deleted successfully'
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': message
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    """Get all categories"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories ORDER BY sort_order")
        categories = cursor.fetchall()
        
        categories_list = []
        for category in categories:
            categories_list.append({
                'id': category['id'],
                'name': category['name'],
                'display_name': category['display_name'],
                'icon_class': category['icon_class'],
                'color_code': category['color_code']
            })
        
        conn.close()
        return jsonify(categories_list)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== CATEGORY MANAGEMENT APIs ====================

@app.route('/api/categories/add', methods=['POST'])
@login_required
def add_category():
    """Add new category"""
    try:
        data = request.json
        
        if not data.get('name'):
            return jsonify({'success': False, 'error': 'Category name is required'})
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if category already exists
        cursor.execute("SELECT id FROM categories WHERE name = ?", (data['name'],))
        existing = cursor.fetchone()
        
        if existing:
            return jsonify({'success': False, 'error': 'Category already exists'})
        
        # Get next sort order
        cursor.execute("SELECT MAX(sort_order) FROM categories")
        max_sort = cursor.fetchone()[0] or 0
        
        cursor.execute("""
            INSERT INTO categories (name, display_name, icon_class, color_code, sort_order)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data['name'],
            data.get('display_name', data['name']),
            data.get('icon_class', 'fas fa-box'),
            data.get('color_code', '#6c757d'),
            max_sort + 1
        ))
        
        category_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'category_id': category_id,
            'message': 'Category added successfully'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/categories/update/<int:category_id>', methods=['PUT'])
@login_required
def update_category(category_id):
    """Update category"""
    try:
        data = request.json
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE categories SET
                display_name = ?, icon_class = ?, color_code = ?,
                sort_order = ?
            WHERE id = ?
        """, (
            data.get('display_name'),
            data.get('icon_class'),
            data.get('color_code'),
            data.get('sort_order', 0),
            category_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Category updated successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/categories/delete/<int:category_id>', methods=['DELETE'])
@login_required
def delete_category(category_id):
    """Delete category"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if category has items
        cursor.execute("SELECT COUNT(*) FROM menu_items WHERE category_id = ?", (category_id,))
        item_count = cursor.fetchone()[0]
        
        if item_count > 0:
            return jsonify({
                'success': False, 
                'error': f'Cannot delete category. It has {item_count} menu items.'
            })
        
        cursor.execute("DELETE FROM categories WHERE id = ?", (category_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Category deleted successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ==================== UPLOAD APIs ====================

@app.route('/api/upload_item_image', methods=['POST'])
@login_required
def upload_item_image():
    """Upload image for menu item"""
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image file'})
        
        file = request.files['image']
        item_id = request.form.get('item_id')
        
        if not item_id:
            return jsonify({'success': False, 'error': 'Item ID required'})
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'})
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'File type not allowed'})
        
        # Generate secure filename
        filename = secure_filename(f"item_{item_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file.filename.rsplit('.', 1)[1].lower()}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save file
        file.save(filepath)
        
        # Update database
        conn = get_db()
        cursor = conn.cursor()
        
        # Remove old image if exists
        cursor.execute("SELECT image_path FROM menu_items WHERE id = ?", (item_id,))
        old_image = cursor.fetchone()
        
        if old_image and old_image['image_path']:
            old_path = os.path.join('static', old_image['image_path'])
            if os.path.exists(old_path):
                os.remove(old_path)
        
        # Update with new image path
        relative_path = f"uploads/menu_images/{filename}"
        cursor.execute("UPDATE menu_items SET image_path = ? WHERE id = ?", (relative_path, item_id))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'image_url': f"/static/{relative_path}",
            'message': 'Image uploaded successfully'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

#=========== REPORTS ROUTES ==========

@app.route('/reports')
@login_required
def reports():
    return render_template('reports.html')

#=========== STOCKS ROUTES ==========

@app.route('/stocks')
@login_required
def stocks():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT mi.*, c.display_name as category_display
        FROM menu_items mi
        LEFT JOIN categories c ON mi.category_id = c.id
        ORDER BY c.sort_order, mi.name
    """)
    items = cursor.fetchall()
    
    conn.close()
    
    return render_template('stocks.html', items=items)

@app.route('/settings')
@login_required
def settings():
    return render_template('settings.html')

# ========== API ROUTES ==========

# ==================== USER INFO APIs ====================
@app.route('/api/user_info')
@login_required
def api_user_info():
    return jsonify({
        'success': True,
        'user': {
            'id': current_user.id,
            'username': current_user.username,
            'full_name': current_user.full_name,
            'role': current_user.role
        }
    })

# ==================== MENU ITEMS APIs ====================
@app.route('/api/menu_items')
@login_required
def api_menu_items():
    """Get all active menu items for sale page"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT mi.id, mi.name, mi.sale_price as price, mi.stock, mi.unit,
               c.name as category, c.display_name as category_display,
               c.icon_class as category_icon, c.color_code as category_color,
               mi.status, mi.image_path, mi.cost_price
        FROM menu_items mi
        LEFT JOIN categories c ON mi.category_id = c.id
        WHERE mi.status = 'active'
        ORDER BY c.sort_order, mi.name
    """)
    
    items = []
    for row in cursor.fetchall():
        item = dict(row)
        # Ensure all required fields exist with proper names for sale page
        item['category'] = item.get('category', 'other')
        item['category_name'] = item.get('category', 'other')  # Add category_name for compatibility
        item['category_icon'] = item.get('category_icon', 'fas fa-box')
        item['category_color'] = item.get('category_color', '#6c757d')
        
        # Fix image URL path
        if item.get('image_path'):
            item['image_url'] = f"/static/{item['image_path']}"
        else:
            item['image_url'] = "/static/images/default_food.png"
        
        # Ensure price field exists (some templates might use 'sale_price' instead of 'price')
        item['sale_price'] = item.get('price', 0)
        
        items.append(item)
    
    conn.close()
    return jsonify({'success': True, 'items': items})

@app.route('/api/menu_items_full')
@login_required
def api_menu_items_full():
    """Get all menu items for menu page (including inactive)"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT mi.*, c.name as category_name, c.display_name as category_display,
               c.icon_class as category_icon, c.color_code as category_color
        FROM menu_items mi
        LEFT JOIN categories c ON mi.category_id = c.id
        ORDER BY c.sort_order, mi.name
    """)
    
    items = []
    for row in cursor.fetchall():
        item = dict(row)
        if item.get('image_path'):
            item['image_url'] = f"/static/{item['image_path']}"
        else:
            item['image_url'] = "/static/images/default_food.png"
        items.append(item)
    
    conn.close()
    return jsonify({'success': True, 'items': items})

@app.route('/api/menu_item/<int:item_id>')
@login_required
def api_menu_item(item_id):
    """Get single menu item details"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT mi.*, c.name as category_name, c.display_name as category_display
        FROM menu_items mi
        LEFT JOIN categories c ON mi.category_id = c.id
        WHERE mi.id = ?
    """, (item_id,))
    
    item = cursor.fetchone()
    conn.close()
    
    if item:
        item_dict = dict(item)
        if item_dict.get('image_path'):
            item_dict['image_url'] = f"/static/{item_dict['image_path']}"
        else:
            item_dict['image_url'] = "/static/images/default_food.png"
        return jsonify({'success': True, 'item': item_dict})
    return jsonify({'success': False, 'error': 'Item not found'})

# ==================== ROOM APIs ====================

@app.route('/api/rooms')
@login_required
def api_rooms():
    """Get all rooms for API"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM rooms ORDER BY room_number")
    rooms = cursor.fetchall()
    
    rooms_list = []
    for room in rooms:
        rooms_list.append(dict(room))
    
    conn.close()
    return jsonify(rooms_list)

@app.route('/api/room/<int:room_id>')
@login_required
def api_room_detail(room_id):
    """Get room details by ID"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rooms WHERE id = ?", (room_id,))
    room = cursor.fetchone()
    conn.close()
    
    if room:
        return jsonify({
            'success': True,
            'room': dict(room)
        })
    return jsonify({'success': False, 'error': 'Room not found'})

@app.route('/api/save_room_order', methods=['POST'])
@login_required
def api_save_room_order():
    """Save room order temporarily"""
    try:
        data = request.json
        room_id = data.get('room_id')
        order_items = data.get('order_items', [])
        
        if not room_id:
            return jsonify({'success': False, 'error': 'Room ID is required'})
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Calculate totals
        subtotal = sum(item['price'] * item['quantity'] for item in order_items)
        tax = data.get('apply_tax', True) and int(subtotal * 0.05) or 0
        service = data.get('apply_service', True) and int(subtotal * 0.10) or 0
        total = subtotal + tax + service
        
        # Check if order already exists for this room
        cursor.execute("SELECT id FROM room_orders WHERE room_id = ? AND status = 'pending'", (room_id,))
        existing_order = cursor.fetchone()
        
        if existing_order:
            # Update existing order
            cursor.execute("""
                UPDATE room_orders SET 
                    order_data = ?, subtotal = ?, tax = ?, service_charge = ?, total_amount = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (json.dumps(order_items), subtotal, tax, service, total, existing_order['id']))
        else:
            # Insert new order
            cursor.execute("""
                INSERT INTO room_orders (room_id, order_data, subtotal, tax, service_charge, total_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')
            """, (room_id, json.dumps(order_items), subtotal, tax, service, total))
        
        # Update room status to occupied
        cursor.execute("UPDATE rooms SET status = 'occupied' WHERE id = ?", (room_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Order saved successfully'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/get_room_order/<int:room_id>')
@login_required
def api_get_room_order(room_id):
    """Get saved room order"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM room_orders WHERE room_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1", (room_id,))
    order = cursor.fetchone()
    conn.close()
    
    if order:
        try:
            order_data = json.loads(order['order_data'])
        except:
            order_data = []
        
        return jsonify({
            'success': True,
            'order': {
                'id': order['id'],
                'room_id': order['room_id'],
                'order_data': order_data,
                'subtotal': order['subtotal'],
                'tax': order['tax'],
                'service_charge': order['service_charge'],
                'total_amount': order['total_amount'],
                'created_at': order['created_at']
            }
        })
    
    return jsonify({'success': False, 'error': 'No order found'})

# ==================== SALE CHECKOUT APIs ====================

@app.route('/api/checkout_sale', methods=['POST'])
@login_required
def checkout_sale():
    """Finalize sale and create invoice"""
    try:
        data = request.json
        room_id = data.get('room_id')
        order_items = data.get('order_items', [])
        apply_tax = data.get('apply_tax', True)
        apply_service = data.get('apply_service', True)
        customer_count = data.get('customer_count', 1)
        notes = data.get('notes', '')
        
        if not room_id:
            return jsonify({'success': False, 'error': 'Room ID is required'})
        
        if not order_items:
            return jsonify({'success': False, 'error': 'No items in order'})
        
        # Calculate totals
        totals = calculate_order_totals(order_items, apply_tax, apply_service)
        
        # Generate bill number
        bill_number = f"SW-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Create sale record
        cursor.execute("""
            INSERT INTO sales (bill_number, room_id, customer_count, subtotal, tax_amount, service_charge, total_amount, staff_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            bill_number,
            room_id,
            customer_count,
            totals['subtotal'],
            totals['tax'],
            totals['service_charge'],
            totals['total'],
            current_user.id,
            notes
        ))
        
        sale_id = cursor.lastrowid
        
        # Insert sale items and update stock
        for item in order_items:
            # Check stock availability
            cursor.execute("SELECT stock FROM menu_items WHERE id = ?", (item['id'],))
            menu_item = cursor.fetchone()
            
            if not menu_item:
                raise Exception(f"Menu item {item['id']} not found")
            
            if menu_item['stock'] < item.get('quantity', 1):
                raise Exception(f"Insufficient stock for item {item.get('name')}. Available: {menu_item['stock']}, Requested: {item.get('quantity', 1)}")
            
            # Insert sale item
            cursor.execute("""
                INSERT INTO sale_items (sale_id, menu_item_id, item_name, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                sale_id,
                item['id'],
                item.get('name', 'Unknown'),
                item.get('quantity', 1),
                item.get('price', 0),
                item.get('quantity', 1) * item.get('price', 0)
            ))
            
            # Update stock
            cursor.execute("""
                UPDATE menu_items SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (item.get('quantity', 1), item['id']))
            
            # Record stock transaction
            cursor.execute("""
                INSERT INTO stock_transactions (menu_item_id, transaction_type, quantity, unit_price, total_amount, reference_id, staff_id, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item['id'], 'sale', item.get('quantity', 1),
                item.get('price', 0),
                item.get('quantity', 1) * item.get('price', 0),
                sale_id, current_user.id,
                f'Sale #{bill_number}'
            ))
        
        # Clear room order
        cursor.execute("DELETE FROM room_orders WHERE room_id = ? AND status = 'pending'", (room_id,))
        
        # Update room status to available
        cursor.execute("UPDATE rooms SET status = 'available' WHERE id = ?", (room_id,))
        
        conn.commit()
        conn.close()
        
        # Clear session room data
        if 'current_room_id' in session and session['current_room_id'] == room_id:
            session.pop('current_room_id', None)
            session.pop('current_room_name', None)
            session.pop('current_room_number', None)
        
        return jsonify({
            'success': True,
            'bill_number': bill_number,
            'sale_id': sale_id,
            'totals': totals,
            'message': 'Checkout successful'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ==================== DASHBOARD APIs ====================
@app.route('/api/dashboard_stats')
@login_required
def api_dashboard_stats():
    """Get dashboard statistics"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get today's sales
    cursor.execute("""
        SELECT COALESCE(SUM(total_amount), 0) as total_sales FROM sales
        WHERE DATE(sale_date) = DATE('now')
    """)
    today_sales = cursor.fetchone()[0]
    
    # Get total rooms
    cursor.execute("SELECT COUNT(*) FROM rooms")
    total_rooms = cursor.fetchone()[0]
    
    # Get occupied rooms
    cursor.execute("SELECT COUNT(*) FROM rooms WHERE status = 'occupied'")
    occupied_rooms = cursor.fetchone()[0]
    
    # Get low stock items
    cursor.execute("""
        SELECT COUNT(*) FROM menu_items
        WHERE stock <= min_stock AND status = 'active'
    """)
    low_stock_items = cursor.fetchone()[0]
    
    # Get today's customers
    cursor.execute("""
        SELECT COALESCE(SUM(customer_count), 0) as total_customers FROM sales
        WHERE DATE(sale_date) = DATE('now')
    """)
    today_customers = cursor.fetchone()[0] or 0
    
    conn.close()
    
    return jsonify({
        'success': True,
        'today_sales': today_sales,
        'total_rooms': total_rooms,
        'occupied_rooms': occupied_rooms,
        'low_stock_items': low_stock_items,
        'today_customers': today_customers
    })

# ==================== STATUS API ====================
@app.route('/api/status', methods=['GET'])
def status():
    """Server status check"""
    return jsonify({
        'status': 'ok',
        'message': 'ဆာဗာ အလုပ်လုပ်နေပါသည်',
        'timestamp': datetime.now().isoformat()
    })

# ==================== ERROR HANDLING ====================
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

# ========== MAIN ENTRY POINT ==========

if __name__ == '__main__':
    print("=" * 60)
    print("KTV စားသောက်ဆိုင်စီမံခန့်ခွဲမှုစနစ်")
    print("=" * 60)
    
    # Initialize database if it doesn't exist
    if not os.path.exists(app.config['DATABASE']):
        init_db()
    else:
        print("✅ Database ရှိပြီးသားဖြစ်ပါသည်။")
    
    print("=" * 60)
    print("ဆာဗာစတင်နေပါပြီ...")
    print("ဝင်ရောက်ရန်: http://localhost:5000")
    print("အက်မင်အကောင့်: admin / admin123")
    print("ဝန်ထမ်းအကောင့်: staff / staff123")
    print("=" * 60)
    print("ဆာဗာကို ရပ်တန့်ရန် Ctrl+C နှိပ်ပါ")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)

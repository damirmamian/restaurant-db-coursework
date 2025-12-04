from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

def get_db_connection():
    connection = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='restaurant_db'
    )
    return connection

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                category_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50),
                display_order INT DEFAULT 0)""")
        cursor.execute("SELECT COUNT(*) FROM categories")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO categories (name, display_order) VALUES ('Starters', 1), ('Mains', 2), ('Desserts', 3), ('Drinks', 4)")
        cursor.execute("""CREATE TABLE IF NOT EXISTS menu_items (
                item_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100),
                description TEXT,
                price DECIMAL(10,2),
                image_url VARCHAR(255),
                category_id INT,
                is_available BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (category_id) REFERENCES categories(category_id))""")        
        try:
            cursor.execute("ALTER TABLE menu_items ADD COLUMN is_available BOOLEAN DEFAULT TRUE")
        except:
            pass
        cursor.execute("""CREATE TABLE IF NOT EXISTS orders (
                order_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                total_price DECIMAL(10,2),
                status ENUM('pending', 'cooking', 'ready', 'completed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT,
                item_id INT,
                quantity INT,
                price_at_time DECIMAL(10,2),
                FOREIGN KEY (order_id) REFERENCES orders(order_id))""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS reservations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100),
                phone VARCHAR(20),
                date DATE,
                time TIME,
                guests INT,
                status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Database Init Error: {e}")
with app.app_context():
    init_db()

def delete_expired_reservations():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM reservations WHERE TIMESTAMP(date, time) < NOW()")
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Cleanup Error: {e}")

@app.route('/api/menu', methods=['GET'])
def get_menu():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)        
        view_mode = request.args.get('view_mode')
        base_query = """
            SELECT m.item_id, m.name, m.description, m.price, m.image_url, 
                   c.name as category_name, c.display_order, m.category_id, m.is_available
            FROM menu_items m
            JOIN categories c ON m.category_id = c.category_id
        """        
        if view_mode != 'admin':
            base_query += " WHERE m.is_available = 1"
        base_query += " ORDER BY c.display_order ASC, m.name ASC"
        cursor.execute(base_query)
        menu_items = cursor.fetchall()        
        for item in menu_items:
            item['is_available'] = bool(item['is_available'])
        cursor.close()
        conn.close()
        return jsonify(menu_items)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM categories ORDER BY display_order ASC")
        categories = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(categories)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id, username, email, role_id, created_at FROM users ORDER BY created_at DESC")
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(users)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/user/delete', methods=['POST'])
def delete_user():
    data = request.get_json()
    user_id = data.get('user_id')    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()        
        cursor.execute("DELETE FROM cart WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM order_items WHERE order_id IN (SELECT order_id FROM orders WHERE user_id = %s)", (user_id,))
        cursor.execute("DELETE FROM orders WHERE user_id = %s", (user_id,))        
        cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/user/role', methods=['POST'])
def admin_update_role():
    data = request.get_json()
    user_id = data.get('user_id')
    role_id = data.get('role_id')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET role_id = %s WHERE user_id = %s", (role_id, user_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Role updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/menu/add', methods=['POST'])
def add_menu_item():
    data = request.get_json()
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO menu_items (name, description, price, image_url, category_id, is_available)
            VALUES (%s, %s, %s, %s, %s, TRUE)
        """
        cursor.execute(query, (data['name'], data['description'], data['price'], data['image_url'], data['category_id']))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Item added successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/menu/delete', methods=['POST'])
def delete_menu_item():
    data = request.get_json()
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM menu_items WHERE item_id = %s", (data['item_id'],))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Item deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/menu/toggle_availability', methods=['POST'])
def toggle_availability():
    data = request.get_json()
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE menu_items SET is_available = NOT is_available WHERE item_id = %s", (data['item_id'],))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Availability toggled'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    if not username or not email or not password:
        return jsonify({'message': 'All fields are required!'}), 400
    hashed_password = generate_password_hash(password)
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'message': 'User already exists!'}), 409
        query = "INSERT INTO users (username, email, password_hash, role_id) VALUES (%s, %s, %s, 3)"
        cursor.execute(query, (username, email, hashed_password))
        conn.commit()
        new_user_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return jsonify({
            'message': 'Registration successful!',
            'user': {
                'id': new_user_id,
                'username': username,
                'role_id': 3
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        if user and check_password_hash(user['password_hash'], password):
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'id': user['user_id'],
                    'username': user['username'],
                    'role_id': user['role_id']
                }
            }), 200
        else:
            return jsonify({'message': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_role', methods=['POST'])
def update_role():
    data = request.get_json()
    user_id = data.get('user_id')
    role_id = data.get('role_id')
    password = data.get('password')
    if role_id != 3:
        if not password:
            return jsonify({'message': 'Password required to change role'}), 400
        if role_id == 1 and password != "admin123":
             return jsonify({'message': 'Incorrect Admin Password'}), 403
        elif role_id == 2 and password != "chef123":
             return jsonify({'message': 'Incorrect Chef Password'}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        cursor.execute("UPDATE users SET role_id = %s WHERE user_id = %s", (role_id, user_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Role updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cart', methods=['GET'])
def get_cart():
    user_id = request.args.get('user_id')
    if not user_id: return jsonify({'message': 'User ID required'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT c.cart_id, c.item_id, c.quantity, m.name, m.price, m.image_url
            FROM cart c
            JOIN menu_items m ON c.item_id = m.item_id
            WHERE c.user_id = %s
        """
        cursor.execute(query, (user_id,))
        items = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(items)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/cart/add', methods=['POST'])
def add_to_cart_api():
    data = request.get_json()
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM cart WHERE user_id = %s AND item_id = %s", (data['user_id'], data['product_id']))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("UPDATE cart SET quantity = %s WHERE user_id = %s AND item_id = %s", (existing[0] + 1, data['user_id'], data['product_id']))
        else:
            cursor.execute("INSERT INTO cart (user_id, item_id, quantity) VALUES (%s, %s, 1)", (data['user_id'], data['product_id']))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Item added'}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/cart/update', methods=['POST'])
def update_cart_quantity():
    data = request.get_json()
    if data['quantity'] < 1: return jsonify({'message': 'Invalid qty'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE cart SET quantity = %s WHERE cart_id = %s", (data['quantity'], data['cart_id']))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Updated'}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/cart/remove', methods=['POST'])
def remove_from_cart():
    data = request.get_json()
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM cart WHERE cart_id = %s", (data['cart_id'],))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Removed'}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/orders/place', methods=['POST'])
def place_order():
    data = request.get_json()
    user_id = data.get('user_id')
    if not user_id: return jsonify({'message': 'User ID required'}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT c.item_id, c.quantity, m.price FROM cart c JOIN menu_items m ON c.item_id = m.item_id WHERE c.user_id = %s", (user_id,))
        cart_items = cursor.fetchall()
        if not cart_items:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Cart empty'}), 400
        total_price = sum(item['price'] * item['quantity'] for item in cart_items)
        cursor.execute("INSERT INTO orders (user_id, total_price, status) VALUES (%s, %s, 'pending')", (user_id, total_price))
        order_id = cursor.lastrowid
        for item in cart_items:
            cursor.execute("INSERT INTO order_items (order_id, item_id, quantity, price_at_time) VALUES (%s, %s, %s, %s)", (order_id, item['item_id'], item['quantity'], item['price']))
        cursor.execute("DELETE FROM cart WHERE user_id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Order placed', 'order_id': order_id}), 201
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/chef/orders', methods=['GET'])
def get_chef_orders():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM orders WHERE status != 'completed' ORDER BY created_at ASC")
        orders = cursor.fetchall()
        for order in orders:
            cursor.execute("SELECT oi.quantity, m.name FROM order_items oi JOIN menu_items m ON oi.item_id = m.item_id WHERE oi.order_id = %s", (order['order_id'],))
            order['items'] = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(orders)
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/chef/update_status', methods=['POST'])
def update_order_status():
    data = request.get_json()
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE orders SET status = %s WHERE order_id = %s", (data['status'], data['order_id']))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Status updated'}), 200
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/reservations', methods=['POST'])
def create_reservation():
    data = request.get_json()
    required = ['name', 'email', 'date', 'time', 'guests']
    if not all(k in data for k in required):
        return jsonify({'message': 'Missing fields'}), 400
    try:
        res_dt = datetime.strptime(f"{data['date']} {data['time']}", "%Y-%m-%d %H:%M")
        if res_dt < datetime.now():
            return jsonify({'message': 'Cannot book in the past'}), 400
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "INSERT INTO reservations (name, email, phone, date, time, guests) VALUES (%s, %s, %s, %s, %s, %s)"
        cursor.execute(query, (data['name'], data['email'], data.get('phone', ''), data['date'], data['time'], data['guests']))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Reservation confirmed'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chef/bookings', methods=['GET'])
def get_chef_bookings():
    delete_expired_reservations()
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM reservations WHERE status != 'cancelled' ORDER BY date ASC, time ASC")
        bookings = cursor.fetchall()
        for b in bookings:
            b['date'] = str(b['date'])
            b['time'] = str(b['time'])
        cursor.close()
        conn.close()
        return jsonify(bookings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
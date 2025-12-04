document.addEventListener('DOMContentLoaded', () => {
    checkChefAccess();
    switchView('orders');
    setInterval(() => {
        if (currentView === 'orders') fetchOrders();
    }, 30000);
});

let currentView = 'orders';

function checkChefAccess() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userStr);
    if (user.role_id !== 2 && user.role_id !== 1) {
        alert("Доступ заборонено: Тільки для шеф-кухарів.");
        window.location.href = 'index.html';
    }
    const nameEl = document.getElementById('chef-name');
    if (nameEl) nameEl.style.display = 'none';
}

function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.chef-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick').includes(viewName)) {
            link.classList.add('active');
        }
    });
    const ordersDiv = document.getElementById('view-orders');
    const bookingsDiv = document.getElementById('view-bookings');

    if (viewName === 'orders') {
        ordersDiv.style.display = 'block';
        bookingsDiv.style.display = 'none';
        fetchOrders();
    } else {
        ordersDiv.style.display = 'none';
        bookingsDiv.style.display = 'block';
        fetchBookings();
    }
}

async function fetchOrders() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/chef/orders');
        if (!response.ok) throw new Error('Failed to fetch orders');
        const orders = await response.json();
        renderOrders(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
    }
}

function renderOrders(orders) {
    const pendingList = document.getElementById('list-pending');
    const cookingList = document.getElementById('list-cooking');
    const readyList = document.getElementById('list-ready');
    pendingList.innerHTML = '';
    cookingList.innerHTML = '';
    readyList.innerHTML = '';
    let counts = { pending: 0, cooking: 0, ready: 0 };
    orders.forEach(order => {
        const card = createOrderCard(order);
        if (order.status === 'pending') {
            pendingList.appendChild(card);
            counts.pending++;
        } else if (order.status === 'cooking') {
            cookingList.appendChild(card);
            counts.cooking++;
        } else if (order.status === 'ready') {
            readyList.appendChild(card);
            counts.ready++;
        }
    });
    document.getElementById('count-pending').textContent = counts.pending;
    document.getElementById('count-cooking').textContent = counts.cooking;
    document.getElementById('count-ready').textContent = counts.ready;
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = `order-card status-${order.status}`;
    const itemsHtml = order.items.map(item =>
        `<li><span class="qty">${item.quantity}x</span> ${item.name}</li>`
    ).join('');
    const time = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let actionBtn = '';
    if (order.status === 'pending') {
        actionBtn = `<button class="btn-action start" onclick="updateStatus(${order.order_id}, 'cooking')">Почати готувати</button>`;
    } else if (order.status === 'cooking') {
        actionBtn = `<button class="btn-action ready" onclick="updateStatus(${order.order_id}, 'ready')">Готово</button>`;
    } else if (order.status === 'ready') {
        actionBtn = `<button class="btn-action complete" onclick="updateStatus(${order.order_id}, 'completed')">Завершити</button>`;
    }
    card.innerHTML = `<div class="order-header">
            <span class="order-id">#${order.order_id}</span>
            <span class="order-time">${time}</span>
        </div>
        <ul class="order-items">
            ${itemsHtml}
        </ul>
        <div class="order-footer">
            ${actionBtn}
        </div>`;
    return card;
}

async function updateStatus(orderId, newStatus) {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/chef/update_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, status: newStatus })
        });
        if (response.ok) {
            fetchOrders();
        } else {
            console.error('Failed to update status');
        }
    } catch (e) { console.error(e); }
}

async function fetchBookings() {
    const container = document.getElementById('bookings-list');
    container.innerHTML = '<tr><td colspan="6" style="text-align:center;">Завантаження...</td></tr>';
    try {
        const response = await fetch('http://127.0.0.1:5000/api/chef/bookings');
        if (!response.ok) throw new Error('Failed to fetch bookings');
        const bookings = await response.json();
        renderBookings(bookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        container.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Не вдалося завантажити бронювання.</td></tr>';
    }
}

function renderBookings(bookings) {
    const container = document.getElementById('bookings-list');
    container.innerHTML = '';
    if (bookings.length === 0) {
        container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#666;">Майбутніх бронювань не знайдено.</td></tr>';
        return;
    }
    bookings.forEach(b => {
        const row = document.createElement('tr');
        const statusClass = b.status ? b.status.toLowerCase() : 'confirmed';
        row.innerHTML = `<td>${b.date}</td>
            <td>${b.time}</td>
            <td style="font-weight:bold; color:#333;">${b.name}</td>
            <td>${b.guests}</td>
            <td>${b.phone || '-'}</td>
            <td><span class="status-pill status-${statusClass}">${b.status}</span></td>`;
        container.appendChild(row);
    });
}

window.switchView = switchView;
window.fetchOrders = fetchOrders;
window.updateStatus = updateStatus;
window.fetchBookings = fetchBookings;
window.logout = function () {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};
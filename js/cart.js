let pendingDeleteId = null;

const INLINE_FALLBACK_IMG = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23cccccc%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23555555%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2212px%22%3EНемає%20зображення%3C%2Ftext%3E%3C%2Fsvg%3E";

document.addEventListener('DOMContentLoaded', () => {
    injectDeleteModal();
    injectCheckoutModal();
    if (document.getElementById('cart-container')) {
        loadCart();
    }
});

async function addToCart(id, name, price, imageUrl) {
    const product_id = Number(id);
    const product_name = String(name || 'Невідомий товар');
    const product_price = Number(price || 0.00);
    const product_imageUrl = String(imageUrl || INLINE_FALLBACK_IMG);
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const response = await fetch('http://127.0.0.1:5000/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, product_id: product_id, quantity: 1 })
            });
            if (response.ok) {
                if (window.updateCartCount) window.updateCartCount();
                return
            } else {
                alert("Не вдалося додати до кошика.");
            }
        } catch (e) {
            console.error(e);
            alert("Помилка додавання товару.");
        }
    }
    else {
        let guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        let existingItem = guestCart.find(item => item.product_id === product_id);
        if (existingItem) {
            existingItem.quantity += 1;
            existingItem.name = product_name;
            existingItem.price = product_price;
            existingItem.image_url = product_imageUrl;
        } else {
            guestCart.push({
                cart_id: Date.now(),
                product_id: product_id,
                name: product_name,
                price: product_price,
                quantity: 1,
                image_url: product_imageUrl
            });
        }
        localStorage.setItem('guest_cart', JSON.stringify(guestCart));
        if (window.updateCartCount) window.updateCartCount();
    }
}

function placeOrder() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        if (window.openLoginRequiredModal) {
            window.openLoginRequiredModal();
        } else {
            alert("Будь ласка, увійдіть, щоб зробити замовлення.");
        }
        return;
    }
    openCheckoutModal();
}

function injectCheckoutModal() {
    if (document.getElementById('checkout-modal')) return;
    const modalHTML = `<div id="checkout-modal" class="modal-overlay">
        <div class="checkout-modal-content">
            <button class="close-modal" onclick="closeCheckoutModal()">&times;</button>
            <h3>Оформлення замовлення</h3>
            <form id="checkout-form" onsubmit="handleCheckoutSubmit(event)">        
                <div class="form-row">
                    <div class="form-group half">
                        <label>Ім'я</label>
                        <input type="text" id="co-fname" class="form-control" required>
                    </div>
                    <div class="form-group half">
                        <label>Прізвище</label>
                        <input type="text" id="co-lname" class="form-control" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group half">
                        <label>Email</label>
                        <input type="email" id="co-email" class="form-control" required>
                    </div>
                    <div class="form-group half">
                        <label>Телефон (необов'язково)</label>
                        <input type="tel" id="co-phone" class="form-control">
                    </div>
                </div>
                <div class="form-group">
                    <label style="margin-bottom:10px; display:block;">Варіант обслуговування</label>
                    <div class="toggle-options">
                        <label class="toggle-btn">
                            <input type="radio" name="orderType" value="indoor" checked onchange="toggleOrderFields()">
                            <span><i class="fas fa-utensils"></i> У закладі</span>
                        </label>
                        <label class="toggle-btn">
                            <input type="radio" name="orderType" value="delivery" onchange="toggleOrderFields()">
                            <span><i class="fas fa-truck"></i> Доставка</span>
                        </label>
                    </div>
                </div>
                <div id="indoor-fields">
                    <div class="form-group">
                        <label>Номер столика</label>
                        <input type="number" id="co-table" class="form-control" placeholder="напр. 12">
                    </div>
                </div>
                <div id="delivery-fields" style="display:none;">
                    <div class="form-group">
                        <label>Адреса доставки</label>
                        <input type="text" id="co-address" class="form-control" placeholder="Вулиця, кв., місто">
                    </div>
                    <div class="form-group">
                        <label>Бажаний час доставки</label>
                        <input type="time" id="co-time" class="form-control">
                    </div>
                </div>
                <div class="password-modal-actions" style="margin-top:20px;">
                    <button type="button" onclick="closeCheckoutModal()" class="btn-cancel">Скасувати</button>
                    <button type="submit" class="btn-confirm">Підтвердити замовлення</button>
                </div>
            </form>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openCheckoutModal() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('co-email').value = user.email || '';
        const names = (user.username || '').split(' ');
        if (names.length > 0) document.getElementById('co-fname').value = names[0];
        if (names.length > 1) document.getElementById('co-lname').value = names.slice(1).join(' ');
    }
    document.getElementById('checkout-modal').classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').classList.remove('active');
}

function toggleOrderFields() {
    const type = document.querySelector('input[name="orderType"]:checked').value;
    const indoorDiv = document.getElementById('indoor-fields');
    const deliveryDiv = document.getElementById('delivery-fields');
    const tableInput = document.getElementById('co-table');
    const addressInput = document.getElementById('co-address');
    const timeInput = document.getElementById('co-time');
    if (type === 'indoor') {
        indoorDiv.style.display = 'block';
        deliveryDiv.style.display = 'none';
        tableInput.required = true;
        addressInput.required = false;
        timeInput.required = false;
    } else {
        indoorDiv.style.display = 'none';
        deliveryDiv.style.display = 'block';
        tableInput.required = false;
        addressInput.required = true;
        timeInput.required = true;
    }
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    const formData = {
        firstName: document.getElementById('co-fname').value,
        lastName: document.getElementById('co-lname').value,
        email: document.getElementById('co-email').value,
        phone: document.getElementById('co-phone').value,
        type: document.querySelector('input[name="orderType"]:checked').value,
        details: {}
    };
    if (formData.type === 'indoor') {
        formData.details.table = document.getElementById('co-table').value;
    } else {
        formData.details.address = document.getElementById('co-address').value;
        formData.details.time = document.getElementById('co-time').value;
    }
    const userStr = localStorage.getItem('user');
    const user = JSON.parse(userStr);
    try {
        const response = await fetch('http://127.0.0.1:5000/api/orders/place', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                order_details: formData
            })
        });
        const data = await response.json();
        if (response.ok) {
            closeCheckoutModal();
            alert(`Замовлення #${data.order_id} успішно оформлено! Перевірте пошту для підтвердження.`);
            loadCart();
            if (window.updateCartCount) window.updateCartCount();
        } else {
            alert("Не вдалося оформити замовлення: " + (data.message || "Невідома помилка"));
        }
    } catch (error) {
        console.error(error);
        alert("Помилка мережі під час оформлення замовлення.");
    }
}

function injectDeleteModal() {
    if (document.getElementById('cart-delete-modal')) return;
    const modalHTML = `<div id="cart-delete-modal" class="modal-overlay">
        <div class="password-modal-content">
            <h3>Видалити товар</h3>
            <p style="color:#666; margin-bottom:20px;">
                Ви впевнені, що хочете видалити цей товар з кошика?
            </p>
            <div class="password-modal-actions">
                <button onclick="closeDeleteModal()" class="btn-cancel">Скасувати</button>
                <button onclick="confirmDelete()" class="btn-confirm" style="background-color: #d9534f; border-color: #d9534f;">Видалити</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function loadCart() {
    const container = document.getElementById('cart-container');
    const summary = document.getElementById('cart-summary');
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        const guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        if (container) renderCart(guestCart);
        if (window.updateCartCount) window.updateCartCount();
        return;
    }
    const user = JSON.parse(userStr);
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/cart?user_id=${user.id}`);
        if (!response.ok) throw new Error(`Статус сервера: ${response.status}`);
        const cartItems = await response.json();
        if (container) renderCart(cartItems);
        if (window.updateCartCount) window.updateCartCount();
    } catch (error) {
        console.error('Error loading cart:', error);
        if (container) container.innerHTML = '<p style="text-align:center; color:red; padding:40px;">Помилка завантаження кошика.</p>';
    }
}

function renderCart(items) {
    const container = document.getElementById('cart-container');
    const summary = document.getElementById('cart-summary');
    const totalEl = document.getElementById('cart-total');
    if (!container || !totalEl || !summary) return;
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 40px; color: #666;">Ваш кошик порожній. Перейдіть до <a href="menu.html" style="color:var(--color-green); font-weight:bold;">Меню</a>, щоб додати страви.</p>';
        summary.style.display = 'none';
        return;
    }
    let total = 0;
    let html = '<div class="cart-list">';
    items.forEach(item => {
        const itemPrice = Number(item.price);
        total += (itemPrice * item.quantity);
        const imgSrc = item.image_url && (item.image_url.startsWith('data:image') || item.image_url.startsWith('http')) ? item.image_url : INLINE_FALLBACK_IMG;
        html += `<div class="cart-item">
            <img src="${imgSrc}" alt="${item.name}" onerror="this.src='${INLINE_FALLBACK_IMG}'">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p class="price">$${itemPrice.toFixed(2)}</p>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button onclick="updateQuantity(${item.cart_id}, ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity(${item.cart_id}, ${item.quantity + 1})">+</button>
                </div>
                <button class="btn-remove" onclick="removeFromCart(${item.cart_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
    totalEl.textContent = '$' + total.toFixed(2);
    summary.style.display = 'block';
}

async function updateQuantity(cartId, newQuantity) {
    if (newQuantity < 1) return;
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        let guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        const item = guestCart.find(i => i.cart_id === cartId);
        if (item) {
            item.quantity = newQuantity;
            localStorage.setItem('guest_cart', JSON.stringify(guestCart));
            loadCart();
        }
        return;
    }
    try {
        const response = await fetch('http://127.0.0.1:5000/api/cart/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart_id: cartId, quantity: newQuantity })
        });
        if (response.ok) loadCart();
    } catch (error) { console.error(error); }
}

function removeFromCart(cartId) {
    pendingDeleteId = cartId;
    document.getElementById('cart-delete-modal').classList.add('active');
}

async function confirmDelete() {
    if (!pendingDeleteId) return;
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        let guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        guestCart = guestCart.filter(i => i.cart_id !== pendingDeleteId);
        localStorage.setItem('guest_cart', JSON.stringify(guestCart));
        closeDeleteModal();
        loadCart();
        return;
    }
    try {
        const response = await fetch('http://127.0.0.1:5000/api/cart/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart_id: pendingDeleteId })
        });
        if (response.ok) {
            closeDeleteModal();
            loadCart();
        } else {
            alert("Сервер не зміг видалити товар");
        }
    } catch (error) {
        console.error(error);
    }
}

function closeDeleteModal() {
    document.getElementById('cart-delete-modal').classList.remove('active');
    pendingDeleteId = null;
}

window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.confirmDelete = confirmDelete;
window.closeDeleteModal = closeDeleteModal;
window.closeCheckoutModal = closeCheckoutModal;
window.toggleOrderFields = toggleOrderFields;
window.handleCheckoutSubmit = handleCheckoutSubmit;
window.addToCart = addToCart;
window.placeOrder = placeOrder;
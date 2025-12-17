document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    switchAdminView('menu');
    fetchCategories();
});

document.addEventListener('click', (e) => {
    const popover = document.getElementById('role-popover');
    if (popover && popover.classList.contains('active')) {
        if (!popover.contains(e.target)) {
            closeRolePopover();
        }
    }
});


let allMenuItems = [];

function checkAdminAccess() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userStr);
    if (user.role_id !== 1) {
        alert("Доступ заборонено: Тільки для адміністраторів.");
        window.location.href = 'index.html';
    }
    const nameEl = document.getElementById('admin-name');
    if (nameEl) nameEl.style.display = 'none';
}

function switchAdminView(viewName) {
    document.querySelectorAll('.chef-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick').includes(viewName)) {
            link.classList.add('active');
        }
    });
    const menuDiv = document.getElementById('view-menu');
    const usersDiv = document.getElementById('view-users');
    if (viewName === 'menu') {
        menuDiv.style.display = 'block';
        usersDiv.style.display = 'none';
        fetchAdminMenu();
    } else {
        menuDiv.style.display = 'none';
        usersDiv.style.display = 'block';
        fetchUsers();
    }
}

async function fetchAdminMenu() {
    const tbody = document.getElementById('menu-list');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Завантаження...</td></tr>';
    try {
        const response = await fetch('http://127.0.0.1:5000/api/menu?view_mode=admin');
        allMenuItems = await response.json();
        updatePriceLimits();
        applyFilters();
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Помилка завантаження меню</td></tr>';
    }
}

function updatePriceLimits() {
    if (allMenuItems.length === 0) return;
    const maxPriceInDB = Math.ceil(Math.max(...allMenuItems.map(item => parseFloat(item.price))));
    const sliderMin = document.getElementById('slider-min');
    const sliderMax = document.getElementById('slider-max');
    sliderMin.max = maxPriceInDB;
    sliderMax.max = maxPriceInDB;
    sliderMin.value = 0;
    sliderMax.value = maxPriceInDB;
    updateSliderVisuals();
}

function syncPrice(source) {
    const sliderMin = document.getElementById('slider-min');
    const sliderMax = document.getElementById('slider-max');
    const minVal = parseInt(sliderMin.value);
    const maxVal = parseInt(sliderMax.value);
    const minGap = 1;
    if (source === 'slider-min') {
        if (minVal > maxVal - minGap) sliderMin.value = maxVal - minGap;
    } else {
        if (maxVal < minVal + minGap) sliderMax.value = minVal + minGap;
    }
    updateSliderVisuals();
    applyFilters();
}

function updateSliderVisuals() {
    const sliderMin = document.getElementById('slider-min');
    const sliderMax = document.getElementById('slider-max');
    const fill = document.getElementById('track-fill');
    const minVal = parseInt(sliderMin.value);
    const maxVal = parseInt(sliderMax.value);
    const maxLimit = parseInt(sliderMax.max);
    document.getElementById('val-min').textContent = `$${minVal}`;
    document.getElementById('val-max').textContent = `$${maxVal}`;
    const percent1 = (minVal / maxLimit) * 100;
    const percent2 = (maxVal / maxLimit) * 100;
    fill.style.left = percent1 + "%";
    fill.style.width = (percent2 - percent1) + "%";
}

function applyFilters() {
    const category = document.getElementById('filter-category').value;
    const minPrice = parseInt(document.getElementById('slider-min').value);
    const maxPrice = parseInt(document.getElementById('slider-max').value);
    const sortOrder = document.getElementById('sort-order').value;

    let filtered = allMenuItems.filter(item => {
        const price = parseFloat(item.price);
        const catMatch = category === 'all' || item.category_name === category;
        const priceMatch = price >= minPrice && price <= maxPrice;
        return catMatch && priceMatch;
    });

    filtered.sort((a, b) => {
        if (sortOrder === 'price_asc') return parseFloat(a.price) - parseFloat(b.price);
        if (sortOrder === 'price_desc') return parseFloat(b.price) - parseFloat(a.price);
        return b.name.localeCompare(a.name, 'uk');
    });

    renderMenuTable(filtered);
}

function renderMenuTable(items) {
    const tbody = document.getElementById('menu-list');
    tbody.innerHTML = '';
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Жоден елемент не відповідає фільтрам</td></tr>';
        return;
    }
    items.forEach(item => {
        const row = document.createElement('tr');
        const fallback = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2250%22%20height%3D%2250%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23ddd%22%2F%3E%3C%2Fsvg%3E";
        const imgSrc = (item.image_url && (item.image_url.startsWith('http') || item.image_url.startsWith('data:'))) ? item.image_url : fallback;
        row.innerHTML = `<td><img src="${imgSrc}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" onerror="this.src='${fallback}'"></td>
            <td style="font-weight:bold;">${item.name}</td>
            <td>${item.category_name}</td>
            <td>$${parseFloat(item.price).toFixed(2)}</td>
            <td>
                <label class="switch">
                    <input type="checkbox" ${item.is_available ? 'checked' : ''} onchange="toggleAvailability(${item.item_id})">
                    <span class="slider round"></span>
                </label>
            </td>
            <td>
                <button class="btn-remove" onclick="deleteItem(${item.item_id})" title="Видалити">
                    <i class="fas fa-trash"></i>
                </button>
            </td>`;
        tbody.appendChild(row);
    });
}

async function toggleAvailability(id) {
    try {
        await fetch('http://127.0.0.1:5000/api/menu/toggle_availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: id })
        });
        const item = allMenuItems.find(i => i.item_id === id);
        if (item) item.is_available = !item.is_available;
    } catch (e) { console.error(e); }
}

async function fetchCategories() {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/categories');
        const categories = await res.json();
        const filterSelect = document.getElementById('filter-category');
        const modalSelect = document.getElementById('new-item-category');
        filterSelect.innerHTML = '<option value="all">Усі категорії</option>';
        modalSelect.innerHTML = '';
        categories.forEach(c => {
            const opt1 = document.createElement('option');
            opt1.value = c.name; opt1.textContent = c.name;
            filterSelect.appendChild(opt1);
            const opt2 = document.createElement('option');
            opt2.value = c.category_id; opt2.textContent = c.name;
            modalSelect.appendChild(opt2);
        });
    } catch (e) { console.error(e); }
}

function openAddItemModal() { document.getElementById('add-item-modal').classList.add('active'); }
function closeAddItemModal() { document.getElementById('add-item-modal').classList.remove('active'); }

const addItemForm = document.getElementById('add-item-form');
if (addItemForm) {
    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-item-name').value;
        const desc = document.getElementById('new-item-desc').value;
        const price = document.getElementById('new-item-price').value;
        const category_id = document.getElementById('new-item-category').value;
        const image_url = document.getElementById('new-item-image').value;
        try {
            const res = await fetch('http://127.0.0.1:5000/api/menu/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: desc, price, category_id, image_url })
            });
            if (res.ok) {
                closeAddItemModal();
                fetchAdminMenu();
                e.target.reset();
                alert('Страву успішно додано!');
            } else { alert('Не вдалося додати страву'); }
        } catch (err) { console.error(err); alert('Помилка з\'єднання з сервером'); }
    });
}

async function deleteItem(id) {
    if (!confirm("Видалити цю страву?")) return;
    try {
        const res = await fetch('http://127.0.0.1:5000/api/menu/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: id })
        });
        if (res.ok) {
            allMenuItems = allMenuItems.filter(i => i.item_id !== id);
            applyFilters();
        } else { alert('Не вдалося видалити страву'); }
    } catch (e) { console.error(e); }
}

async function fetchUsers() {
    const idHeader = document.querySelector('#view-users thead th:first-child');
    if (idHeader) idHeader.style.display = 'none';
    const tbody = document.getElementById('users-list');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Завантаження...</td></tr>';
    try {
        const res = await fetch('http://127.0.0.1:5000/api/admin/users');
        const users = await res.json();
        tbody.innerHTML = '';
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        users.forEach(u => {
            let role = u.role_id === 1 ? 'Адмін' : u.role_id === 2 ? 'Шеф' : 'Клієнт';
            let style = role === 'Клієнт' ? 'background:#eee;color:#666' : role === 'Адмін' ? 'background:#ffebee;color:red' : 'background:#e8f5e9;color:green';
            const isSelf = u.user_id === currentUser.id;
            const deleteDisabled = isSelf ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : '';
            tbody.innerHTML += `<tr>
                <td style="font-weight:bold;">${u.username}</td>
                <td>${u.email}</td>
                <td>
                    <span class="status-pill" 
                          onclick="openRolePopover(event, ${u.user_id}, ${u.role_id})" 
                          style="${style}; cursor:pointer;" 
                          title="Натисніть, щоб змінити роль">
                        ${role} <i class="fas fa-caret-down" style="font-size:0.8em; margin-left:4px; opacity:0.6;"></i>
                    </span>
                </td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn-remove" onclick="deleteUser(${u.user_id})" title="Видалити користувача" ${deleteDisabled}>
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    } catch (e) { console.error(e); tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Помилка завантаження користувачів</td></tr>'; }
}

async function deleteUser(userId) {
    if (!confirm("Ви впевнені, що хочете видалити цього користувача? Це неможливо буде скасувати.")) return;
    try {
        const res = await fetch('http://127.0.0.1:5000/api/admin/user/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        if (res.ok) {
            alert("Користувача успішно видалено.");
            fetchUsers();
        } else {
            const data = await res.json();
            alert("Помилка: " + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Не вдалося з'єднатися з сервером.");
    }
}

function openRolePopover(event, userId, currentRoleId) {
    event.stopPropagation();
    const popover = document.getElementById('role-popover');
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    popover.style.top = (rect.bottom + scrollTop + 5) + 'px';
    popover.style.left = (rect.left + scrollLeft) + 'px';
    const roles = [
        { id: 3, name: 'Клієнт' },
        { id: 2, name: 'Шеф' },
        { id: 1, name: 'Адмін' }
    ];
    let listHtml = '';
    roles.forEach(r => {
        const isActive = r.id === currentRoleId;
        const activeClass = isActive ? 'current' : '';
        const checkMark = isActive ? '<i class="fas fa-check" style="margin-left:auto; color:var(--color-green)"></i>' : '';
        const clickAction = isActive ? '' : `onclick="saveUserRole(${userId}, ${r.id})"`;
        listHtml += `
            <div class="role-option ${activeClass}" ${clickAction}>
                ${r.name}
                ${checkMark}
            </div>
        `;
    });
    popover.innerHTML = listHtml;
    popover.classList.add('active');
}

function closeRolePopover() {
    document.getElementById('role-popover').classList.remove('active');
}

async function saveUserRole(userId, newRoleId) {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/admin/user/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, role_id: newRoleId })
        });
        if (res.ok) {
            closeRolePopover();
            fetchUsers();
        } else {
            alert("Не вдалося оновити роль.");
        }
    } catch (e) {
        console.error(e);
        alert("Помилка з'єднання з сервером.");
    }
}

window.switchAdminView = switchAdminView;
window.openAddItemModal = openAddItemModal;
window.closeAddItemModal = closeAddItemModal;
window.deleteItem = deleteItem;
window.fetchUsers = fetchUsers;
window.fetchAdminMenu = fetchAdminMenu;
window.applyFilters = applyFilters;
window.toggleAvailability = toggleAvailability;
window.syncPrice = syncPrice;
window.deleteUser = deleteUser;
window.openRolePopover = openRolePopover;
window.closeRolePopover = closeRolePopover;
window.saveUserRole = saveUserRole;
window.logout = function () {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};
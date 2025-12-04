document.addEventListener('DOMContentLoaded', () => {
    injectModalHTML();
    updateNavigation();
    loadProfileData();
    updateCartCount();
});

async function updateCartCount() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        const guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        const totalCount = guestCart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalCount;
        badge.style.display = 'inline-block';
        return;
    }

    const user = JSON.parse(userStr);
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/cart?user_id=${user.id}`);
        if (response.ok) {
            const items = await response.json();
            const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
            badge.textContent = totalCount;
            badge.style.display = 'inline-block';
        }
    } catch (error) {
        console.error("Could not update cart count", error);
        badge.textContent = '0';
        badge.style.display = 'inline-block';
    }
}
window.updateCartCount = updateCartCount;

function injectModalHTML() {
    if (!document.getElementById('profile-modal')) {
        const profileModalHTML = `
        <div id="profile-modal" class="modal-overlay" onclick="closeProfileModal(event)">
            <div class="profile-modal-content" onclick="event.stopPropagation()">
                <button class="close-modal" onclick="closeProfileModal()">&times;</button>
                <div class="profile-header">
                    <div class="profile-avatar"><i class="fas fa-user"></i></div>
                    <h2 id="modal-username">Завантаження...</h2>
                    <p id="modal-email">...</p>
                    <span class="role-badge" id="modal-role">Клієнт</span>
                </div>
                <div style="margin: 15px 0; padding-top: 15px; border-top: 1px solid #eee;">
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <button onclick="openPasswordModal(3)" style="background: #3A5A40; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Клієнт</button>
                        <button onclick="openPasswordModal(2)" style="background: #D4A373; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Шеф</button>
                        <button onclick="openPasswordModal(1)" style="background: #333; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Адмін</button>
                    </div>
                </div>
                <div class="profile-actions">
                    <button onclick="logout()" class="btn btn-logout"><i class="fas fa-sign-out-alt"></i> Вийти</button>
                </div>
            </div>
        </div>`;

        const passwordModalHTML = `<div id="password-modal" class="modal-overlay">
            <div class="password-modal-content">
                <h3>Підтвердження пароля</h3>
                <p id="modal-instruction" style="font-size:0.9rem; color:#666; margin-bottom:15px;">Будь ласка, введіть пароль для зміни ролі.</p>
                <p id="role-change-error" class="modal-error"></p> 
                <input type="password" id="role-confirm-password" placeholder="Пароль">
                <div class="password-modal-actions">
                    <button onclick="closePasswordModal()" class="btn-cancel">Скасувати</button>
                    <button onclick="confirmRoleChange()" class="btn-confirm">Підтвердити</button>
                </div>
            </div>
        </div>`;

        const infoModalHTML = `<div id="info-modal" class="modal-overlay">
            <div class="password-modal-content" style="text-align: center;">
                <div style="font-size: 3rem; color: #D4A373; margin-bottom: 10px;"><i class="fas fa-info-circle"></i></div>
                <h3 id="info-modal-title">Інформація</h3>
                <p id="info-modal-message" style="color: #666; margin-bottom: 20px;">Повідомлення</p>
                <button onclick="closeInfoModal()" class="btn-confirm" style="width: 100%;">OK</button>
            </div>
        </div>`;

        const confirmModalHTML = `<div id="confirmation-modal" class="modal-overlay">
            <div class="password-modal-content">
                <h3>Змінити роль</h3>
                <p style="font-size:0.9rem; color:#666; margin-bottom:20px;">Ви впевнені, що хочете перейти на роль Клієнта?</p>
                <div class="password-modal-actions">
                    <button onclick="closeConfirmationModal()" class="btn-cancel">Скасувати</button>
                    <button onclick="confirmRoleChange(true)" class="btn-confirm">Так, змінити</button>
                </div>
            </div>
        </div>`;

        const loginRequiredModalHTML = `<div id="login-required-modal" class="modal-overlay">
            <div class="password-modal-content">
                <h3 style="color:var(--color-green);">Необхідно увійти</h3>
                <p style="color:#666; margin-bottom:20px;">Ви повинні увійти в систему, щоб зробити замовлення.</p>
                <div class="password-modal-actions">
                    <button onclick="closeLoginRequiredModal()" class="btn-cancel">Скасувати</button>
                    <a href="login.html" class="btn-confirm" style="text-decoration:none; display:inline-block; line-height:inherit; padding: 8px 20px; border-radius: 4px;">Увійти / Реєстрація</a>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', profileModalHTML + passwordModalHTML + infoModalHTML + confirmModalHTML + loginRequiredModalHTML);
    }
}

function openLoginRequiredModal() {
    document.getElementById('login-required-modal').classList.add('active');
}
function closeLoginRequiredModal() {
    document.getElementById('login-required-modal').classList.remove('active');
}
window.openLoginRequiredModal = openLoginRequiredModal;
window.closeLoginRequiredModal = closeLoginRequiredModal;

let pendingRoleId = null;
function openPasswordModal(roleId) {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    if (user.role_id === roleId) {
        let roleName = roleId === 1 ? 'Адміністратором' : roleId === 2 ? 'Шеф-кухарем' : 'Клієнтом';
        showInfoModal('Роль не змінено', `Ви вже є ${roleName}.`);
        return;
    }
    pendingRoleId = roleId;
    document.querySelectorAll('.role-popup').forEach(p => p.classList.remove('active'));
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) profileModal.classList.remove('active');
    if (roleId === 3) {
        document.getElementById('confirmation-modal').classList.add('active');
        return;
    }
    document.getElementById('password-modal').classList.add('active');
    document.getElementById('role-confirm-password').value = '';
    document.getElementById('modal-instruction').style.display = 'block';
    document.getElementById('role-change-error').style.display = 'none';
    document.getElementById('role-confirm-password').focus();
}

function closePasswordModal() {
    document.getElementById('password-modal').classList.remove('active');
    document.getElementById('profile-modal').classList.add('active');
    pendingRoleId = null;
}

function closeConfirmationModal() {
    document.getElementById('confirmation-modal').classList.remove('active');
    document.getElementById('profile-modal').classList.add('active');
    pendingRoleId = null;
}

function showInfoModal(title, message) {
    document.querySelectorAll('.role-popup').forEach(p => p.classList.remove('active'));
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) profileModal.classList.remove('active');
    document.getElementById('info-modal-title').textContent = title;
    document.getElementById('info-modal-message').textContent = message;
    document.getElementById('info-modal').classList.add('active');
}

function closeInfoModal() {
    document.getElementById('info-modal').classList.remove('active');
    document.getElementById('profile-modal').classList.add('active');
}
window.closeInfoModal = closeInfoModal;

async function confirmRoleChange(skipPassword = false) {
    const passwordInput = document.getElementById('role-confirm-password');
    const password = passwordInput.value;
    const errorText = document.getElementById('role-change-error');
    const instructionText = document.getElementById('modal-instruction');

    if (!skipPassword && !password) {
        instructionText.style.display = 'none';
        errorText.textContent = "Потрібен пароль для зміни ролі";
        errorText.style.display = 'block';
        return;
    }

    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    try {
        const response = await fetch('http://127.0.0.1:5000/api/update_role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                role_id: pendingRoleId,
                password: password
            })
        });
        const data = await response.json();
        if (response.ok) {
            user.role_id = pendingRoleId;
            localStorage.setItem('user', JSON.stringify(user));
            document.getElementById('password-modal').classList.remove('active');
            document.getElementById('confirmation-modal').classList.remove('active');
            const newRoleName = pendingRoleId === 1 ? 'Адміністратор' : pendingRoleId === 2 ? 'Шеф-кухар' : 'Клієнт';
            if (pendingRoleId === 1) window.location.href = 'admin.html';
            else if (pendingRoleId === 2) window.location.href = 'chef.html';
            else window.location.href = 'index.html';
        } else {
            if (!skipPassword) {
                instructionText.style.display = 'none';
                errorText.textContent = data.message || 'Невірний пароль ролі.';
                errorText.style.display = 'block';
                passwordInput.value = '';
                passwordInput.focus();
            } else {
                alert("Помилка оновлення ролі: " + data.message);
                document.getElementById('confirmation-modal').classList.remove('active');
            }
        }
    } catch (err) {
        console.error(err);
        if (!skipPassword) {
            instructionText.style.display = 'none';
            errorText.textContent = 'Помилка сервера. Спробуйте ще раз.';
            errorText.style.display = 'block';
        } else {
            alert("Помилка сервера.");
        }
    }
}

window.openPasswordModal = openPasswordModal;
window.closePasswordModal = closePasswordModal;
window.closeConfirmationModal = closeConfirmationModal;
window.confirmRoleChange = confirmRoleChange;
window.closeProfileModal = closeProfileModal;
window.toggleRolePopup = toggleRolePopup;

function updateNavigation() {
    const userStr = localStorage.getItem('user');
    const navBtnId = document.getElementById('nav-login-btn');
    const loginBtns = document.querySelectorAll('.btn-login');
    if (userStr) {
        const user = JSON.parse(userStr);
        let roleLabel = user.role_id === 1 ? 'Адмін' : user.role_id === 2 ? 'Шеф' : 'Клієнт';
        loginBtns.forEach(btn => {
            if (btn === navBtnId || btn.classList.contains('btn-login')) {
                btn.innerHTML = `<i class="fas fa-user-circle"></i> ${user.username}`;
                btn.href = "javascript:void(0)";
                btn.classList.add('logged-in');
                btn.onclick = (e) => { e.preventDefault(); openProfileModal(); };
                let wrapper = btn.parentNode;
                if (!wrapper.classList.contains('auth-wrapper')) {
                    wrapper = document.createElement('div');
                    wrapper.className = 'auth-wrapper';
                    wrapper.style.display = 'flex';
                    wrapper.style.alignItems = 'center';
                    wrapper.style.gap = '4px';
                    wrapper.style.position = 'relative';
                    btn.parentNode.insertBefore(wrapper, btn);
                    wrapper.appendChild(btn);
                }
                let badge = wrapper.querySelector('.nav-role-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'nav-role-badge';
                    badge.style.cssText = `background-color: var(--color-gold); color: var(--color-dark); font-size: 0.75rem; font-weight: bold; padding: 4px 8px; border-radius: 20px; text-transform: uppercase; white-space: nowrap; cursor: pointer; transition: opacity 0.2s;`;
                    badge.onmouseover = () => badge.style.opacity = '0.8';
                    badge.onmouseout = () => badge.style.opacity = '1';
                    badge.onclick = (e) => toggleRolePopup(e);
                    wrapper.insertBefore(badge, btn);
                }
                badge.textContent = roleLabel;
            }
        });
    }
}

function toggleRolePopup(event) {
    event.preventDefault();
    event.stopPropagation();
    const badge = event.target;
    const wrapper = badge.parentNode;
    let popup = wrapper.querySelector('.role-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.className = 'role-popup';
        wrapper.appendChild(popup);
    }
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const roles = [{ id: 3, label: 'Клієнт' }, { id: 2, label: 'Шеф' }, { id: 1, label: 'Адмін' }];
    popup.innerHTML = '';
    roles.forEach(role => {
        const btn = document.createElement('button');
        btn.className = 'role-popup-item';
        btn.textContent = role.label;
        if (user.role_id === role.id) {
            btn.classList.add('current');
            btn.disabled = true;
        } else {
            btn.onclick = () => openPasswordModal(role.id);
        }
        popup.appendChild(btn);
    });
    document.querySelectorAll('.role-popup').forEach(p => { if (p !== popup) p.classList.remove('active'); });
    popup.classList.toggle('active');
}
document.addEventListener('click', (e) => {
    if (!e.target.closest('.auth-wrapper')) {
        document.querySelectorAll('.role-popup').forEach(p => p.classList.remove('active'));
    }
});

function openProfileModal() {
    const userStr = localStorage.getItem('user');
    if (!userStr) { window.location.href = 'login.html'; return; }
    const user = JSON.parse(userStr);
    document.getElementById('modal-username').textContent = user.username;
    document.getElementById('modal-email').textContent = `ID користувача: ${user.id}`;
    let roleName = user.role_id === 1 ? 'Адміністратор' : user.role_id === 2 ? 'Шеф-кухар' : 'Клієнт';
    document.getElementById('modal-role').textContent = roleName;
    document.getElementById('profile-modal').classList.add('active');
}

function closeProfileModal(event) {
    if (!event || event.target.id === 'profile-modal') {
        document.getElementById('profile-modal').classList.remove('active');
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function loadProfileData() {
    const usernameEl = document.getElementById('profile-username');
    if (!usernameEl) return;
    const userStr = localStorage.getItem('user');
    if (!userStr) { window.location.href = 'login.html'; return; }
    const user = JSON.parse(userStr);
    usernameEl.textContent = user.username;
    document.getElementById('profile-email').textContent = `ID користувача: ${user.id}`;
    let roleName = user.role_id === 1 ? 'Адміністратор' : user.role_id === 2 ? 'Шеф-кухар' : 'Клієнт';
    document.getElementById('profile-role').textContent = roleName;
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const response = await fetch('http://127.0.0.1:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user.role_id === 1) {
                    window.location.href = 'admin.html';
                } else if (data.user.role_id === 2) {
                    window.location.href = 'chef.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                showError('login-error', data.message || 'Помилка входу');
            }
        } catch (err) { console.error(err); showError('login-error', 'Помилка'); }
    });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        try {
            const response = await fetch('http://127.0.0.1:5000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();
            if (response.ok) {
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = 'index.html';
                } else {
                    alert('Акаунт створено!'); switchTab('login');
                }
            } else {
                showError('register-error', data.error || data.message || 'Не вдалося');
            }
        } catch (err) { console.error(err); showError('register-error', 'Помилка'); }
    });
}

function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
    }
}

function switchTab(tab) {
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (tab === 'login') {
        document.querySelector('.auth-tabs button:nth-child(1)').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelector('.auth-tabs button:nth-child(2)').classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}
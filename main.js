const MENU_API_URL = 'http://127.0.0.1:5000/api/menu';

document.addEventListener('DOMContentLoaded', () => {
    const menuContainer = document.getElementById('dynamic-menu-container');
    if (menuContainer) {
        loadMenu(menuContainer);
    }
});

async function loadMenu(container) {
    try {
        const response = await fetch(MENU_API_URL);
        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }
        const data = await response.json();
        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = '<p style="text-align:center">Меню наразі порожнє.</p>';
            return;
        }
        const groupedMenu = {};
        data.forEach(item => {
            const category = item.category_name || 'Інше';
            if (!groupedMenu[category]) {
                groupedMenu[category] = [];
            }
            groupedMenu[category].push(item);
        });

        const uniqueCategories = Object.keys(groupedMenu);
        uniqueCategories.forEach(categoryName => {
            const items = groupedMenu[categoryName];
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'menu-section';
            const title = document.createElement('h3');
            title.className = 'menu-category';
            title.textContent = categoryName;
            const gridDiv = document.createElement('div');
            gridDiv.className = 'menu-grid';
            items.forEach(item => {
                gridDiv.innerHTML += createMenuItemHTML(item);
            });
            sectionDiv.appendChild(title);
            sectionDiv.appendChild(gridDiv);
            container.appendChild(sectionDiv);
        });
    } catch (error) {
        console.error('Error loading menu:', error);
        container.innerHTML = '<p style="text-align:center; color:red">Не вдалося завантажити меню. Переконайтеся, що сервер працює.</p>';
    }
}

function createMenuItemHTML(item) {
    const fallbackImage = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23cccccc%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23555555%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%20font-family%3D%22sans-serif%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E";
    const priceValue = parseFloat(item.price) || 0;
    const rawName = String(item.name || 'Невідома страва');
    const sanitizedName = rawName.replace(/'/g, "\\'").replace(/\n/g, '').replace(/\r/g, '');
    const itemId = item.item_id || 0;
    const imageUrl = item.image_url || fallbackImage;
    return `<div class="menu-item">
        <img src="${item.image_url}" 
             alt="${item.name}" 
             class="item-img"
             onerror="this.onerror=null; this.src='${fallbackImage}'">
        <div class="item-content">
            <div class="item-details">
                <h4>${item.name}</h4>
                <p>${item.description}</p>
            </div>
            <div class="item-actions">
                <div class="item-price">$${priceValue.toFixed(2)}</div>
                <button 
                    class="action-btn btn-add" 
                    onclick="addToCart(
                        ${itemId}, 
                        '${sanitizedName}', 
                        ${priceValue}, 
                        '${imageUrl}'
                    )">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        </div>
    </div>`;
}
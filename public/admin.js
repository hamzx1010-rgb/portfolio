const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const passwordInput = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const addProductForm = document.getElementById('addProductForm');
const adminProducts = document.getElementById('adminProducts');
const adminOrders = document.getElementById('adminOrders');
const productImagesInput = document.getElementById('productImages');
const imagePreview = document.getElementById('imagePreview');

let adminPassword = localStorage.getItem('adminPassword') || '';

if (adminPassword) {
    checkLogin(adminPassword);
}

loginBtn.addEventListener('click', () => {
    const password = passwordInput.value.trim();
    if (!password) return;
    checkLogin(password);
});

passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminPassword');
    adminPassword = '';
    loginScreen.classList.remove('hidden');
    adminDashboard.classList.add('hidden');
    passwordInput.value = '';
});

productImagesInput.addEventListener('change', () => {
    imagePreview.innerHTML = '';
    const files = productImagesInput.files;
    for (let i = 0; i < files.length && i < 5; i++) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(files[i]);
        imagePreview.appendChild(img);
    }
});

addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value.trim());
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('old', document.getElementById('productOld').value || 0);
    formData.append('discount', document.getElementById('productDiscount').value || 0);
    formData.append('category', document.getElementById('productCategory').value);

    const files = productImagesInput.files;
    for (let i = 0; i < files.length && i < 5; i++) {
        formData.append('images', files[i]);
    }

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            addProductForm.reset();
            imagePreview.innerHTML = '';
            loadAdminData();
            alert('Template added successfully!');
        } else {
            alert(data.error || 'Failed to add template.');
        }
    } catch (err) {
        alert('Failed to add template.');
    }
});

async function checkLogin(password) {
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (data.success) {
            adminPassword = password;
            localStorage.setItem('adminPassword', password);
            loginScreen.classList.add('hidden');
            adminDashboard.classList.remove('hidden');
            loadAdminData();
        } else {
            loginError.textContent = 'Wrong password. Try again.';
        }
    } catch (err) {
        loginError.textContent = 'Server error.';
    }
}

async function loadAdminData() {
    await loadProducts();
    await loadOrders();
}

async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        adminProducts.innerHTML = products.length
            ? products.map(p => `
                <div class="admin-product-card">
                    <img src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/300x160?text=No+Image'}" alt="${p.name}">
                    <div class="info">
                        <span class="category" style="background:#eee;color:#555;padding:3px 10px;border-radius:20px;font-size:0.75rem;text-transform:uppercase;">${p.category}</span>
                        <h3>${p.name}</h3>
                        <p class="price">${p.price} DZD</p>
                        <button class="btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
                    </div>
                </div>
              `).join('')
            : '<p class="empty-state">No templates yet. Add one above.</p>';
    } catch (err) {
        console.error('Failed to load products:', err);
    }
}

async function loadOrders() {
    try {
        const res = await fetch('/api/orders', {
            headers: { 'x-admin-password': adminPassword }
        });
        const orders = await res.json();

        adminOrders.innerHTML = orders.length
            ? orders.map(o => `
                <div class="admin-order-card">
                    <h4>${o.product}</h4>
                    <p><strong>Customer:</strong> ${o.customer}</p>
                    <p><strong>Phone:</strong> ${o.phone}</p>
                    ${o.email ? `<p><strong>Email:</strong> ${o.email}</p>` : ''}
                    <p><strong>Website Type:</strong> ${o.websiteType || 'N/A'}</p>
                    <p><strong>Quantity:</strong> ${o.qty}</p>
                    <p><strong>Total:</strong> ${o.price} DZD</p>
                    <p class="date">${new Date(o.createdAt).toLocaleString()}</p>
                </div>
              `).join('')
            : '<p class="empty-state">No orders yet.</p>';
    } catch (err) {
        adminOrders.innerHTML = '<p class="empty-state">Failed to load orders.</p>';
        console.error('Failed to load orders:', err);
    }
}

window.deleteProduct = async function(id) {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminData();
        } else {
            alert('Failed to delete template.');
        }
    } catch (err) {
        alert('Failed to delete template.');
    }
};

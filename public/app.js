let products = [];
let currentProduct = null;
let currentQty = 1;
let currentCategory = 'All';
let currentImageIndex = 0;
let currentProductImages = [];

function displayCurrentImage() {
    if (currentProductImages.length === 0) {
        document.getElementById('currentImage').src = '';
        document.getElementById('prevImageBtn').style.display = 'none';
        document.getElementById('nextImageBtn').style.display = 'none';
        document.getElementById('imageCounter').style.display = 'none';
        return;
    }

    document.getElementById('currentImage').src = currentProductImages[currentImageIndex];

    if (currentProductImages.length > 1) {
        document.getElementById('prevImageBtn').style.display = 'flex';
        document.getElementById('nextImageBtn').style.display = 'flex';
        document.getElementById('imageCounter').style.display = 'block';
        document.getElementById('imageCounter').textContent = `${currentImageIndex + 1} / ${currentProductImages.length}`;
    } else {
        document.getElementById('prevImageBtn').style.display = 'none';
        document.getElementById('nextImageBtn').style.display = 'none';
        document.getElementById('imageCounter').style.display = 'none';
    }
}

function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % currentProductImages.length;
    displayCurrentImage();
}

function previousImage() {
    currentImageIndex = (currentImageIndex - 1 + currentProductImages.length) % currentProductImages.length;
    displayCurrentImage();
}

async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        products = await res.json();
        loadCategories();
        displayProducts();
    } catch (e) {
        console.error('Error loading products:', e);
    }
}

function loadCategories() {
    const categories = ['All', ...new Set(products.map(p => p.category || 'Uncategorized'))];
    let html = '';
    categories.forEach(cat => {
        html += `<button class="category-btn ${cat === 'All' ? 'active' : ''}" onclick="filterCategory('${cat}')">${cat}</button>`;
    });
    document.getElementById('categoryFilter').innerHTML = html;
}

function filterCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    displayProducts();
}

function displayProducts() {
    let filtered = products;
    if (currentCategory !== 'All') {
        filtered = products.filter(p => (p.category || 'Uncategorized') === currentCategory);
    }

    if (filtered.length === 0) {
        document.getElementById('productsGrid').innerHTML = '';
        document.getElementById('noProducts').style.display = 'block';
        return;
    }

    document.getElementById('noProducts').style.display = 'none';
    let html = '';
    filtered.forEach(p => {
        const imageUrl = p.images && p.images[0] ? p.images[0] : null;
        html += `
            <div class="product-card" onclick="openPopup('${p.id}')">
                <div class="product-image">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${p.name}">` : '🌐'}
                    ${p.discount > 0 ? `<div class="discount-badge">-${p.discount}%</div>` : ''}
                </div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-price">${p.price} DZD</div>
                    <div class="product-old-price">${p.old || p.price} DZD</div>
                </div>
            </div>
        `;
    });
    document.getElementById('productsGrid').innerHTML = html;
}

function openPopup(id) {
    currentProduct = products.find(p => p.id === id);
    currentQty = 1;
    currentImageIndex = 0;
    currentProductImages = (currentProduct.images && currentProduct.images.length > 0) ? currentProduct.images : [];

    document.getElementById('popupTitle').textContent = currentProduct.name;
    document.getElementById('popupPrice').textContent = currentProduct.price + ' DZD';
    document.getElementById('popupOldPrice').textContent = (currentProduct.old || currentProduct.price) + ' DZD';
    document.getElementById('qtyDisplay').textContent = '1';
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('websiteType').value = currentProduct.category || '';
    updateTotal();

    displayCurrentImage();
    document.getElementById('popup').classList.add('show');
}

function closePopup() {
    document.getElementById('popup').classList.remove('show');
}

function increaseQty() {
    currentQty++;
    document.getElementById('qtyDisplay').textContent = currentQty;
    updateTotal();
}

function decreaseQty() {
    if (currentQty > 1) {
        currentQty--;
        document.getElementById('qtyDisplay').textContent = currentQty;
        updateTotal();
    }
}

function updateTotal() {
    const total = currentProduct.price * currentQty;
    document.getElementById('totalPrice').textContent = total + ' DZD';
}

async function submitOrder() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const websiteType = document.getElementById('websiteType').value.trim();

    if (!name || !phone) {
        alert('⚠️ Please fill your name and phone number');
        return;
    }

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product: currentProduct.name,
                price: currentProduct.price * currentQty,
                qty: currentQty,
                customer: name,
                phone,
                email,
                websiteType
            })
        });

        if (res.ok) {
            document.getElementById('successMessage').classList.add('show');
            setTimeout(() => {
                document.getElementById('successMessage').classList.remove('show');
            }, 3000);
            closePopup();
        } else {
            alert('❌ Error submitting order');
        }
    } catch (e) {
        alert('❌ Connection error');
        console.error(e);
    }
}

loadProducts();

document.getElementById('popup').addEventListener('click', (e) => {
    if (e.target.id === 'popup') closePopup();
});

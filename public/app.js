let products = [];
let currentProduct = null;
let currentQty = 1;
let currentCategory = 'all';
let currentImageIndex = 0;
let currentImages = [];

const portfolioGrid = document.getElementById('portfolioGrid');
const shopGrid = document.getElementById('shopGrid');
const filterBtns = document.querySelectorAll('.filter-btn');
const modal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');
const toast = document.getElementById('toast');

async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        products = await res.json();
        renderPortfolio();
        renderShop();
    } catch (err) {
        console.error('Error loading products:', err);
    }
}

function renderPortfolio() {
    const filtered = currentCategory === 'all'
        ? products
        : products.filter(p => p.category === currentCategory);

    if (filtered.length === 0) {
        portfolioGrid.innerHTML = '';
        document.getElementById('noProducts').style.display = 'block';
        return;
    }

    document.getElementById('noProducts').style.display = 'none';
    portfolioGrid.innerHTML = filtered.map(p => cardHTML(p)).join('');
}

function renderShop() {
    const filtered = currentCategory === 'all'
        ? products
        : products.filter(p => p.category === currentCategory);

    shopGrid.innerHTML = filtered.length
        ? filtered.map(p => cardHTML(p)).join('')
        : '<p class="no-products">No templates available in this category yet.</p>';
}

function cardHTML(p) {
    const imageUrl = p.images && p.images[0] ? p.images[0] : null;
    const discountBadge = p.discount > 0 ? `<span class="card-badge">-${p.discount}%</span>` : '';
    const oldPrice = p.old > 0 ? `<span class="card-old">${p.old} DZD</span>` : '';

    return `
        <div class="card" onclick="openModal('${p.id}')">
            <div class="card-image">
                ${imageUrl ? `<img src="${imageUrl}" alt="${p.name}">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;">No Preview</div>'}
                ${discountBadge}
            </div>
            <div class="card-body">
                <div class="card-cat">${p.category}</div>
                <h3 class="card-title">${p.name}</h3>
                <div class="card-prices">
                    <span class="card-price">${p.price} DZD</span>
                    ${oldPrice}
                </div>
                <button class="card-action" onclick="event.stopPropagation(); openModal('${p.id}')">Buy Now</button>
            </div>
        </div>
    `;
}

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.filter;
        renderPortfolio();
        renderShop();
    });
});

function openModal(id) {
    currentProduct = products.find(p => p.id === id);
    if (!currentProduct) return;

    currentQty = 1;
    currentImageIndex = 0;
    currentImages = currentProduct.images || [];

    document.getElementById('modalTitle').textContent = currentProduct.name;
    document.getElementById('modalCategory').textContent = currentProduct.category;
    document.getElementById('modalPrice').textContent = currentProduct.price + ' DZD';
    document.getElementById('modalOldPrice').textContent = (currentProduct.old || currentProduct.price) + ' DZD';
    document.getElementById('modalOldPrice').style.display = currentProduct.old > 0 ? 'inline' : 'none';
    document.getElementById('modalDiscount').textContent = currentProduct.discount > 0 ? `-${currentProduct.discount}% OFF` : '';
    document.getElementById('modalDiscount').style.display = currentProduct.discount > 0 ? 'inline' : 'none';
    document.getElementById('qtyDisplay').textContent = '1';
    document.getElementById('websiteType').value = currentProduct.category || '';

    orderForm.reset();
    updateTotal();
    updateGallery();

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function updateGallery() {
    const imgEl = document.getElementById('modalImage');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const counter = document.getElementById('galCounter');

    if (currentImages.length === 0) {
        imgEl.src = '';
        imgEl.style.display = 'none';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        counter.style.display = 'none';
        return;
    }

    imgEl.style.display = 'block';
    imgEl.src = currentImages[currentImageIndex];

    if (currentImages.length > 1) {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
        counter.style.display = 'inline-block';
        counter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        counter.style.display = 'none';
    }
}

function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    updateGallery();
}

function prevImage() {
    currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    updateGallery();
}

function changeQty(delta) {
    const newQty = currentQty + delta;
    if (newQty >= 1) {
        currentQty = newQty;
        document.getElementById('qtyDisplay').textContent = currentQty;
        updateTotal();
    }
}

function updateTotal() {
    const total = currentProduct.price * currentQty;
    document.getElementById('totalPrice').textContent = total + ' DZD';
}

orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const websiteType = document.getElementById('websiteType').value.trim();

    if (!name || !phone) {
        alert('Please fill in your name and phone number');
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
            closeModal();
            showToast();
            orderForm.reset();
        } else {
            alert('Error submitting order. Please try again.');
        }
    } catch (err) {
        alert('Connection error. Please try again.');
        console.error(err);
    }
});

function showToast() {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
});

loadProducts();

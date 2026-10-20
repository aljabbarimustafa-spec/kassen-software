const STORAGE_KEYS = {
  products: 'quickserve_products_v1',
  sales: 'quickserve_sales_v1',
};

const defaultProducts = [
  { id: 1, name: 'Döner Classic', category: 'Döner', price: 8.9, stock: 30 },
  { id: 2, name: 'Döner XL', category: 'Döner', price: 10.5, stock: 24 },
  { id: 3, name: 'Burger Deluxe', category: 'Burger', price: 12.8, stock: 18 },
  { id: 4, name: 'Cheeseburger', category: 'Burger', price: 11.4, stock: 20 },
  { id: 5, name: 'Margherita Pizza', category: 'Pizza', price: 14.9, stock: 16 },
  { id: 6, name: 'Salat Mix', category: 'Salat', price: 9.7, stock: 12 },
  { id: 7, name: 'Coca-Cola 0,5L', category: 'Getränke', price: 2.9, stock: 40 },
  { id: 8, name: 'Wasser 0,5L', category: 'Getränke', price: 2.2, stock: 36 },
  { id: 9, name: 'Pommes', category: 'Snacks', price: 3.8, stock: 28 },
  { id: 10, name: 'Nuggets', category: 'Snacks', price: 5.1, stock: 22 },
];

const state = {
  products: loadFromStorage(STORAGE_KEYS.products, defaultProducts),
  sales: loadFromStorage(STORAGE_KEYS.sales, []),
  cart: [],
  selectedCategory: 'Alle',
  paymentMethod: 'Bar',
  orderType: 'Mitnahme',
  discount: 0,
  lastReceipt: null,
};

const elements = {
  searchInput: document.getElementById('searchInput'),
  categoryBar: document.getElementById('categoryBar'),
  productGrid: document.getElementById('productGrid'),
  cartItems: document.getElementById('cartItems'),
  subtotalValue: document.getElementById('subtotalValue'),
  discountValue: document.getElementById('discountValue'),
  totalValue: document.getElementById('totalValue'),
  orderType: document.getElementById('orderType'),
  paymentMethod: document.getElementById('paymentMethod'),
  discountInput: document.getElementById('discountInput'),
  saveOrderBtn: document.getElementById('saveOrderBtn'),
  printBtn: document.getElementById('printBtn'),
  clearCartBtn: document.getElementById('clearCartBtn'),
  statsCards: document.getElementById('statsCards'),
  salesList: document.getElementById('salesList'),
  inventoryList: document.getElementById('inventoryList'),
  productForm: document.getElementById('productForm'),
  productName: document.getElementById('productName'),
  productCategory: document.getElementById('productCategory'),
  productPrice: document.getElementById('productPrice'),
  productStock: document.getElementById('productStock'),
  adminProductList: document.getElementById('adminProductList'),
  resetDemoBtn: document.getElementById('resetDemoBtn'),
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function getCategories() {
  const categories = [...new Set(state.products.map((product) => product.category))];
  return ['Alle', ...categories];
}

function getCartSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getDiscountValue() {
  const numericDiscount = Number(state.discount) || 0;
  return Math.min(numericDiscount, getCartSubtotal());
}

function getOrderTotal() {
  return Math.max(getCartSubtotal() - getDiscountValue(), 0);
}

function renderCategoryBar() {
  const categories = getCategories();
  elements.categoryBar.innerHTML = categories
    .map(
      (category) => `
        <button class="category-pill ${state.selectedCategory === category ? 'active' : ''}" data-category="${category}">
          ${category}
        </button>
      `
    )
    .join('');

  elements.categoryBar.querySelectorAll('.category-pill').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedCategory = button.dataset.category;
      renderCategoryBar();
      renderProducts();
    });
  });
}

function renderProducts() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const filteredProducts = state.products.filter((product) => {
    const matchesCategory =
      state.selectedCategory === 'Alle' || product.category === state.selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(search) || product.category.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

  if (!filteredProducts.length) {
    elements.productGrid.innerHTML = '<div class="empty-cart">Keine Produkte gefunden.</div>';
    return;
  }

  elements.productGrid.innerHTML = filteredProducts
    .map(
      (product) => `
        <article class="product-card">
          <div>
            <div class="product-meta">
              <span>${product.category}</span>
              <span>Lag.: ${product.stock}</span>
            </div>
            <h4>${product.name}</h4>
          </div>
          <div>
            <div class="product-price">${formatCurrency(product.price)}</div>
            <button class="primary" data-add-product="${product.id}">Zum Warenkorb</button>
          </div>
        </article>
      `
    )
    .join('');

  elements.productGrid.querySelectorAll('[data-add-product]').forEach((button) => {
    button.addEventListener('click', () => addToCart(Number(button.dataset.addProduct)));
  });
}

function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  const existingItem = state.cart.find((item) => item.id === productId);
  if (existingItem) {
    if (existingItem.quantity >= product.stock) {
      alert('Lagerbestand erreicht.');
      return;
    }
    existingItem.quantity += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: 1,
      stock: product.stock,
    });
  }

  renderCart();
}

function updateCartQuantity(productId, delta) {
  const item = state.cart.find((cartItem) => cartItem.id === productId);
  if (!item) return;

  const product = state.products.find((productItem) => productItem.id === productId);
  const nextQuantity = item.quantity + delta;

  if (nextQuantity <= 0) {
    state.cart = state.cart.filter((cartItem) => cartItem.id !== productId);
  } else {
    if (product && nextQuantity > product.stock) {
      alert('Lagerbestand erreicht.');
      return;
    }
    item.quantity = nextQuantity;
  }

  renderCart();
}

function clearCart() {
  state.cart = [];
  renderCart();
}

function renderCart() {
  const subtotal = getCartSubtotal();
  const discount = getDiscountValue();
  const total = getOrderTotal();

  if (!state.cart.length) {
    elements.cartItems.innerHTML = '<div class="empty-cart">Noch keine Produkte im Warenkorb.</div>';
  } else {
    elements.cartItems.innerHTML = state.cart
      .map(
        (item) => `
          <div class="cart-item">
            <div>
              <h4>${item.name}</h4>
              <small>${formatCurrency(item.price)} pro Stück</small>
              <div class="qty-controls">
                <button data-cart-minus="${item.id}">-</button>
                <span>${item.quantity}</span>
                <button data-cart-plus="${item.id}">+</button>
              </div>
            </div>
            <strong>${formatCurrency(item.price * item.quantity)}</strong>
          </div>
        `
      )
      .join('');

    elements.cartItems.querySelectorAll('[data-cart-minus]').forEach((button) => {
      button.addEventListener('click', () => updateCartQuantity(Number(button.dataset.cartMinus), -1));
    });

    elements.cartItems.querySelectorAll('[data-cart-plus]').forEach((button) => {
      button.addEventListener('click', () => updateCartQuantity(Number(button.dataset.cartPlus), 1));
    });
  }

  elements.subtotalValue.textContent = formatCurrency(subtotal);
  elements.discountValue.textContent = `-${formatCurrency(discount)}`;
  elements.totalValue.textContent = formatCurrency(total);
}

function renderStats() {
  const today = new Date();
  const todaySales = state.sales.filter((sale) => isToday(sale.timestamp));
  const totalRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const totalOrders = todaySales.length;
  const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;
  const itemsSold = todaySales.reduce((sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0), 0);

  const statCards = [
    { label: 'Umsatz heute', value: formatCurrency(totalRevenue) },
    { label: 'Bestellungen', value: String(totalOrders) },
    { label: 'Durchschnitt', value: formatCurrency(avgOrder) },
    { label: 'Produkte', value: String(itemsSold) },
  ];

  elements.statsCards.innerHTML = statCards
    .map(
      (card) => `
        <div class="stat-card">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
        </div>
      `
    )
    .join('');
}

function renderSalesHistory() {
  const sales = [...state.sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (!sales.length) {
    elements.salesList.innerHTML = '<div class="history-item muted">Noch keine Verkäufe.</div>';
    return;
  }

  elements.salesList.innerHTML = sales
    .slice(0, 8)
    .map(
      (sale) => `
        <div class="history-item">
          <div class="topline">
            <strong>${sale.id}</strong>
            <span>${formatCurrency(sale.total)}</span>
          </div>
          <div class="muted">${new Date(sale.timestamp).toLocaleString('de-DE')} · ${sale.orderType} · ${sale.paymentMethod}</div>
        </div>
      `
    )
    .join('');
}

function renderInventory() {
  const lowStockProducts = [...state.products].sort((a, b) => a.stock - b.stock).slice(0, 8);
  elements.inventoryList.innerHTML = lowStockProducts
    .map(
      (product) => `
        <div class="inventory-item">
          <div class="topline">
            <strong>${product.name}</strong>
            <span class="${product.stock <= 10 ? 'danger' : ''}">${product.stock} Stück</span>
          </div>
          <div class="muted">${product.category}</div>
        </div>
      `
    )
    .join('');
}

function renderAdminProducts() {
  elements.adminProductList.innerHTML = state.products
    .map(
      (product) => `
        <div class="admin-item">
          <div class="topline">
            <strong>${product.name}</strong>
            <span class="muted">${formatCurrency(product.price)}</span>
          </div>
          <div class="muted">${product.category} · Lager: ${product.stock}</div>
          <div class="actions">
            <button class="secondary" data-stock-plus="${product.id}">+1 Lager</button>
            <button class="delete-btn" data-delete-product="${product.id}">Löschen</button>
          </div>
        </div>
      `
    )
    .join('');

  elements.adminProductList.querySelectorAll('[data-stock-plus]').forEach((button) => {
    button.addEventListener('click', () => adjustProductStock(Number(button.dataset.stockPlus), 1));
  });

  elements.adminProductList.querySelectorAll('[data-delete-product]').forEach((button) => {
    button.addEventListener('click', () => deleteProduct(Number(button.dataset.deleteProduct)));
  });
}

function adjustProductStock(productId, delta) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  product.stock = Math.max(0, product.stock + delta);
  saveToStorage(STORAGE_KEYS.products, state.products);
  renderProducts();
  renderInventory();
  renderAdminProducts();
}

function deleteProduct(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  const isInCart = state.cart.some((item) => item.id === productId);
  if (isInCart) {
    alert('Produkt ist aktuell im Warenkorb. Bitte erst entfernen.');
    return;
  }

  state.products = state.products.filter((item) => item.id !== productId);
  saveToStorage(STORAGE_KEYS.products, state.products);
  renderCategoryBar();
  renderProducts();
  renderInventory();
  renderAdminProducts();
}

function addProduct(event) {
  event.preventDefault();
  const name = elements.productName.value.trim();
  const category = elements.productCategory.value;
  const price = Number(elements.productPrice.value);
  const stock = Number(elements.productStock.value);

  if (!name || !price || !stock) {
    alert('Bitte alle Felder korrekt ausfüllen.');
    return;
  }

  const newProduct = {
    id: Date.now(),
    name,
    category,
    price,
    stock,
  };

  state.products.push(newProduct);
  saveToStorage(STORAGE_KEYS.products, state.products);
  elements.productForm.reset();
  renderCategoryBar();
  renderProducts();
  renderInventory();
  renderAdminProducts();
}

function saveOrder() {
  if (!state.cart.length) {
    alert('Bitte zuerst Produkte in den Warenkorb legen.');
    return;
  }

  const subtotal = getCartSubtotal();
  const discount = getDiscountValue();
  const total = getOrderTotal();

  const sale = {
    id: `R-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    orderType: state.orderType,
    paymentMethod: state.paymentMethod,
    discount,
    subtotal,
    total,
    items: state.cart.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
  };

  state.sales.unshift(sale);
  saveToStorage(STORAGE_KEYS.sales, state.sales);

  state.products = state.products.map((product) => {
    const cartItem = state.cart.find((item) => item.id === product.id);
    if (!cartItem) return product;
    return {
      ...product,
      stock: Math.max(0, product.stock - cartItem.quantity),
    };
  });

  saveToStorage(STORAGE_KEYS.products, state.products);
  state.lastReceipt = sale;
  clearCart();
  renderStats();
  renderSalesHistory();
  renderInventory();
  renderAdminProducts();
  renderProducts();
  renderCart();

  alert(`Verkauf gespeichert: ${sale.id}`);
}

function printReceipt() {
  if (!state.lastReceipt) {
    alert('Noch keine Rechnung vorhanden.');
    return;
  }

  const invoice = state.lastReceipt;
  const receiptWindow = window.open('', '_blank', 'width=380,height=700');
  if (!receiptWindow) {
    alert('Popup blockiert. Bitte erlauben Sie Popups.');
    return;
  }

  receiptWindow.document.write(`
    <html>
      <head>
        <title>Rechnung ${invoice.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { text-align: center; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          td { padding: 5px 0; }
          .total { border-top: 1px solid #333; margin-top: 12px; padding-top: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>QuickServe POS</h2>
        <div>Rechnung: ${invoice.id}</div>
        <div>${new Date(invoice.timestamp).toLocaleString('de-DE')}</div>
        <div>${invoice.orderType} · ${invoice.paymentMethod}</div>
        <table>
          ${invoice.items
            .map(
              (item) => `
                <tr>
                  <td>${item.name} x${item.quantity}</td>
                  <td style="text-align:right;">${formatCurrency(item.price * item.quantity)}</td>
                </tr>
              `
            )
            .join('')}
        </table>
        <div class="total">
          <div>Zwischensumme: ${formatCurrency(invoice.subtotal)}</div>
          <div>Rabatt: -${formatCurrency(invoice.discount)}</div>
          <div>Gesamt: ${formatCurrency(invoice.total)}</div>
        </div>
      </body>
    </html>
  `);

  receiptWindow.document.close();
  receiptWindow.focus();
  receiptWindow.print();
}

function isToday(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function resetDemo() {
  const confirmed = confirm('Demo-Daten wirklich zurücksetzen?');
  if (!confirmed) return;

  state.products = [...defaultProducts];
  state.sales = [];
  state.cart = [];
  state.discount = 0;
  state.orderType = 'Mitnahme';
  state.paymentMethod = 'Bar';
  saveToStorage(STORAGE_KEYS.products, state.products);
  saveToStorage(STORAGE_KEYS.sales, state.sales);
  elements.productForm.reset();
  elements.discountInput.value = '0';
  elements.orderType.value = 'Mitnahme';
  elements.paymentMethod.value = 'Bar';
  renderCategoryBar();
  renderProducts();
  renderCart();
  renderStats();
  renderSalesHistory();
  renderInventory();
  renderAdminProducts();
}

function bindEvents() {
  elements.searchInput.addEventListener('input', renderProducts);
  elements.orderType.addEventListener('change', (event) => {
    state.orderType = event.target.value;
  });
  elements.paymentMethod.addEventListener('change', (event) => {
    state.paymentMethod = event.target.value;
  });
  elements.discountInput.addEventListener('input', (event) => {
    state.discount = Math.max(0, Number(event.target.value) || 0);
    renderCart();
  });
  elements.clearCartBtn.addEventListener('click', clearCart);
  elements.saveOrderBtn.addEventListener('click', saveOrder);
  elements.printBtn.addEventListener('click', printReceipt);
  elements.productForm.addEventListener('submit', addProduct);
  elements.resetDemoBtn.addEventListener('click', resetDemo);
}

function init() {
  bindEvents();
  elements.orderType.value = state.orderType;
  elements.paymentMethod.value = state.paymentMethod;
  renderCategoryBar();
  renderProducts();
  renderCart();
  renderStats();
  renderSalesHistory();
  renderInventory();
  renderAdminProducts();
}

init();

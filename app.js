/**
 * Professional QR Ordering SaaS - core logic
 * No gamification, structured state management.
 */

const state = {
    view: 'home',
    cart: [],
    activeCategory: 'burgers',
    dietary: {
        gluten: false,
        dairy: false,
        nuts: false,
        vegetarian: false,
        vegan: false,
        spicy: false
    },
    customizingItem: null,
    editingIndex: null,
    tempCustomization: null,
    cartOpen: false,
    paymentProcessing: false,
    paymentError: false,
    orderId: null,
    receiptEmail: '',
    receiptSent: false
};

const menu = {
    burgers: [
        { id: 101, name: "Classic Beef Burger", desc: "Aged beef patty, lettuce, tomato, pickles, and signature house sauce.", price: 12.50, kcal: 650, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80", allergenTags: ['gluten', 'dairy'], ingredients: { "Beef Patty": 1, "Cheese": 1, "Pickles": 1, "Lettuce": 1 } },
        { id: 102, name: "Truffle Mushroom Burger", desc: "Premium beef, sautéed forest mushrooms, swiss cheese, and truffle aioli.", price: 15.00, kcal: 720, img: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&q=80", allergenTags: ['gluten', 'dairy'], ingredients: { "Beef Patty": 1, "Swiss Cheese": 1, "Mushrooms": 1 } },
        { id: 103, name: "Vegan Garden Burger", desc: "Plant-based patty, avocado smash, vegan cheese, and beet relish on a charcoal bun.", price: 14.50, kcal: 580, img: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80", allergenTags: ['gluten', 'vegan', 'vegetarian'], ingredients: { "Plant Patty": 1, "Vegan Cheese": 1, "Avocado": 1 } }
    ],
    chicken: [
        { id: 201, name: "Crispy Peri-Peri Chicken", desc: "Double breaded chicken breast, spicy peri-peri mayo, and crunchy slaw.", price: 13.50, kcal: 680, img: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=80", allergenTags: ['gluten', 'spicy'], ingredients: { "Chicken Breast": 1, "Slaw": 1 } },
        { id: 202, name: "Buttermilk Tender Box", desc: "5 pieces of buttermilk soaked tenders served with honey mustard dip.", price: 11.00, kcal: 550, img: "https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80", allergenTags: ['gluten', 'dairy'], ingredients: { "Chicken Tenders": 5 } }
    ],
    sides: [
        { id: 301, name: "Parmesan Truffle Fries", desc: "Hand-cut fries, truffle oil, aged parmesan, and fresh rosemary.", price: 6.50, kcal: 420, img: "https://images.unsplash.com/photo-1573016608216-7243b7829871?w=400&q=80", allergenTags: ['dairy', 'vegetarian'], ingredients: {} },
        { id: 302, name: "Sweet Potato Wedges", desc: "Roasted sweet potato with paprika and lime zest.", price: 6.00, kcal: 310, img: "https://images.unsplash.com/photo-1522906450058-95842886a11e?w=400&q=80", allergenTags: ['vegan', 'vegetarian'], ingredients: {} }
    ],
    drinks: [
        { id: 401, name: "Artisan Lemonade", desc: "Fresh lemons, mint leaves, and a touch of organic agave.", price: 4.50, kcal: 120, img: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400&q=80", allergenTags: ['vegan', 'vegetarian'], ingredients: {} },
        { id: 402, name: "Cold Brew Coffee", desc: "12-hour slow-steeped single origin beans.", price: 5.00, kcal: 5, img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&q=80", allergenTags: ['vegan', 'vegetarian'], ingredients: {} }
    ]
};

// Apply config theme
function initTheme() {
    const r = document.querySelector(':root');
    r.style.setProperty('--primary', restaurantConfig.theme.primary);
    r.style.setProperty('--accent', restaurantConfig.theme.accent);
    r.style.setProperty('--bg-grey', restaurantConfig.theme.bgGrey);
    r.style.setProperty('--text-dark', restaurantConfig.theme.textDark);
}

const cur = () => restaurantConfig.currency;
const table = () => restaurantConfig.tableNumber;

// View management
function render() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <header class="header">
            <div class="container" style="display:flex; justify-content:space-between; align-items:center;">
                <a href="#" class="brand" onclick="setView('home')">${restaurantConfig.logoText}</a>
                <button class="btn" onclick="toggleCart(true)" style="width:auto; border:none; background:none; position:relative;">
                    <ion-icon name="bag-outline" style="font-size: 24px; color: var(--text-dark);"></ion-icon>
                    ${state.cart.length > 0 ? `<div style="position:absolute; top:-4px; right:-4px; background:var(--accent); color:white; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">${state.cart.reduce((a,b) => a + b.qty, 0)}</div>` : ''}
                </button>
            </div>
        </header>

        <main id="view-container">
            ${state.view === 'home' ? renderHome() : ''}
            ${state.view === 'checkout' ? renderCheckout() : ''}
            ${state.view === 'payment' ? renderPayment() : ''}
        </main>

        ${renderCartSidebar()}
        ${renderCustomModal()}
        ${renderWarningModal()}
        ${renderProcessing()}
        ${renderSuccess()}
    `;
}

function setView(v) {
    state.view = v;
    window.scrollTo(0, 0);
    render();
}

function toggleCart(v) {
    state.cartOpen = v;
    render();
}

/** HOME VIEW */
function renderHome() {
    const categories = Object.keys(menu);
    const categoryLabels = { burgers: "Burgers", chicken: "Chicken", sides: "Sides", drinks: "Drinks" };

    return `
        <div class="categories" id="cat-nav">
            ${categories.map(cat => `
                <div class="cat-chip ${state.activeCategory === cat ? 'active' : ''}" onclick="setCategory('${cat}')">
                    ${categoryLabels[cat]}
                </div>
            `).join('')}
        </div>

        <div class="container" style="padding-top: 16px;">
            <div class="dietary-panel">
                <div style="font-weight: 600; font-size: 13px;">Dietary & Allergy Filters</div>
                <div class="dietary-grid">
                    ${Object.keys(state.dietary).map(type => `
                        <label class="diet-check">
                            <input type="checkbox" ${state.dietary[type] ? 'checked' : ''} onchange="toggleDiet('${type}')">
                            <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        </label>
                    `).join('')}
                </div>
                <p style="font-size: 11px; color: var(--text-grey); margin-top: 12px; font-weight: 500;">
                    Please inform staff of severe allergies. digital filters do not replace clinical advice.
                </p>
            </div>

            <div class="menu-section">
                <h3 class="section-title">${categoryLabels[state.activeCategory]}</h3>
                <div class="menu-grid">
                    ${menu[state.activeCategory].map(item => `
                        <div class="menu-card" onclick="handleItemClick(${item.id})">
                            <img src="${item.img}" class="card-img" alt="${item.name}">
                            <div class="card-body">
                                <div class="item-name">${item.name}</div>
                                <div class="item-desc">${item.desc}</div>
                                <div class="item-meta">
                                    <div style="display:flex; flex-direction:column;">
                                        <span class="item-price">${cur()}${item.price.toFixed(2)}</span>
                                        <span style="font-size: 10px; color: var(--text-grey); font-weight: 500;">${item.kcal} kcal</span>
                                    </div>
                                    <div class="add-btn"><ion-icon name="add"></ion-icon></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function setCategory(cat) {
    state.activeCategory = cat;
    render();
}

function toggleDiet(type) {
    state.dietary[type] = !state.dietary[type];
    render();
}

function handleItemClick(id) {
    const item = menu[state.activeCategory].find(i => i.id === id);
    if (!item) return;

    // Check for dietary warnings
    const conflicts = item.allergenTags.filter(tag => state.dietary[tag]);
    if (restaurantConfig.features.enableAllergyWarnings && conflicts.length > 0) {
        state.warningItem = item;
        render();
        return;
    }

    if (['burgers', 'chicken'].includes(state.activeCategory) && restaurantConfig.features.enableMealUpgrade) {
        openCustomize(item);
    } else {
        addItemToCart({ ...item, qty: 1 });
    }
}

/** CART LOGIC */
function addItemToCart(item) {
    const existingIndex = state.cart.findIndex(i => {
        return i.id === item.id && 
               i.size === item.size && 
               i.selectedDrink === item.selectedDrink && 
               JSON.stringify(i.ingredients || {}) === JSON.stringify(item.ingredients || {});
    });

    if (existingIndex > -1) {
        state.cart[existingIndex].qty += 1;
    } else {
        state.cart.push(item);
    }
    render();
}

function updateQty(index, delta) {
    state.cart[index].qty += delta;
    if (state.cart[index].qty <= 0) state.cart.splice(index, 1);
    render();
}

function renderCartSidebar() {
    const subtotal = state.cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const tax = subtotal * 0.13;
    const total = subtotal + tax;

    return `
        <div class="sidebar ${state.cartOpen ? 'open' : ''}">
            <div class="modal-header">
                <span style="font-weight: 700;">Order Tray</span>
                <button class="btn" onclick="toggleCart(false)" style="width: auto; border:none; padding:4px;"><ion-icon name="close" style="font-size: 20px;"></ion-icon></button>
            </div>
            <div style="flex:1; overflow-y:auto; padding:20px;">
                ${state.cart.length === 0 ? '<p style="text-align:center; color:var(--text-grey); padding-top:40px;">Your tray is empty.</p>' : ''}
                ${state.cart.map((item, i) => `
                    <div style="display:flex; gap:12px; margin-bottom:16px; align-items:start;">
                        <img src="${item.img}" style="width:48px; height:48px; border-radius:4px; object-fit:cover;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:13px;">${item.name}</div>
                            <div style="font-size:11px; color:var(--text-grey);">${item.size ? `${item.size} Meal • ${item.selectedDrink}` : 'Single Item'}</div>
                            <div style="display:flex; align-items:center; gap:12px; margin-top:8px;">
                                <div style="display:flex; align-items:center; gap:8px; background:var(--bg-grey); padding:4px 8px; border-radius:4px;">
                                    <button onclick="updateQty(${i}, -1)" style="border:none; background:none; cursor:pointer;"><ion-icon name="remove" style="font-size:14px;"></ion-icon></button>
                                    <span style="font-weight:700; font-size:12px;">${item.qty}</span>
                                    <button onclick="updateQty(${i}, 1)" style="border:none; background:none; cursor:pointer;"><ion-icon name="add" style="font-size:14px;"></ion-icon></button>
                                </div>
                                <span style="font-weight:600; font-size:13px; margin-left:auto;">${cur()}${(item.price * item.qty).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${state.cart.length > 0 ? `
                <div class="modal-footer">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px; color:var(--text-grey);">
                        <span>Subtotal</span>
                        <span>${cur()}${subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:13px; color:var(--text-grey);">
                        <span>Tax (13%)</span>
                        <span>${cur()}${tax.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:20px; font-weight:700; font-size:16px;">
                        <span>Final Total</span>
                        <span>${cur()}${total.toFixed(2)}</span>
                    </div>
                    <button class="btn btn-primary" onclick="state.cartOpen=false; setView('checkout')">Review & Pay</button>
                </div>
            ` : ''}
        </div>
    `;
}

/** CUSTOMIZATION */
function openCustomize(item) {
    state.customizingItem = item;
    state.tempCustomization = {
        qty: 1,
        isMeal: true,
        size: 'Medium',
        selectedDrink: 'Coca-Cola',
        ingredients: { ...item.ingredients }
    };
    render();
}

function renderCustomModal() {
    if (!state.customizingItem) return '';
    const item = state.customizingItem;
    const basePrice = item.price;
    const mealPrice = state.tempCustomization.isMeal ? (state.tempCustomization.size === 'Large' ? 4.50 : 4.00) : 0;
    const finalPrice = basePrice + mealPrice;

    return `
        <div class="modal-overlay open">
            <div class="modal-content">
                <div class="modal-header">
                    <span style="font-weight:700;">Customize Item</span>
                    <button class="btn" onclick="state.customizingItem=null; render();" style="width: auto; border:none; padding:4px;"><ion-icon name="close" style="font-size: 20px;"></ion-icon></button>
                </div>
                <div class="modal-body">
                    <div style="display:flex; gap:16px; margin-bottom:20px;">
                        <img src="${item.img}" style="width:80px; height:80px; border-radius:8px; object-fit:cover;">
                        <div>
                            <div style="font-weight:700; font-size:16px;">${item.name}</div>
                            <div style="font-size:13px; color:var(--text-grey); margin-top:2px;">${item.kcal} kcal baseline</div>
                        </div>
                    </div>

                    <div style="margin-bottom:24px;">
                        <div style="font-weight:600; font-size:13px; margin-bottom:12px; color:var(--text-grey); text-transform:uppercase; letter-spacing:0.05em;">Make it a Meal?</div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                            <button class="btn ${!state.tempCustomization.isMeal ? 'btn-primary' : 'btn-outline'}" onclick="updateTemp('isMeal', false)">Single Item</button>
                            <button class="btn ${state.tempCustomization.isMeal ? 'btn-primary' : 'btn-outline'}" onclick="updateTemp('isMeal', true)">Meal Upgrade</button>
                        </div>
                    </div>

                    ${state.tempCustomization.isMeal ? `
                        <div style="margin-bottom:24px;">
                            <div style="font-weight:600; font-size:13px; margin-bottom:12px; color:var(--text-grey); text-transform:uppercase; letter-spacing:0.05em;">Select Size</div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                                <button class="btn ${state.tempCustomization.size === 'Medium' ? 'btn-primary' : 'btn-outline'}" onclick="updateTemp('size', 'Medium')">Medium (+${cur()}4.00)</button>
                                <button class="btn ${state.tempCustomization.size === 'Large' ? 'btn-primary' : 'btn-outline'}" onclick="updateTemp('size', 'Large')">Large (+${cur()}4.50)</button>
                            </div>
                        </div>
                        <div style="margin-bottom:24px;">
                            <div style="font-weight:600; font-size:13px; margin-bottom:12px; color:var(--text-grey); text-transform:uppercase; letter-spacing:0.05em;">Select Drink</div>
                            <select class="notes-area" onchange="updateTemp('selectedDrink', this.value)" style="margin-top:0; height:44px;">
                                <option ${state.tempCustomization.selectedDrink === 'Coca-Cola' ? 'selected' : ''}>Coca-Cola</option>
                                <option ${state.tempCustomization.selectedDrink === 'Sprite' ? 'selected' : ''}>Sprite</option>
                                <option ${state.tempCustomization.selectedDrink === 'Mineral Water' ? 'selected' : ''}>Mineral Water</option>
                                <option ${state.tempCustomization.selectedDrink === 'Iced Tea' ? 'selected' : ''}>Iced Tea</option>
                            </select>
                        </div>
                    ` : ''}

                    <div style="margin-bottom:8px;">
                        <div style="font-weight:600; font-size:13px; margin-bottom:12px; color:var(--text-grey); text-transform:uppercase; letter-spacing:0.05em;">Modify Ingredients</div>
                        ${Object.keys(item.ingredients).map(ing => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
                                <span style="font-weight:500;">${ing}</span>
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <button onclick="updateIng('${ing}', -1)" style="border:none; background:var(--bg-grey); width:28px; height:28px; border-radius:4px; cursor:pointer;"><ion-icon name="remove"></ion-icon></button>
                                    <span style="font-weight:700; font-size:13px; min-width:14px; text-align:center;">${state.tempCustomization.ingredients[ing]}</span>
                                    <button onclick="updateIng('${ing}', 1)" style="border:none; background:var(--bg-grey); width:28px; height:28px; border-radius:4px; cursor:pointer;"><ion-icon name="add"></ion-icon></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="confirmAdd()">Add to Tray • ${cur()}${finalPrice.toFixed(2)}</button>
                </div>
            </div>
        </div>
    `;
}

function updateTemp(key, val) {
    state.tempCustomization[key] = val;
    render();
}

function updateIng(ing, delta) {
    const newVal = Math.max(0, Math.min(3, state.tempCustomization.ingredients[ing] + delta));
    state.tempCustomization.ingredients[ing] = newVal;
    render();
}

function confirmAdd() {
    const finalItem = {
        ...state.customizingItem,
        ...state.tempCustomization,
        price: state.customizingItem.price + (state.tempCustomization.isMeal ? (state.tempCustomization.size === 'Large' ? 4.50 : 4.00) : 0)
    };
    addItemToCart(finalItem);
    state.customizingItem = null;
    render();
}

/** DIETARY WARNING */
function renderWarningModal() {
    if (!state.warningItem) return '';
    const item = state.warningItem;
    const conflicts = item.allergenTags.filter(t => state.dietary[t]);

    return `
        <div class="modal-overlay open" style="align-items: center; background: rgba(0,0,0,0.6);">
            <div class="modal-content" style="max-width: 340px; text-align:center; padding: 32px;">
                <ion-icon name="alert-circle" style="font-size: 48px; color: var(--accent); margin-bottom: 16px;"></ion-icon>
                <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Dietary Notice</h2>
                <p style="font-size: 13px; color: var(--text-grey); line-height: 1.5; margin-bottom: 24px;">
                    This item contains <span style="font-weight:700; color:var(--text-dark);">${conflicts.join(', ')}</span> which you have filtered.
                </p>
                <div style="display:grid; gap:12px;">
                    <button class="btn btn-primary" onclick="proceedWarning()">Add Anyway</button>
                    <button class="btn btn-outline" onclick="state.warningItem=null; render();">Cancel</button>
                </div>
            </div>
        </div>
    `;
}

function proceedWarning() {
    const item = state.warningItem;
    state.warningItem = null;
    if (['burgers', 'chicken'].includes(item.category) && restaurantConfig.features.enableMealUpgrade) {
        openCustomize(item);
    } else {
        addItemToCart({ ...item, qty: 1 });
    }
}

/** CHECKOUT VIEW */
function renderCheckout() {
    const total = state.cart.reduce((a, b) => a + (b.price * b.qty), 0);
    return `
        <div class="container" style="padding: 24px 0 100px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
                <button onclick="setView('home')" style="background:var(--bg-white); border:1px solid var(--border); width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;"><ion-icon name="chevron-back"></ion-icon></button>
                <h2 style="font-size: 20px; font-weight: 700;">Order Summary</h2>
            </div>

            <div style="background:white; border:1px solid var(--border); border-radius:var(--radius); padding:20px; margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:16px; font-size:12px; font-weight:700; color:var(--text-grey); text-transform:uppercase; letter-spacing:0.05em;">
                    <span>Table ${table()}</span>
                    <span>${state.cart.length} Items</span>
                </div>
                ${state.cart.map(item => `
                    <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
                        <div>
                            <span style="font-weight:600;">${item.qty}x ${item.name}</span>
                            <div style="font-size:12px; color:var(--text-grey); font-weight:400;">${item.isMeal ? `${item.size} Meal` : 'Single Item'}</div>
                        </div>
                        <span style="font-weight:600;">${cur()}${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>

            ${restaurantConfig.features.enableKitchenNotes ? `
                <div style="background:white; border:1px solid var(--border); border-radius:var(--radius); padding:20px; margin-bottom:24px;">
                    <div style="font-weight:600; font-size:13px; margin-bottom:8px;">Kitchen Instructions</div>
                    <textarea class="notes-area" rows="3" placeholder="Allergies, packaging requests, etc."></textarea>
                </div>
            ` : ''}

            <button class="btn btn-primary" style="height:56px; font-size:16px;" onclick="setView('payment')">Continue to Payment • ${cur()}${total.toFixed(2)}</button>
        </div>
    `;
}

/** PAYMENT VIEW */
function renderPayment() {
    const subtotal = state.cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const tax = subtotal * 0.13;
    const total = subtotal + tax;

    return `
        <div class="container" style="padding: 24px 0 100px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
                <button onclick="setView('checkout')" style="background:var(--bg-white); border:1px solid var(--border); width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;"><ion-icon name="chevron-back"></ion-icon></button>
                <h2 style="font-size: 20px; font-weight: 700;">Secure Checkout</h2>
            </div>

            <div style="background:white; border:1px solid var(--border); border-radius:var(--radius); padding:20px; margin-bottom:24px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:var(--text-grey);">
                    <span>Subtotal</span>
                    <span>${cur()}${subtotal.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; color:var(--text-grey);">
                    <span>Tax (13%)</span>
                    <span>${cur()}${tax.toFixed(2)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top:12px; font-weight:700; font-size:18px;">
                    <span>Total</span>
                    <span>${cur()}${total.toFixed(2)}</span>
                </div>
            </div>

            <div style="font-weight:600; font-size:13px; margin-bottom:12px; text-transform:uppercase; color:var(--text-grey); letter-spacing:0.05em;">Payment Method</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:24px;">
                ${['card', 'apple', 'google', 'counter'].map(m => `
                    <button class="btn btn-outline" style="flex-direction:column; padding:16px; gap:4px;" onclick="handlePayAction()">
                        <ion-icon name="${m === 'card' ? 'card-outline' : m === 'apple' ? 'logo-apple' : m === 'google' ? 'logo-google' : 'person-outline'}" style="font-size:20px;"></ion-icon>
                        <span style="font-size:11px; font-weight:600;">${m === 'card' ? 'Credit Card' : m === 'apple' ? 'Apple Pay' : m === 'google' ? 'Google Pay' : 'Pay at Counter'}</span>
                    </button>
                `).join('')}
            </div>

            <div style="background:white; border:1px solid var(--border); border-radius:var(--radius); padding:20px; margin-bottom:24px;">
                <div style="margin-bottom:16px;">
                    <label style="font-size:11px; font-weight:700; color:var(--text-grey); text-transform:uppercase;">Card Number</label>
                    <input type="text" class="notes-area" placeholder="0000 0000 0000 0000" style="margin-top:4px;">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div>
                        <label style="font-size:11px; font-weight:700; color:var(--text-grey); text-transform:uppercase;">Exp Date</label>
                        <input type="text" class="notes-area" placeholder="MM/YY" style="margin-top:4px;">
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:700; color:var(--text-grey); text-transform:uppercase;">CVV</label>
                        <input type="password" class="notes-area" placeholder="•••" style="margin-top:4px;">
                    </div>
                </div>
            </div>

            <button class="btn btn-primary" style="height:56px; font-size:16px;" onclick="handlePayAction()">Complete Transaction • ${cur()}${total.toFixed(2)}</button>
            <p style="text-align:center; font-size:11px; color:var(--text-grey); margin-top:16px; font-weight:500;">
                <ion-icon name="lock-closed-outline" style="vertical-align:middle;"></ion-icon> PCI-DSS Compliant Secure Gateway
            </p>
        </div>
    `;
}

function handlePayAction() {
    state.paymentProcessing = true;
    render();
    
    setTimeout(() => {
        state.paymentProcessing = false;
        if (Math.random() < 0.1) {
            alert("Transaction declined. Please try another payment method.");
            render();
        } else {
            state.orderId = Math.floor(1000 + Math.random() * 9000);
            render();
        }
    }, 1500);
}

/** SYSTEM RENDERERS */
function renderProcessing() {
    if (!state.paymentProcessing) return '';
    return `
        <div class="processing-overlay">
            <div class="spinner"></div>
            <div style="font-weight:600; color:var(--text-dark);">Processing Transaction...</div>
            <div style="font-size:12px; color:var(--text-grey); margin-top:4px;">Communicating with secure bank gateway</div>
        </div>
    `;
}

function renderSuccess() {
    if (!state.orderId) return '';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
        <div class="success-screen">
            <div style="background:var(--bg-grey); width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:24px; border:1px solid var(--border);">
                <ion-icon name="checkmark-outline" style="font-size:32px; color:var(--text-dark);"></ion-icon>
            </div>
            <h1 style="font-size:24px; font-weight:700; margin-bottom:8px;">Transaction Success</h1>
            <p style="color:var(--text-grey); font-size:14px;">Your order has been confirmed and sent to the kitchen.</p>
            
            <div class="summary-card">
                <div class="summary-row"><span>Order Reference</span><span style="font-weight:700;">#${state.orderId}</span></div>
                <div class="summary-row"><span>Table Assignment</span><span style="font-weight:700;">#${table()}</span></div>
                <div class="summary-row"><span>Local Time</span><span style="font-weight:700;">${now}</span></div>
                <div class="summary-row" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border);"><span style="font-weight:700; color:var(--text-dark);">Estimated Ready</span><span style="font-weight:700; color:var(--accent);">~15 mins</span></div>
            </div>

            ${!state.receiptSent ? `
                <div style="width:100%; max-width:320px; margin-bottom:32px;">
                    <div style="font-size:12px; font-weight:600; color:var(--text-grey); margin-bottom:8px; text-align:left;">Digital Receipt</div>
                    <div style="display:flex; gap:8px;">
                        <input type="email" class="notes-area" id="receiptEmailInput" placeholder="Enter your email" style="margin-top:0; flex:1; height:44px;">
                        <button class="btn btn-primary" style="width:auto; height:44px; padding:0 20px;" onclick="sendReceipt()">Send</button>
                    </div>
                </div>
            ` : `
                <div style="background:var(--bg-soft); border:1px solid var(--border); border-radius:8px; padding:12px; width:100%; max-width:320px; margin-bottom:32px;">
                    <p style="font-size:13px; font-weight:600; color:var(--text-dark);">Receipt sent to ${state.receiptEmail}</p>
                </div>
            `}

            <button class="btn btn-outline" style="max-width:240px;" onclick="window.location.reload()">Start New Order</button>
        </div>
    `;
}

function sendReceiptEmail() {
    const subtotal = state.cart.reduce((a, b) => a + (b.price * b.qty), 0);

    emailjs.send("service_cruiyxj", "template_1tel8x5", {
        restaurant_name: restaurantConfig.name,
        order_id: state.orderId,
        table_number: restaurantConfig.tableNumber,
        timestamp: new Date().toLocaleString(),
        email: state.receiptEmail,
        total: subtotal.toFixed(2),
        orders: state.cart.map(item => ({
            name: item.name,
            units: item.qty,
            price: (item.price * item.qty).toFixed(2)
        }))
    });
}

function sendReceipt() {
    const email = document.getElementById('receiptEmailInput').value;
    if (!email || !email.includes('@')) return alert("Please enter a valid email address.");
    state.receiptEmail = email;
    sendReceiptEmail();
    state.receiptSent = true;
    render();
}

// Global initialization
window.onload = () => {
    initTheme();
    render();
};

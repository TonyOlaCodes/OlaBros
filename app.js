/**
 * OlaBro - Smart QR Ordering System
 * Rebuilt for functionality, scalability, and merchant-facing polish.
 */

const USER_KEY = 'OLA_BRO_GLOBAL_USER';

const loadUser = () => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : {
        name: 'Alex Johnson',
        allergies: [], // Now stores keys like 'gluten', 'dairy', etc.
        preferences: [],
        orderHistory: [],
        theme: 'light'
    };
};

const saveUser = (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const state = {
    view: 'home',
    activeCategory: 'burgers',
    safeMode: false,
    showMagicPick: false,
    magicBudget: 10,
    magicVibe: 'balanced',
    magicResult: null,
    cart: [
        { 
            id: 1, name: 'Big Mac', price: 8.95, qty: 1, 
            img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400&h=300', 
            basePrice: 4.95, isMeal: true, size: 'Medium', selectedDrink: 'Coca-Cola', 
            ingredients: { 'Beef Patty': 2, 'Big Mac Sauce': 1, 'Lettuce': 1, 'Cheese': 1, 'Pickles': 1, 'Onions': 1 },
            allergenTags: ['gluten', 'dairy']
        },
        { 
            id: 11, name: 'French Fries', price: 2.80, qty: 1, 
            img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400&h=300', 
            basePrice: 2.80, ingredients: { 'Salt': 1 }, allergenTags: ['vegetarian', 'vegan'] 
        },
        { 
            id: 50, name: 'BBQ Dip', price: 0.50, qty: 1, 
            img: 'https://images.unsplash.com/photo-1594911772125-07619a973273?auto=format&fit=crop&q=80&w=200&h=150', 
            basePrice: 0.50 
        }
    ],
    user: loadUser(),
    customizingItem: null,
    editingIndex: null,
    orderNotes: '',
    showIngredients: false,
    modalScrollPos: 0,
    lastView: null, // Track view changes to prevent re-animation
    tempCustomization: { 
        size: 'Medium', 
        isMeal: false, 
        selectedDrink: 'Coca-Cola',
        selectedSauces: [],
        ingredients: {}
    },
    menu: {},
    config: null,
    paymentMethod: 'card',
    paymentProcessing: false,
    paymentError: false,
    currentOrderId: null
};

const cur = () => state.config?.settings.currency || '€';
const table = () => state.config?.settings.tableNumber || '07';

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        state.config = await response.json();
        
        // Apply theme variables dynamically
        const root = document.documentElement;
        if (state.config.theme) {
            Object.entries(state.config.theme).forEach(([key, value]) => {
                const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                root.style.setProperty(cssVar, value);
            });
        }
        
        if (state.config.restaurantName) {
            document.title = `${state.config.restaurantName} | Smart Order`;
        }
        
        render();
    } catch (err) {
        console.error("Failed to load config:", err);
    }
}

async function loadMenu() {
    try {
        const response = await fetch('menu.json');
        state.menu = await response.json();
        render();
    } catch (err) {
        console.error("Failed to load menu:", err);
    }
}

loadConfig();
loadMenu();

const app = document.getElementById('app');

function render() {
    const scrollContainer = document.getElementById('modalScrollable');
    const scrollVal = scrollContainer ? scrollContainer.scrollTop : state.modalScrollPos;
    
    // Check if modal or view was already open to prevent re-animation flicker
    const wasModalOpen = !!document.getElementById('customModal')?.classList.contains('open');
    const viewChanged = state.lastView !== state.view;
    state.lastView = state.view;

    app.innerHTML = `
        <header class="header container">
            <a href="#" class="brand" onclick="setView('home')" style="font-size: 24px; font-weight: 900; color: var(--primary);">
                ${state.config ? state.config.branding.logoHtml : 'Loading...'}
            </a>
            <div style="display: flex; gap: 8px; align-items: center; position: relative;">
                ${state.config?.settings.enableMagicPick ? `
                    <button class="btn" onclick="toggleMagicPick(true)" style="background: linear-gradient(135deg, #ffc107, #ff9800); color: white; border-radius: 20px; font-size: 11px; font-weight: 800; padding: 6px 14px; border: none; box-shadow: 0 4px 10px rgba(255,152,0,0.3); display: flex; align-items: center; gap: 4px;">
                        <ion-icon name="sparkles" style="font-size: 14px;"></ion-icon>
                        Feeling Peckish?
                    </button>
                ` : ''}
                <button class="btn" id="cartBtn" onclick="toggleCart(true)" style="background: var(--bg-grey); border-radius: 50%; width: 42px; height: 42px; padding: 0; display: flex; align-items: center; justify-content: center; position: relative;">
                    <ion-icon name="bag-handle" style="font-size: 22px; color: var(--text-dark);"></ion-icon>
                    ${state.cart.length > 0 ? `<div style="position: absolute; top: 0; right: 0; background: var(--primary); color: white; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; border: 2px solid white;">${state.cart.reduce((a, b) => a + b.qty, 0)}</div>` : ''}
                </button>
                <div id="nudgeContainer"></div>
            </div>
        </header>

        <main id="main-view">
            ${state.view === 'home' ? renderHome(viewChanged) : ''}
            ${state.view === 'checkout' ? renderCheckout(viewChanged) : ''}
            ${state.view === 'payment' ? renderPayment(viewChanged) : ''}
            ${state.view === 'account' ? renderAccount() : ''}
        </main>

        <button class="btn" onclick="callWaiter()" style="position: fixed; bottom: 32px; left: 20px; background: var(--accent); color: var(--text-dark); border-radius: 50%; width: 50px; height: 50px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); z-index: 100; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent;">
            <ion-icon name="hand-right" style="font-size: 22px;"></ion-icon>
        </button>

        ${renderCustomModal(wasModalOpen)}
        ${renderWarningModal()}
        ${renderPaymentModal()}
        ${renderMagicPickModal()}
        ${renderCartSidebar()}
        <div id="success-container"></div>
        <div id="toast-container"></div>
    `;

    const newContainer = document.getElementById('modalScrollable');
    if (newContainer) {
        requestAnimationFrame(() => {
            newContainer.scrollTop = scrollVal;
        });
    }
}

function renderHome(animate = false) {
    const categories = Object.keys(state.menu);
    if (categories.length === 0) return `<div class="container" style="text-align:center; padding:100px 20px;">
        <div class="loader" style="width:40px; height:40px; border:4px solid #eee; border-top-color:var(--primary); border-radius:50%; animation: spin 1s linear infinite; margin:0 auto 20px;"></div>
        <p style="font-weight:700; color:var(--text-grey);">Initialising Menu...</p>
    </div>`;

    const categoryLabels = {
        burgers: '🍔 Burgers',
        chicken: '🍗 Chicken',
        sides: '🍟 Sides',
        drinks: '🥤 Drinks',
        sauces: '🥣 Sauces'
    };

    return `
        <div class="container ${animate ? 'animate-up' : ''}">
            <div class="dietary-panel">
                <div style="font-weight: 800; font-size: 13px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <ion-icon name="filter-outline"></ion-icon> Dietary & Allergy Preferences
                </div>
                <div class="dietary-grid">
                    ${['gluten', 'dairy', 'nuts', 'vegetarian', 'vegan', 'spicy'].map(type => `
                        <label class="dietary-check ${state.user.allergies.includes(type) ? 'active' : ''}">
                            <input type="checkbox" onchange="toggleDietary('${type}')" ${state.user.allergies.includes(type) ? 'checked' : ''}>
                            <span>${getDietaryLabel(type)}</span>
                        </label>
                    `).join('')}
                </div>
                
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <ion-icon name="shield-checkmark" style="color: #2e7d32; font-size: 18px;"></ion-icon>
                        <div>
                            <div style="font-weight: 800; font-size: 12px;">Safe Mode</div>
                            <div style="font-size: 10px; color: var(--text-grey); font-weight: 600;">Hide all items with my allergens</div>
                        </div>
                    </div>
                    <label class="switch">
                        <input type="checkbox" onchange="toggleSafeMode(this.checked)" ${state.safeMode ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>

                <div style="font-size: 10px; opacity: 0.5; margin-top: 12px; font-weight: 600;">
                    Please inform staff of severe allergies. Digital filtering does not guarantee allergen-free preparation.
                </div>
            </div>

            <div class="categories" id="sticky-cats">
                ${categories.map(cat => `
                    <div class="cat-chip ${state.activeCategory === cat ? 'active' : ''}" 
                         id="chip-${cat}"
                         onclick="setCategory('${cat}')">
                        ${categoryLabels[cat]}
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 10px; padding-bottom: 60px;">
                ${categories.map(cat => {
                    const filteredItems = state.menu[cat].filter(item => {
                        if (!state.safeMode) return true;
                        return !(item.allergenTags || []).some(t => state.user.allergies.includes(t));
                    });

                    if (filteredItems.length === 0) return '';

                    return `
                    <div id="section-${cat}" class="menu-section">
                        <h3 style="font-size: 20px; font-weight: 900; margin-bottom: 16px; padding: 0 4px;">${categoryLabels[cat]}</h3>
                        <div class="menu-grid">
                            ${filteredItems.map(item => {
                                const hasConflict = (item.allergenTags || []).some(t => state.user.allergies.includes(t));
                                return `
                                <div class="menu-card ${hasConflict ? 'conflict' : ''}" id="item-${item.id}" onclick="handleItemClick(${item.id})">
                                    ${hasConflict ? `
                                        <div class="allergen-badge">
                                            <ion-icon name="warning" style="font-size: 11px;"></ion-icon>
                                            Safety Warning
                                        </div>
                                    ` : ''}
                                    <div style="position: relative;">
                                        <img src="${item.img}" class="card-img" alt="${item.name}">
                                        ${hasConflict ? `
                                            <div style="position: absolute; top: 4px; left: 4px; background: rgba(255,255,255,0.95); border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--primary); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                <ion-icon name="alert" style="color: var(--primary); font-size: 13px;"></ion-icon>
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="card-body">
                                        <div class="item-name">${item.name}</div>
                                        <div class="item-desc">${item.desc}</div>
                                        <div class="dietary-icons" style="margin-bottom: 8px; display: flex; gap: 6px;">
                                            ${(item.allergenTags || []).map(tag => `<span title="${getDietaryLabel(tag)}" style="font-size: 14px; opacity: 1;">${getDietaryIcon(tag)}</span>`).join('')}
                                        </div>
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <span class="item-price">${cur()}${item.price.toFixed(2)}</span>
                                            <div style="background: var(--bg-grey); padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; color: var(--text-grey);">${item.kcal} Cal</div>
                                        </div>
                                    </div>
                                    <div class="add-btn-circle">
                                        <ion-icon name="add"></ion-icon>
                                    </div>
                                </div>
                            `;}).join('')}
                        </div>
                    </div>
                `;}).join('')}
            </div>
        </div>
    `;
}

function renderCustomModal(noAnimate = false) {
    if (!state.customizingItem) return `<div class="modal-overlay" id="customModal"></div>`;
    const item = state.customizingItem;
    const cat = getCategoryForItem(item.id);
    
    let extraCost = 0;
    if (item.ingredients) {
        Object.keys(state.tempCustomization.ingredients).forEach(ing => {
            const base = item.ingredients[ing] || 0;
            const delta = state.tempCustomization.ingredients[ing] - base;
            if (delta > 0) {
                const isFree = ['Pickles', 'Onions', 'Lettuce', 'Sauce', 'Ketchup', 'Mustard'].some(f => ing.includes(f));
                if (!isFree) {
                    if (ing.includes('Patty')) extraCost += delta * 2.0;
                    else if (ing.includes('Cheese')) extraCost += delta * 0.6;
                    else extraCost += delta * 0.4;
                }
            }
        });
    }

    const mealAdd = state.tempCustomization.isMeal ? (state.tempCustomization.size === 'Large' ? 4.7 : 4.0) : 0;
    const total = (state.editingIndex !== null ? state.cart[state.editingIndex].basePrice : item.price) + mealAdd + extraCost;

    const sauceCount = (item.name.includes('9 piece') || item.name.includes('5pc')) ? 2 : 1;
    const sauceOptions = ['No Sauce', 'BBQ Dip', 'Sweet Curry Dip', 'Sour Cream Dip', 'Tomato Ketchup Dip'];

    return `
        <div class="modal-overlay open" onclick="closeModal()" id="customModal">
            <div class="modal-content" onclick="event.stopPropagation()" style="${noAnimate ? 'animation: none;' : ''}">
                <div style="padding: 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="font-size: 22px; font-weight: 900;">${item.name}</h2>
                        <div style="font-size: 12px; color: var(--text-grey); font-weight: 700; display: flex; gap: 4px; margin-top: 4px;">
                             ${(item.allergenTags || []).map(tag => `<span>${getDietaryIcon(tag)} ${getDietaryLabel(tag)}</span>`).join(' • ')}
                        </div>
                    </div>
                    <button id="closeModalBtn" onclick="closeModal()" style="font-size: 32px; background: none; border: none; color: #ddd; cursor: pointer; display: flex; align-items: center;"><ion-icon name="close-circle"></ion-icon></button>
                </div>

                <div id="modalScrollable" onscroll="state.modalScrollPos = this.scrollTop">
                    <img src="${item.img}" style="width: 100%; height: 200px; object-fit: contain; margin-bottom: 24px;">
                    
                    ${(cat === 'burgers' || cat === 'chicken') ? `
                        <div style="margin-bottom: 24px;">
                            <div style="font-weight: 900; font-size: 16px; margin-bottom: 12px;">Build a Meal?</div>
                            <div class="options-grid">
                                <div class="option-btn ${!state.tempCustomization.isMeal ? 'active' : ''}" onclick="toggleMeal(false)">Item Only</div>
                                <div class="option-btn ${state.tempCustomization.isMeal ? 'active' : ''}" onclick="toggleMeal(true)">Make it a Meal</div>
                            </div>
                        </div>
                    ` : ''}

                    ${state.tempCustomization.isMeal ? `
                        <div style="padding: 16px; background: var(--bg-grey); border-radius: 20px; margin-bottom: 24px;">
                            <div style="font-weight: 900; font-size: 14px; margin-bottom: 10px;">Select Size</div>
                            <div class="options-grid">
                                <div class="option-btn ${state.tempCustomization.size === 'Medium' ? 'active' : ''}" onclick="selectSize('Medium')">Medium (+${cur()}4.00)</div>
                                <div class="option-btn ${state.tempCustomization.size === 'Large' ? 'active' : ''}" onclick="selectSize('Large')">Large (+${cur()}4.70)</div>
                            </div>
                            <div style="font-weight: 900; font-size: 14px; margin: 16px 0 10px;">Select Drink</div>
                            <select class="notes-area" onchange="updateDrink(this.value)">
                                <option value="Coca-Cola" ${state.tempCustomization.selectedDrink === 'Coca-Cola' ? 'selected' : ''}>Coca-Cola</option>
                                <option value="Coca-Cola Zero" ${state.tempCustomization.selectedDrink === 'Coca-Cola Zero' ? 'selected' : ''}>Coca-Cola Zero</option>
                                <option value="Still Water" ${state.tempCustomization.selectedDrink === 'Still Water' ? 'selected' : ''}>Still Water</option>
                            </select>
                        </div>
                    ` : ''}

                    ${cat === 'chicken' ? `
                        <div style="margin-bottom: 24px;">
                            <div style="font-weight: 900; font-size: 16px; margin-bottom: 12px;">Select Dips (${sauceCount})</div>
                            ${Array.from({ length: sauceCount }).map((_, i) => `
                                <select class="notes-area" onchange="updateSauce(${i}, this.value)" style="margin-bottom: 8px;">
                                    ${sauceOptions.map(s => `<option value="${s}" ${state.tempCustomization.selectedSauces[i] === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            `).join('')}
                        </div>
                    ` : ''}

                    ${item.ingredients && cat !== 'chicken' ? `
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <div style="font-weight: 900; font-size: 16px;">Customise Ingredients</div>
                                <button onclick="setShowIngredients(!state.showIngredients)" style="background: none; border: none; color: var(--primary); font-weight: 800; font-size: 13px; cursor: pointer;">
                                    ${state.showIngredients ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <div style="display: ${state.showIngredients ? 'grid' : 'none'}; gap: 8px;">
                                ${Object.entries(state.tempCustomization.ingredients).map(([ing, count]) => `
                                    <div class="ingredient-row ${count === 0 ? 'removed' : ''}">
                                        <div style="display: flex; flex-direction: column;">
                                            <span style="font-weight: 700; font-size: 15px;">${ing}</span>
                                            ${(ing.includes('Patty') || ing.includes('Cheese')) && count > (item.ingredients[ing] || 0) ? `<span style="font-size: 10px; color: var(--primary); font-weight: 700;">+${cur()}${ing.includes('Patty') ? '2.00' : '0.60'} Extra</span>` : ''}
                                        </div>
                                        <div class="counter-group">
                                            <button class="counter-btn" onclick="updateIngredient('${ing}', -1)"><ion-icon name="remove"></ion-icon></button>
                                            <span class="counter-val">${count}</span>
                                            <button class="counter-btn" onclick="updateIngredient('${ing}', 1)"><ion-icon name="add"></ion-icon></button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div style="padding: 20px; border-top: 1px solid var(--border);">
                    <button class="btn btn-primary" style="width: 100%; font-size: 18px;" onclick="confirmCustomization()">
                        ${state.editingIndex !== null ? 'Save Changes' : `Add to Order • ${cur()}${total.toFixed(2)}`}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderCartSidebar() {
    const subtotal = state.cart.reduce((a, b) => a + (b.price * b.qty), 0);
    return `
        <div class="cart-sidebar ${state.cartOpen ? 'open' : ''}">
            <div style="padding: 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <h2 style="font-size: 22px; font-weight: 900;">My Order</h2>
                <button onclick="toggleCart(false)" style="font-size: 28px; background: none; border: none; color: #ccc;"><ion-icon name="close-circle"></ion-icon></button>
            </div>
            <div style="flex: 1; overflow-y: auto; padding: 20px;">
                ${state.cart.length === 0 ? `
                    <div style="text-align: center; margin-top: 100px; padding: 20px;">
                        <ion-icon name="cart-outline" style="font-size: 64px; color: var(--border); margin-bottom: 16px;"></ion-icon>
                        <div style="color: #999; font-weight: 700; font-size: 18px;">Your tray is empty.</div>
                        <p style="color: #bbb; font-size: 13px; margin-top: 8px;">Browse our menu and pick something tasty!</p>
                        <button class="btn btn-primary" onclick="toggleCart(false)" style="margin-top: 24px; width: 100%;">Browse Menu</button>
                    </div>
                ` : 
                  state.cart.map((item, i) => `
                    <div class="cart-item" style="display: flex; gap: 16px; margin-bottom: 24px; animation: fadeIn 0.3s ease;">
                        <img src="${item.img}" style="width: 68px; height: 68px; object-fit: contain; background: var(--bg-grey); border-radius: 12px;">
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <div style="font-weight: 800; font-size: 15px;">${item.qty}x ${item.name}</div>
                                    <div style="font-size: 12px; color: var(--text-grey); font-weight: 600; margin-top: 2px;">
                                        ${item.isMeal ? `${item.size} Meal` : 'Item Only'}
                                        ${item.selectedDrink && item.isMeal ? ` • ${item.selectedDrink}` : ''}
                                        
                                        <!-- Persistent Allergen Warning in Cart -->
                                        ${(item.allergenTags || []).filter(t => state.user.allergies.includes(t)).map(tag => `
                                            <div style="color: #ed2126; font-size: 10px; font-weight: 800; margin-top: 4px; display: flex; align-items: center; gap: 4px; background: #fff5f5; padding: 2px 6px; border-radius: 4px; width: fit-content; border: 1px solid #ffebeb;">
                                                <ion-icon name="warning-outline"></ion-icon> Includes ${getDietaryLabel(tag)}
                                            </div>
                                        `).join('')}

                                        <!-- Show customization details -->
                                        ${Object.entries(item.ingredients || {}).map(([ing, count]) => {
                                            const base = (state.menu[getCategoryForItem(item.id)].find(i => i.id === item.id).ingredients || {})[ing] || 0;
                                            if (count === 0 && base > 0) return `<div style="color: #ed2126; font-size: 11px; font-weight: 700; margin-top: 1px;">No ${ing}</div>`;
                                            if (count > base) {
                                                const diff = count - base;
                                                return `<div style="color: #2e7d32; font-size: 11px; font-weight: 700; margin-top: 1px;">${diff > 1 ? diff + 'x ' : ''}Extra ${ing}</div>`;
                                            }
                                            return '';
                                        }).join('')}
                                    </div>
                                </div>
                                <div style="font-weight: 950; color: var(--primary); font-size: 16px;">${cur()}${(item.price * item.qty).toFixed(2)}</div>
                            </div>
                            <div style="display: flex; gap: 12px; margin-top: 10px; align-items: center;">
                                <div class="qty-control">
                                    <button class="qty-btn" onclick="updateQty(${i}, -1)"><ion-icon name="remove"></ion-icon></button>
                                    <span class="qty-val">${item.qty}</span>
                                    <button class="qty-btn" onclick="updateQty(${i}, 1)"><ion-icon name="add"></ion-icon></button>
                                </div>
                                ${!['drinks', 'sauces'].includes(getCategoryForItem(item.id)) ? `
                                    <button onclick="editCartItem(${i})" style="font-weight: 800; font-size: 12px; border: none; background: none; color: var(--primary); padding: 4px;">Customise</button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                  `).join('')
                }
            </div>
            ${state.cart.length > 0 ? `
                <div style="padding: 24px; border-top: 1px solid var(--border); background: var(--bg-soft);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <span style="font-weight: 800; color: var(--text-grey);">Total Amount</span>
                        <span style="font-weight: 950; font-size: 24px; color: var(--text-dark);">${cur()}${subtotal.toFixed(2)}</span>
                    </div>
                    <button class="btn btn-primary" id="checkoutBtn" style="width: 100%; font-size: 18px;" onclick="setView('checkout')">Review & Pay</button>
                </div>
            ` : ''}
        </div>
    `;
}

function renderCheckout(animate = false) {
    const total = state.cart.reduce((a, b) => a + (b.price * b.qty), 0);
    return `
        <div class="container ${animate ? 'animate-up' : ''}" style="padding-top: 24px; padding-bottom: 100px;">
            <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 24px;">Complete your Order</h2>
            <div style="background: white; padding: 24px; border-radius: 20px; box-shadow: var(--shadow); margin-bottom: 24px;">
                <h4 style="font-weight: 900; margin-bottom: 16px;">Order Summary</h4>
                ${state.cart.map(item => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
                        <div>
                            <span style="font-weight: 800;">${item.qty}x ${item.name}</span>
                            <div style="font-size: 11px; color: var(--text-grey); font-weight: 600;">
                                ${item.isMeal ? `${item.size} Meal` : 'Item Only'}
                                ${(item.allergenTags || []).filter(t => state.user.allergies.includes(t)).map(tag => `
                                    <span style="color: #ed2126; font-weight: 800; font-size: 10px;"> • ⚠ Contains ${getDietaryLabel(tag)}</span>
                                `).join('')}
                                ${Object.entries(item.ingredients || {}).map(([ing, count]) => {
                                    const base = (state.menu[getCategoryForItem(item.id)].find(i => i.id === item.id).ingredients || {})[ing] || 0;
                                    if (count === 0 && base > 0) return ` • No ${ing}`;
                                    if (count > base) return ` • Extra ${ing}`;
                                    return '';
                                }).join('')}
                            </div>
                        </div>
                        <span style="font-weight: 700;">${cur()}${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                `).join('')}
                <hr style="border: none; border-top: 1px dashed #eee; margin: 16px 0;">
                <div style="display: flex; justify-content: space-between; opacity: 0.7; font-size: 14px;">
                    <span>Table Number:</span>
                    <span style="font-weight: 900; color: var(--text-dark);">${table()}</span>
                </div>
            </div>
            <div style="background: white; padding: 24px; border-radius: 20px; box-shadow: var(--shadow); margin-bottom: 24px;">
                <h4 style="font-weight: 900; margin-bottom: 16px;">Kitchen Notes</h4>
                <textarea class="notes-area" rows="3" placeholder="Any allergies? Let us know here..."></textarea>
            </div>
            <button class="btn btn-primary" id="finalOrderBtn" style="width: 100%; font-size: 18px; padding: 22px; box-shadow: 0 8px 25px rgba(219,0,7,0.25);" onclick="setView('payment')">
                Confirm & Send to Kitchen • ${cur()}${total.toFixed(2)}
            </button>
        </div>
    `;
}

function renderPayment(animate = false) {
    const subtotal = state.cart.reduce((a, b) => a + (b.price * b.qty), 0);
    const tax = subtotal * 0.13;
    const total = subtotal + tax;

    return `
        <div class="container ${animate ? 'animate-up' : ''}" style="padding-top: 24px; padding-bottom: 100px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                <button onclick="setView('checkout')" style="background: var(--bg-grey); border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                    <ion-icon name="arrow-back" style="font-size: 20px;"></ion-icon>
                </button>
                <h2 style="font-size: 24px; font-weight: 900;">Secure Payment</h2>
            </div>

            <div style="background: white; padding: 24px; border-radius: 24px; box-shadow: var(--shadow); margin-bottom: 24px;">
                <h4 style="font-weight: 900; margin-bottom: 16px; display: flex; justify-content: space-between;">
                    <span>Order Total</span>
                    <span style="color: var(--text-grey); font-size: 14px; font-weight: 700;">Table #${table()}</span>
                </h4>
                <div style="display: grid; gap: 8px; font-size: 14px;">
                    <div style="display: flex; justify-content: space-between; opacity: 0.7;">
                        <span>Subtotal</span>
                        <span>${cur()}${subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; opacity: 0.7;">
                        <span>Tax (13%)</span>
                        <span>${cur()}${tax.toFixed(2)}</span>
                    </div>
                    <hr style="border: none; border-top: 1px dashed #eee; margin: 8px 0;">
                    <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 20px;">
                        <span>Total</span>
                        <span style="color: var(--primary);">${cur()}${total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <h4 style="font-weight: 900; margin-bottom: 16px; padding-left: 4px;">Payment Method</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                ${['card', 'apple', 'google', 'counter'].map(method => {
                    const icons = { card: 'card', apple: 'logo-apple', google: 'logo-google', counter: 'storefront' };
                    const labels = { card: 'Card', apple: 'Apple Pay', google: 'Google Pay', counter: 'At Counter' };
                    const active = state.paymentMethod === method;
                    return `
                        <div class="method-card ${active ? 'active' : ''}" onclick="setPaymentMethod('${method}')" 
                             style="background: white; border: 2px solid ${active ? 'var(--primary)' : 'transparent'}; 
                                    padding: 16px; border-radius: 16px; text-align: center; cursor: pointer; 
                                    box-shadow: ${active ? '0 4px 15px rgba(219,0,7,0.1)' : 'var(--shadow)'};
                                    transition: all 0.2s ease;">
                            <ion-icon name="${icons[method]}" style="font-size: 24px; color: ${active ? 'var(--primary)' : 'var(--text-grey)'}; margin-bottom: 4px;"></ion-icon>
                            <div style="font-size: 11px; font-weight: 800; color: ${active ? 'var(--text-dark)' : 'var(--text-grey)'};">${labels[method]}</div>
                        </div>
                    `;
                }).join('')}
            </div>

            ${state.paymentMethod === 'card' ? `
                <div class="animate-up" style="background: white; padding: 24px; border-radius: 24px; box-shadow: var(--shadow); margin-bottom: 24px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-grey); margin-bottom: 6px; text-transform: uppercase;">Cardholder Name</label>
                        <input type="text" class="notes-area" placeholder="e.g. ALEX JOHNSON" style="padding: 14px; background: var(--bg-grey);">
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-grey); margin-bottom: 6px; text-transform: uppercase;">Card Number</label>
                        <input type="text" class="notes-area" placeholder="•••• •••• •••• ••••" style="padding: 14px; background: var(--bg-grey);">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-grey); margin-bottom: 6px; text-transform: uppercase;">Expiry</label>
                            <input type="text" class="notes-area" placeholder="MM/YY" style="padding: 14px; background: var(--bg-grey);">
                        </div>
                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 800; color: var(--text-grey); margin-bottom: 6px; text-transform: uppercase;">CVV</label>
                            <input type="password" class="notes-area" placeholder="•••" style="padding: 14px; background: var(--bg-grey);">
                        </div>
                    </div>
                </div>
            ` : ''}

            <button class="btn btn-primary" id="payBtn" 
                    style="width: 100%; font-size: 18px; padding: 22px; box-shadow: 0 8px 25px rgba(219,0,7,0.25); position: relative; overflow: hidden;" 
                    onclick="handlePayment()" ${state.paymentProcessing ? 'disabled' : ''}>
                ${state.paymentProcessing ? `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <div class="loader" style="width: 18px; height: 18px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        Processing Payment...
                    </div>
                ` : `Pay ${cur()}${total.toFixed(2)}`}
            </button>
            <p style="text-align: center; font-size: 11px; color: var(--text-grey); margin-top: 16px; font-weight: 600;">
                <ion-icon name="lock-closed" style="vertical-align: middle;"></ion-icon> Encrypted & Secure Payment
            </p>
        </div>
    `;
}

function renderPaymentModal() {
    if (!state.paymentError) return '<div class="modal-overlay" id="paymentModal"></div>';
    return `
        <div class="modal-overlay open" style="z-index: 5000; align-items: center; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);">
            <div class="modal-content animate-up" style="max-width: 320px; border-radius: 28px; padding: 32px; text-align: center;">
                <div style="background: #fff0f0; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <ion-icon name="close-circle" style="color: var(--primary); font-size: 40px;"></ion-icon>
                </div>
                <h2 style="font-size: 22px; font-weight: 950; margin-bottom: 8px;">Payment Failed</h2>
                <p style="font-size: 14px; color: var(--text-grey); font-weight: 600; line-height: 1.5; margin-bottom: 24px;">Please check your details and try again.</p>
                <button class="btn btn-primary" onclick="retryPayment()" style="width: 100%;">Try Again</button>
            </div>
        </div>
    `;
}

window.retryPayment = () => {
    state.paymentError = false;
    render();
};

window.setPaymentMethod = (method) => {
    state.paymentMethod = method;
    render();
};

window.handlePayment = () => {
    state.paymentProcessing = true;
    render();

    setTimeout(() => {
        state.paymentProcessing = false;
        
        if (Math.random() < 0.1) {
            state.paymentError = true;
            render();
        } else {
            state.currentOrderId = Math.floor(1000 + Math.random() * 9000);
            const subtotal = state.cart.reduce((a, b) => a + (b.price * b.qty), 0);
            const total = subtotal * 1.13;
            const readyTime = 15 + Math.floor(Math.random() * 6);
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            document.getElementById('success-container').innerHTML = `
                <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:30px; animation: fadeIn 0.5s ease;">
                    <div style="background: #e8f5e9; width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                        <ion-icon name="checkmark-circle" style="font-size: 80px; color: #2e7d32;"></ion-icon>
                    </div>
                    <h1 style="font-weight:950; margin-bottom: 8px;">Payment Successful</h1>
                    <div style="background: var(--bg-grey); padding: 16px 32px; border-radius: 16px; margin-bottom: 24px;">
                        <div style="font-weight: 800; font-size: 14px; color: var(--text-grey);">Order #${state.currentOrderId}</div>
                        <div style="font-weight: 900; font-size: 18px;">Table #${table()}</div>
                    </div>
                    
                    <div style="display: grid; gap: 12px; margin-bottom: 40px; font-weight: 700;">
                        <div>🕒 Estimated ready in ${readyTime} mins</div>
                        <div style="opacity: 0.6;">📅 ${now} • Paid ${cur()}${total.toFixed(2)}</div>
                    </div>

                    <button class="btn btn-primary" style="width:200px; padding: 18px;" onclick="window.location.reload()">Back to Menu</button>
                    <p style="margin-top: 24px; font-size: 12px; color: var(--text-grey); font-weight: 600;">A receipt has been sent to your device.</p>
                </div>
            `;
            
            state.cart = [];
            state.view = 'home';
            render();
        }
    }, 1500);
};

function renderAccount() {
    return `<div class="container" style="padding: 40px 20px;">
        <h2 style="font-weight:900;">My Preferences</h2>
        <p style="opacity: 0.6;">Account features are locally saved for proof-of-concept.</p>
    </div>`;
}

/** FUNCTIONS */
window.toggleDietary = (type) => {
    if (state.user.allergies.includes(type)) {
        state.user.allergies = state.user.allergies.filter(a => a !== type);
    } else {
        state.user.allergies.push(type);
    }
    saveUser(state.user);
    render();
};

window.toggleMagicPick = (v) => {
    state.showMagicPick = v;
    state.magicResult = null;
    render();
};

window.setMagicBudget = (v) => {
    state.magicBudget = parseInt(v);
    render();
};

window.setMagicVibe = (v) => {
    state.magicVibe = v;
    render();
};

window.generateMagicPick = () => {
    const allItems = [];
    for (let cat in state.menu) {
        state.menu[cat].forEach(item => {
            const hasConflict = (item.allergenTags || []).some(t => state.user.allergies.includes(t));
            if (!hasConflict) allItems.push({ ...item, category: cat });
        });
    }

    let remainingBudget = state.magicBudget;
    const selection = [];
    let attempts = 0;

    while (remainingBudget >= 0.5 && attempts < 20) {
        attempts++;
        const affordable = allItems.filter(i => {
            const price = (['burgers', 'chicken'].includes(i.category) && Math.random() > 0.5) ? i.price + 4.00 : i.price;
            return price <= remainingBudget;
        });

        if (affordable.length === 0) break;

        // Score them for the vibe
        const scored = affordable.map(item => {
            let score = Math.random() * 10;
            if (state.magicVibe === 'treat' && item.kcal > 400) score += 10;
            if (state.magicVibe === 'healthy' && item.kcal < 350) score += 10;
            if (['burgers', 'chicken'].includes(item.category)) score += 5;
            return { item, score };
        });

        const best = scored.sort((a, b) => b.score - a.score)[0].item;
        const isMeal = (['burgers', 'chicken'].includes(best.category) && Math.random() > 0.3);
        const finalPrice = isMeal ? best.price + 4.00 : best.price;
        
        if (finalPrice <= remainingBudget) {
            selection.push({
                ...best,
                qty: 1,
                isMeal: isMeal,
                size: 'Medium',
                selectedDrink: 'Coca-Cola',
                basePrice: best.price,
                price: finalPrice,
                ingredients: { ...(best.ingredients || {}) }
            });
            remainingBudget -= finalPrice;
        }
    }

    state.magicResult = selection.length > 0 ? selection : 'nothing';
    render();
};

window.addMagicToCart = () => {
    if (Array.isArray(state.magicResult)) {
        state.magicResult.forEach(item => {
            addItemToCart(item);
        });
        state.showMagicPick = false;
        state.magicResult = null;
        state.cartOpen = true;
        render();
        showQuickPulse();
    }
};

function renderMagicPickModal() {
    if (!state.showMagicPick) return '';
    return `
        <div class="modal-overlay open" onclick="toggleMagicPick(false)">
            <div class="modal-content animate-up" onclick="event.stopPropagation()" style="max-width: 400px; padding: 32px; text-align: center; border-radius: 32px;">
                <div style="font-size: 48px; margin-bottom: 16px;">✨</div>
                <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">The Magic Pick</h2>
                <p style="font-size: 14px; color: var(--text-grey); font-weight: 600; margin-bottom: 24px;">Can't decide? Let us surprise you!</p>
                
                <div style="text-align: left; margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center;">
                        <span style="font-weight: 800; font-size: 14px;">My Budget: ${cur()}${state.magicBudget}</span>
                        <input type="range" min="5" max="100" step="5" value="${state.magicBudget}" onchange="setMagicBudget(this.value)" style="width: 60%;">
                    </div>
                    
                    <span style="font-weight: 800; font-size: 14px; display: block; margin-bottom: 12px;">The Vibe:</span>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                        ${['balanced', 'healthy', 'treat'].map(v => `
                            <button onclick="setMagicVibe('${v}')" style="background: ${state.magicVibe === v ? 'var(--primary)' : 'var(--bg-grey)'}; color: ${state.magicVibe === v ? 'white' : 'var(--text-grey)'}; border: none; padding: 8px; border-radius: 12px; font-size: 11px; font-weight: 800; cursor: pointer; text-transform: capitalize;">
                                ${v}
                            </button>
                        `).join('')}
                    </div>
                </div>

                ${state.magicResult ? `
                    ${state.magicResult === 'nothing' ? `
                        <div style="padding: 20px; background: #fff5f5; border-radius: 20px; border: 1px dashed #ed2126; margin-bottom: 24px;">
                            <p style="font-weight: 800; color: #ed2126; font-size: 14px;">Oops! Nothing matches your budget. Try going higher!</p>
                        </div>
                    ` : `
                        <div style="max-height: 250px; overflow-y: auto; padding: 12px; background: var(--bg-grey); border-radius: 24px; margin-bottom: 24px; animation: fadeIn 0.5s ease;">
                            <div style="font-weight: 800; font-size: 12px; color: var(--text-grey); margin-bottom: 12px; text-align: center;">We've picked ${state.magicResult.length} items for you!</div>
                            ${state.magicResult.map(item => `
                                <div style="display: flex; gap: 12px; align-items: center; background: white; padding: 10px; border-radius: 16px; margin-bottom: 8px;">
                                    <img src="${item.img}" style="width: 40px; height: 40px; object-fit: contain;">
                                    <div style="flex: 1; text-align: left;">
                                        <div style="font-weight: 900; font-size: 13px;">${item.name}</div>
                                        <div style="font-size: 10px; color: var(--text-grey); font-weight: 700;">${item.isMeal ? 'Medium Meal' : 'Item Only'}</div>
                                    </div>
                                    <div style="font-weight: 900; font-size: 13px; color: var(--primary);">${cur()}${item.price.toFixed(2)}</div>
                                </div>
                            `).join('')}
                            <div style="padding: 8px; border-top: 1px dashed #ccc; display: flex; justify-content: space-between; font-weight: 900; font-size: 15px;">
                                <span>Total:</span>
                                <span>${cur()}${state.magicResult.reduce((a, b) => a + b.price, 0).toFixed(2)}</span>
                            </div>
                        </div>
                    `}
                ` : ''}

                <button class="btn btn-primary" onclick="${Array.isArray(state.magicResult) ? 'addMagicToCart()' : 'generateMagicPick()'}" style="width: 100%; font-size: 18px;">
                    ${Array.isArray(state.magicResult) ? 'Add All to Tray' : 'Plan My Meal!'}
                </button>
                ${Array.isArray(state.magicResult) ? `
                    <button onclick="generateMagicPick()" style="margin-top: 12px; width: 100%; background: none; border: 1.5px solid var(--primary); color: var(--primary); padding: 10px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <ion-icon name="refresh-outline"></ion-icon>
                        Not Feeling It? Shuffle
                    </button>
                ` : ''}
                <button onclick="toggleMagicPick(false)" style="margin-top: 16px; background: none; border: none; font-weight: 800; color: var(--text-grey); cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
}

window.toggleSafeMode = (v) => {
    state.safeMode = v;
    render();
};

function getDietaryLabel(type) {
    const labels = { gluten: 'Gluten', dairy: 'Dairy', nuts: 'Nuts', vegetarian: 'Vegetarian', vegan: 'Vegan', spicy: 'Spicy' };
    return labels[type] || type;
}

function getDietaryIcon(type) {
    const icons = { gluten: '🌾', dairy: '🥛', nuts: '🥜', vegetarian: '🌱', vegan: '🌿', spicy: '🔥' };
    return icons[type] || '';
}

function renderWarningModal() {
    if (!state.warningItem) return `<div class="modal-overlay" id="warningModal"></div>`;
    const item = state.warningItem;
    const conflicts = item.allergenTags.filter(t => state.user.allergies.includes(t));
    const conflictList = conflicts.map(c => getDietaryLabel(c)).join(', ').replace(/, ([^,]*)$/, ' and $1');

    return `
        <div class="modal-overlay open" style="z-index: 3000; align-items: center; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
            <div class="modal-content animate-up" style="max-width: 400px; border-radius: 24px; padding: 32px; text-align: center; margin: 20px;">
                <div style="background: #fff0f0; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <ion-icon name="alert-circle" style="color: var(--primary); font-size: 40px;"></ion-icon>
                </div>
                <h2 style="font-size: 24px; font-weight: 950; margin-bottom: 12px;">Dietary Warning</h2>
                <p style="font-size: 15px; color: var(--text-grey); line-height: 1.5; margin-bottom: 24px;">
                    This item contains: <span style="font-weight: 800; color: var(--text-dark);">${conflictList}</span>.
                </p>
                <div style="font-weight: 700; margin-bottom: 32px;">Are you sure you want to continue?</div>
                <div style="display: grid; gap: 12px;">
                    <button class="btn btn-primary" onclick="proceedAfterWarning()" style="padding: 18px;">Add Anyway</button>
                    <button class="btn" onclick="cancelWarning()" style="background: none; color: var(--text-grey); font-weight: 700;">Cancel</button>
                </div>
            </div>
        </div>
    `;
}

window.proceedAfterWarning = () => {
    const item = state.warningItem;
    state.warningItem = null;
    if (state.pendingConfirm) {
        state.pendingConfirm();
        state.pendingConfirm = null;
    } else {
        // This is now purely for instant-add items (drinks/sauces)
        addItemToCart({ ...item, qty: 1, basePrice: item.price, price: item.price });
        showQuickPulse();
        render();
    }
};

window.cancelWarning = () => {
    state.warningItem = null;
    state.pendingConfirm = null;
    render();
};

window.setView = (v) => { state.view = v; render(); window.scrollTo(0,0); };
window.setCategory = (cat) => {
    state.activeCategory = cat;
    render();
    const el = document.getElementById(`section-${cat}`);
    if (el) {
        const y = el.getBoundingClientRect().top + window.pageYOffset - 130;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
};

window.handleItemClick = (id) => {
    const cat = getCategoryForItem(id);
    const item = state.menu[cat].find(i => i.id === id);
    
    if (['drinks', 'sauces'].includes(cat)) {
        // Instant Add check
        const hasConflict = (item.allergenTags || []).some(t => state.user.allergies.includes(t));
        if (hasConflict) {
            state.warningItem = item;
            render();
        } else {
            addItemToCart({ ...item, qty: 1, basePrice: item.price, price: item.price });
            render();
            showQuickPulse();
        }
    } else {
        // Open customization freely
        openCustomize(id);
    }
};

function showQuickPulse() {
    const btn = document.getElementById('cartBtn');
    if (btn) {
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => btn.style.transform = 'scale(1)', 200);
    }
}

window.openCustomize = (id, index = null) => {
    let item;
    if (index !== null) {
        item = state.cart[index];
        state.editingIndex = index;
        state.tempCustomization = { ...item };
    } else {
        for (let cat in state.menu) {
            let found = state.menu[cat].find(i => i.id === id);
            if (found) { item = found; break; }
        }
        state.editingIndex = null;
        const sCount = (item.name.includes('9 piece') || item.name.includes('5pc')) ? 2 : 1;
        state.tempCustomization = {
            size: 'Medium',
            isMeal: false,
            selectedDrink: 'Coca-Cola',
            selectedSauces: Array(sCount).fill('No Sauce'),
            ingredients: { ...(item.ingredients || {}) }
        };
    }
    state.modalScrollPos = 0;
    state.showIngredients = (index !== null); // Hidden for new add, shown for edit/customise
    state.customizingItem = item;
    render();
};

window.setShowIngredients = (v) => {
    const sc = document.getElementById('modalScrollable');
    if (sc) state.modalScrollPos = sc.scrollTop;
    state.showIngredients = v;
    render();
};

window.updateIngredient = (ing, delta) => {
    const sc = document.getElementById('modalScrollable');
    if (sc) state.modalScrollPos = sc.scrollTop;
    const base = state.customizingItem.ingredients[ing] || 0;
    // Allow up to 4 for patties and cheese, 2 for others
    const max = (ing.includes('Patty') || ing.includes('Cheese')) ? 4 : (ing === 'Salt' ? base : 2);
    const current = state.tempCustomization.ingredients[ing] || 0;
    state.tempCustomization.ingredients[ing] = Math.max(0, Math.min(max, current + delta));
    render();
};

window.toggleMeal = (v) => {
    const sc = document.getElementById('modalScrollable');
    if (sc) state.modalScrollPos = sc.scrollTop;
    state.tempCustomization.isMeal = v;
    render();
};

window.selectSize = (s) => {
    const sc = document.getElementById('modalScrollable');
    if (sc) state.modalScrollPos = sc.scrollTop;
    state.tempCustomization.size = s;
    render();
};

window.updateSauce = (i, v) => { 
    const sc = document.getElementById('modalScrollable');
    if (sc) state.modalScrollPos = sc.scrollTop;
    state.tempCustomization.selectedSauces[i] = v; 
    render();
};

window.updateDrink = (v) => {
    const sc = document.getElementById('modalScrollable');
    if (sc) state.modalScrollPos = sc.scrollTop;
    state.tempCustomization.selectedDrink = v;
    render();
};

window.confirmCustomization = () => {
    const item = state.customizingItem;
    
    const finish = () => {
        const mealAdd = state.tempCustomization.isMeal ? (state.tempCustomization.size === 'Large' ? 4.7 : 4.0) : 0;
        let extraCost = 0;
        Object.keys(state.tempCustomization.ingredients).forEach(ing => {
            const base = item.ingredients[ing] || 0;
            const delta = state.tempCustomization.ingredients[ing] - base;
            if (delta > 0) {
                const isFree = ['Pickles', 'Onions', 'Lettuce', 'Sauce', 'Ketchup', 'Mustard'].some(f => ing.includes(f));
                if (!isFree) {
                    if (ing.includes('Patty')) extraCost += delta * 2.00;
                    else if (ing.includes('Cheese')) extraCost += delta * 0.60;
                    else extraCost += delta * 0.40;
                }
            }
        });

        const basePrice = state.editingIndex !== null ? state.cart[state.editingIndex].basePrice : item.price;
        const finalItem = {
            ...item,
            ...state.tempCustomization,
            basePrice,
            price: basePrice + mealAdd + extraCost,
            qty: state.editingIndex !== null ? state.cart[state.editingIndex].qty : 1
        };

        if (state.editingIndex !== null) {
            state.cart[state.editingIndex] = finalItem;
            state.cartOpen = true; // Bring back cart after saving changes
        } else {
            addItemToCart(finalItem);
        }

        state.customizingItem = null;
        render();
    };

    // Safety check before adding
    const hasConflict = (item.allergenTags || []).some(t => state.user.allergies.includes(t));
    if (hasConflict) {
        state.warningItem = item;
        state.pendingConfirm = finish;
        render();
    } else {
        finish();
    }
};

window.addItemToCart = (newItem) => {
    const existingIndex = state.cart.findIndex(item => {
        if (item.id !== newItem.id) return false;
        if ((item.isMeal || false) !== (newItem.isMeal || false)) return false;
        if (item.isMeal) {
            if (item.size !== newItem.size) return false;
            if (item.selectedDrink !== newItem.selectedDrink) return false;
        }
        if (JSON.stringify(item.ingredients || {}) !== JSON.stringify(newItem.ingredients || {})) return false;
        if (JSON.stringify(item.selectedSauces || []) !== JSON.stringify(newItem.selectedSauces || [])) return false;
        return true;
    });

    if (existingIndex !== -1) {
        state.cart[existingIndex].qty += newItem.qty;
    } else {
        state.cart.push(newItem);
    }
};

window.updateQty = (index, delta) => {
    state.cart[index].qty += delta;
    if (state.cart[index].qty <= 0) state.cart.splice(index, 1);
    render();
};

window.toggleCart = (v) => { state.cartOpen = v; render(); };

window.editCartItem = (i) => {
    state.cartOpen = false; // Hide cart when customizing
    const itm = state.cart[i];
    openCustomize(itm.id, i);
};

function getCategoryForItem(id) {
    for (let cat in state.menu) {
        if (state.menu[cat].some(i => i.id === id)) return cat;
    }
    return '';
}

window.closeModal = () => { 
    if (state.editingIndex !== null) state.cartOpen = true; // Bring back cart if we were editing
    state.customizingItem = null; 
    render(); 
};

window.callWaiter = () => alert(`Staff on their way to Table #${table()}!`);


// Nudge Timer
setInterval(() => {
    const nudge = document.getElementById('nudgeContainer');
    if (nudge && state.cart.length > 0) {
        nudge.innerHTML = `<div class="nudge-tooltip">Ready to order? <ion-icon name="arrow-forward"></ion-icon></div>`;
        setTimeout(() => {
            const el = nudge.querySelector('.nudge-tooltip');
            if (el) el.classList.add('fade-out');
            setTimeout(() => { if(nudge) nudge.innerHTML = ''; }, 600);
        }, 6000);
    }
}, 150000);

render();

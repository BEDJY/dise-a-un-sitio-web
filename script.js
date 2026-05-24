// Production LocalStorage Simulated Database for GitHub Pages
window.db = {
    async select(table, options = {}) {
        const key = 'nexus_pages_db_' + table;
        let rows = JSON.parse(localStorage.getItem(key)) || [];
        if (options.where && Object.keys(options.where).length > 0) {
            rows = rows.filter(row => {
                for (const [k, v] of Object.entries(options.where)) {
                    if (row[k] != v) return false;
                }
                return true;
            });
        }
        if (options.order) {
            const parts = options.order.trim().split(/\s+/);
            const k = parts[0];
            const isDesc = parts[1] && parts[1].toUpperCase() === 'DESC';
            rows.sort((a, b) => {
                if (a[k] < b[k]) return isDesc ? 1 : -1;
                if (a[k] > b[k]) return isDesc ? -1 : 1;
                return 0;
            });
        }
        return rows;
    },
    async insert(table, data) {
        const key = 'nexus_pages_db_' + table;
        let rows = JSON.parse(localStorage.getItem(key)) || [];
        const newRow = { id: Date.now(), ...data };
        rows.push(newRow);
        localStorage.setItem(key, JSON.stringify(rows));
        return newRow;
    },
    async update(table, data, where) {
        const key = 'nexus_pages_db_' + table;
        let rows = JSON.parse(localStorage.getItem(key)) || [];
        let affected = 0;
        rows = rows.map(row => {
            let match = true;
            if (where) {
                for (const [k, v] of Object.entries(where)) {
                    if (row[k] != v) match = false;
                }
            }
            if (match) {
                affected++;
                return { ...row, ...data };
            }
            return row;
        });
        localStorage.setItem(key, JSON.stringify(rows));
        return { success: true, affected_rows: affected };
    },
    async delete(table, where) {
        const key = 'nexus_pages_db_' + table;
        let rows = JSON.parse(localStorage.getItem(key)) || [];
        const initial = rows.length;
        if (where) {
            rows = rows.filter(row => {
                for (const [k, v] of Object.entries(where)) {
                    if (row[k] == v) return false;
                }
                return true;
            });
        } else {
            rows = [];
        }
        localStorage.setItem(key, JSON.stringify(rows));
        return { success: true, affected_rows: initial - rows.length };
    }
};

// --- BASE DE DATOS DEL MENÚ ---
const menuDB = [
    { id: 'm1', name: 'Ramen de Neón', type: 'solidos', desc: 'Fideos bioluminiscentes en caldo de algas sintéticas con huevo clonado y cebollín eléctrico.', price: 180, code: 'RMN-9' },
    { id: 'm2', name: 'Hamburguesa de Carbono', type: 'solidos', desc: 'Pan negro de grafeno, carne sintética texturizada grado A, queso de soja fundido y salsa picante ácida.', price: 210, code: 'HBG-C' },
    { id: 'm3', name: 'Gyoza Holográfica', type: 'solidos', desc: 'Masa translúcida rellena de vegetales modificados genéticamente con dip de soya nanoestructurada.', price: 130, code: 'GYZ-H' },
    { id: 'm4', name: 'Té de Plasma', type: 'liquidos', desc: 'Bebida caliente ionizada con infusión de jengibre cuántico y destellos de luz ultravioleta.', price: 75, code: 'TEA-P' },
    { id: 'm5', name: 'Cóctel Criogénico', type: 'liquidos', desc: 'Etanol purificado con nitrógeno líquido, jarabe de curaçao azul y micro-cristales de azúcar reflectantes.', price: 110, code: 'CRY-C' },
    { id: 'm6', name: 'Néctar de Nanobots', type: 'liquidos', desc: 'Suplemento líquido sabor mora azul cargado con nanomáquinas reparadoras de tejido celular.', price: 150, code: 'NCT-N' }
];

// --- ESTADO GLOBAL DE LA APLICACIÓN ---
let cart = [];
let currentFilter = 'all';

// --- SINTETIZADOR DE SONIDO (WEB AUDIO API) ---
let audioCtx = null;
function playBeep(freq, type, duration) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq || 440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.log("Audio Context no inicializado por restricciones del navegador.");
    }
}

// --- LÓGICA DEL MENÚ ---
function renderMenu() {
    const container = document.getElementById('menu-items-container');
    container.innerHTML = '';

    const filteredItems = menuDB.filter(item => currentFilter === 'all' || item.type === currentFilter);

    filteredItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `
            <div class="card-img-container">
                <div class="card-img-placeholder">
                    <span>${item.code}</span>
                    <span class="card-code">// SYNTH_OK</span>
                </div>
                <span class="card-tag">${item.type.toUpperCase()}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${item.name}</h3>
                <p class="card-desc">${item.desc}</p>
                <div class="card-footer">
                    <span class="card-price">${item.price} ฿</span>
                    <button class="btn btn-secondary" onclick="addToCart('${item.id}')">PEDIR</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterMenu(category) {
    playBeep(700, 'triangle', 0.08);
    currentFilter = category;
    
    // Actualizar botones activos
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    renderMenu();
}

// --- LÓGICA DEL SINTETIZADOR ---
function updateSynthesizer() {
    playBeep(500, 'sine', 0.05);

    const baseSelect = document.getElementById('synth-base');
    const proteinSelect = document.getElementById('synth-protein');
    const boostSelect = document.getElementById('synth-boost');

    const baseOpt = baseSelect.options[baseSelect.selectedIndex];
    const proteinOpt = proteinSelect.options[proteinSelect.selectedIndex];
    const boostOpt = boostSelect.options[boostSelect.selectedIndex];

    // Cálculo de Atributos
    const price = parseInt(baseOpt.dataset.price) + parseInt(proteinOpt.dataset.price) + parseInt(boostOpt.dataset.price);
    const energy = parseInt(baseOpt.dataset.energy) + parseInt(proteinOpt.dataset.energy) + parseInt(boostOpt.dataset.energy);
    const nanos = parseInt(baseOpt.dataset.nanos) + parseInt(proteinOpt.dataset.nanos) + parseInt(boostOpt.dataset.nanos);
    const tox = parseInt(baseOpt.dataset.tox) + parseInt(proteinOpt.dataset.tox) + parseInt(boostOpt.dataset.tox);

    // Actualizar barras de estadísticas
    document.getElementById('bar-energy').style.width = `${Math.min(energy, 100)}%`;
    document.getElementById('bar-nanos').style.width = `${Math.min(nanos, 100)}%`;
    document.getElementById('bar-tox').style.width = `${Math.min(tox, 100)}%`;

    // Actualizar precio
    document.getElementById('synth-total-price').innerText = price;

    // Actualizar previsualización holográfica según la combinación
    const dishVisual = document.getElementById('holo-dish-visual');
    if (baseSelect.value === 'ramen') {
        dishVisual.style.background = 'var(--neon-pink)';
        dishVisual.style.boxShadow = 'var(--neon-glow-pink)';
        dishVisual.style.borderRadius = '50%';
    } else if (baseSelect.value === 'algae') {
        dishVisual.style.background = 'var(--neon-cyan)';
        dishVisual.style.boxShadow = 'var(--neon-glow-cyan)';
        dishVisual.style.borderRadius = '20% 40% 20% 40%';
    } else {
        dishVisual.style.background = 'var(--neon-yellow)';
        dishVisual.style.boxShadow = '0 0 10px #ffe600';
        dishVisual.style.borderRadius = '0%';
    }
}

function addSynthesizedToCart() {
    playBeep(950, 'square', 0.15);

    const baseSelect = document.getElementById('synth-base');
    const proteinSelect = document.getElementById('synth-protein');
    const boostSelect = document.getElementById('synth-boost');

    const baseName = baseSelect.options[baseSelect.selectedIndex].text.split('(')[0].trim();
    const proteinName = proteinSelect.options[proteinSelect.selectedIndex].text.split('(')[0].trim();
    const price = parseInt(baseSelect.options[baseSelect.selectedIndex].dataset.price) + 
                  parseInt(proteinSelect.options[proteinSelect.selectedIndex].dataset.price) + 
                  parseInt(boostSelect.options[boostSelect.selectedIndex].dataset.price);

    const customItem = {
        id: 'custom-' + Date.now(),
        name: `Sint: ${baseName} + ${proteinName}`,
        price: price
    };

    cart.push(customItem);
    updateCartUI();
    toggleCart(true); // Abrir carrito para ver la inyección
}

// --- LÓGICA DEL CARRITO ---
function toggleCart(forceOpen = false) {
    playBeep(650, 'triangle', 0.08);
    const drawer = document.getElementById('cartDrawer');
    if (forceOpen) {
        drawer.classList.add('open');
    } else {
        drawer.classList.toggle('open');
    }
}

function addToCart(id) {
    playBeep(850, 'sine', 0.1);
    const item = menuDB.find(m => m.id === id);
    if (item) {
        cart.push({...item});
        updateCartUI();
    }
}

function removeFromCart(id) {
    playBeep(400, 'triangle', 0.1);
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const countContainer = document.getElementById('cart-count');
    const itemsContainer = document.getElementById('cart-items-container');
    const totalContainer = document.getElementById('cart-total-value');

    countContainer.innerText = cart.length;
    itemsContainer.innerHTML = '';

    let total = 0;
    cart.forEach(item => {
        total += item.price;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <span>${item.price} ฿</span>
            </div>
            <div class="cart-item-actions">
                <button class="remove-btn" onclick="removeFromCart('${item.id}')">[ ELIMINAR ]</button>
            </div>
        `;
        itemsContainer.appendChild(div);
    });

    totalContainer.innerText = `${total} ฿`;
}

function checkout() {
    if (cart.length === 0) {
        playBeep(300, 'sawtooth', 0.3);
        alert('ADVERTENCIA: Núcleo de pedido vacío. No se detectan transacciones en cola.');
        return;
    }
    
    // Sonido de éxito de transacción futurista
    playBeep(600, 'sine', 0.1);
    setTimeout(() => playBeep(900, 'sine', 0.1), 100);
    setTimeout(() => playBeep(1200, 'sine', 0.3), 200);

    alert('TRANSACCIÓN EXITOSA.\nCréditos deducidos de la red neural.\nSu pedido se está materializando en la impresora de cocina.');
    cart = [];
    updateCartUI();
    toggleCart(false);
}

// --- INICIALIZACIÓN ---
window.onload = () => {
    renderMenu();
    updateSynthesizer();
};

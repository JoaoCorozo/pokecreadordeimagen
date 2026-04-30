const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchLoading = document.getElementById('search-loading');
const searchResults = document.getElementById('search-results');

const cartItemsContainer = document.getElementById('cart-items');
const generateBtn = document.getElementById('generate-btn');
const genLoading = document.getElementById('gen-loading');
const toast = document.getElementById('toast');

let cart = [];

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    searchBtn.disabled = true;
    searchLoading.classList.remove('hidden');
    searchResults.innerHTML = '';

    try {
        const formattedQuery = query.split(' ').map(word => `name:*${word}*`).join(' ');
        const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${formattedQuery}&pageSize=15`);
        if (!res.ok) throw new Error('Error en red');
        const data = await res.json();
        
        if (data.data.length === 0) {
            searchResults.innerHTML = '<div style="grid-column: 1/-1; text-align:center;">No se encontraron cartas.</div>';
        } else {
            data.data.forEach(card => renderSearchResult(card));
        }
    } catch (err) {
        showToast('Error al buscar cartas: ' + err.message);
    } finally {
        searchBtn.disabled = false;
        searchLoading.classList.add('hidden');
    }
});

function renderSearchResult(card) {
    const div = document.createElement('div');
    div.className = 'card-item';
    
    const img = document.createElement('img');
    img.src = card.images.small;
    img.alt = card.name;
    img.loading = 'lazy';
    
    const info = document.createElement('div');
    info.className = 'card-info';
    info.innerHTML = `<div class="card-name">${card.name}</div><div class="card-set">${card.set.name}</div>`;
    
    const btn = document.createElement('button');
    btn.className = 'btn-add';
    btn.textContent = '+ Añadir';
    btn.onclick = () => addToCart(card);
    
    div.appendChild(img);
    div.appendChild(info);
    div.appendChild(btn);
    searchResults.appendChild(div);
}

function addToCart(card) {
    const existing = cart.find(c => c.id === card.id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...card, qty: 1 });
    }
    renderCart();
    showToast(`${card.name} añadido a la lista`);
}

function removeFromCart(id) {
    cart = cart.filter(c => c.id !== id);
    renderCart();
}

function changeQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty < 1) item.qty = 1;
        renderCart();
    }
}

// Exponer funciones al scope global para que los botones onclick funcionen
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;

function renderCart() {
    cartItemsContainer.innerHTML = '';
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart">Tu lista está vacía.</div>';
        generateBtn.disabled = true;
        return;
    }
    
    generateBtn.disabled = false;
    
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        
        div.innerHTML = `
            <img src="${item.images.small}" alt="${item.name}">
            <div class="cart-item-info">
                <div style="font-weight:bold">${item.name}</div>
                <div style="font-size:0.8rem;color:#aaa">${item.set.name}</div>
            </div>
            <div class="cart-controls">
                <button class="btn-qty" onclick="changeQty('${item.id}', -1)">-</button>
                <div class="qty-display">${item.qty}</div>
                <button class="btn-qty" onclick="changeQty('${item.id}', 1)">+</button>
                <button class="btn-remove" onclick="removeFromCart('${item.id}')">Quitar</button>
            </div>
        `;
        cartItemsContainer.appendChild(div);
    });
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

const CARD_WIDTH = 300;
const CARD_HEIGHT = 420;
const PADDING = 20;

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // NECESARIO PARA EXPORTAR EL CANVAS
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
    });
}

function drawHexagon(ctx, x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        const px = x + size * Math.cos(angle_rad);
        const py = y + size * Math.sin(angle_rad);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

generateBtn.addEventListener('click', async () => {
    if (cart.length === 0) return;
    
    generateBtn.disabled = true;
    genLoading.classList.remove('hidden');
    
    try {
        const n_cards = cart.length;
        let cols = Math.ceil(Math.sqrt(n_cards));
        if (n_cards <= 2) cols = n_cards;
        else if (n_cards === 3) cols = 3;
        else if (n_cards === 4) cols = 2;
        else if (n_cards === 5 || n_cards === 6) cols = 3;
        else if (n_cards === 7 || n_cards === 8) cols = 4;
        else if (n_cards === 9 || n_cards === 10) cols = 5;
        else cols = Math.min(6, Math.ceil(Math.sqrt(n_cards)));
        
        const rows = Math.ceil(n_cards / cols);
        
        const canvas = document.createElement('canvas');
        canvas.width = (cols * CARD_WIDTH) + ((cols + 1) * PADDING);
        canvas.height = (rows * CARD_HEIGHT) + ((rows + 1) * PADDING);
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < cart.length; i++) {
            const item = cart[i];
            const img = await loadImage(item.images.large);
            
            const col_idx = i % cols;
            const row_idx = Math.floor(i / cols);
            
            const x = PADDING + (col_idx * (CARD_WIDTH + PADDING));
            const y = PADDING + (row_idx * (CARD_HEIGHT + PADDING));
            
            ctx.drawImage(img, x, y, CARD_WIDTH, CARD_HEIGHT);
            
            const hex_size = 35;
            const hex_x = x + CARD_WIDTH / 2;
            const hex_y = y + CARD_HEIGHT - hex_size - 15;
            
            // Sombra
            drawHexagon(ctx, hex_x + 3, hex_y + 3, hex_size);
            ctx.fillStyle = 'rgba(10,10,10,0.6)';
            ctx.fill();
            
            // Hexágono Rojo
            drawHexagon(ctx, hex_x, hex_y, hex_size);
            ctx.fillStyle = '#EE1515';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            
            // Texto
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.qty.toString(), hex_x, hex_y + 2);
        }
        
        // Generar nombre de archivo con fecha y hora
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const filename = `lista_cartas_${yyyy}${mm}${dd}_${hh}${min}${ss}.png`;
        
        // Intentar usar la API moderna para forzar el diálogo "Guardar como..."
        try {
            if ('showSaveFilePicker' in window) {
                // Convertir canvas a Blob para usar File System API
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Imagen PNG',
                        accept: {'image/png': ['.png']},
                    }],
                });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                showToast('¡Imagen guardada exitosamente!');
            } else {
                // Fallback tradicional (descarga directa) si el navegador no soporta la API
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL('image/png');
                link.click();
                showToast('¡Imagen descargada exitosamente!');
            }
        } catch (err) {
            // Si el usuario presiona "Cancelar" en el diálogo, no hacemos nada.
            if (err.name !== 'AbortError') {
                showToast('Error al guardar el archivo.');
                console.error(err);
            }
        }
        
    } catch (err) {
        showToast('Error generando imagen: ' + err.message);
        console.error(err);
    } finally {
        generateBtn.disabled = false;
        genLoading.classList.add('hidden');
    }
});

document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // VALIDACIÓN FORMULARIO (EDIT / ADD PRODUCT)
    // =========================
    const form = document.getElementById('addProductForm');

    if (form) {
        form.addEventListener('submit', (e) => {
            let valid = true;

            // limpiar errores
            document.querySelectorAll('.error-message').forEach(el => {
                el.textContent = '';
            });

            // =========================
            // NAME
            // =========================
            const name = form.name.value.trim();

            if (!name) {
                document.getElementById('errorName').textContent = 'El nombre es obligatorio';
                valid = false;
            } else if (name.length < 2) {
                document.getElementById('errorName').textContent = 'El nombre es demasiado corto';
                valid = false;
            }

            // =========================
            // CATEGORY
            // =========================
            const category = form.category.value.trim();

            if (!category) {
                document.getElementById('errorCategory').textContent = 'La categoría es obligatoria';
                valid = false;
            } else if (category.length < 2) {
                document.getElementById('errorCategory').textContent = 'La categoría es demasiado corta';
                valid = false;
            }

            // =========================
            // PRICE
            // =========================
            const price = parseFloat(form.price.value);

            if (isNaN(price)) {
                document.getElementById('errorPrice').textContent = 'Precio inválido';
                valid = false;
            } else if (price <= 0) {
                document.getElementById('errorPrice').textContent = 'El precio debe ser mayor que 0';
                valid = false;
            }

            // =========================
            // STOCK
            // =========================
            const stock = parseInt(form.stock.value, 10);

            if (isNaN(stock)) {
                document.getElementById('errorStock').textContent = 'Stock inválido';
                valid = false;
            } else if (stock < 0 || !Number.isInteger(stock)) {
                document.getElementById('errorStock').textContent =
                    'El stock debe ser un entero mayor o igual a 0';
                valid = false;
            }

            // =========================
            // ACTIVE
            // =========================
            const active = form.active.value;

            if (active !== "1" && active !== "0") {
                document.getElementById('errorActive').textContent =
                    'Selecciona un estado válido';
                valid = false;
            }

            if (!valid) e.preventDefault();
        });
    }

    // =========================
    // THEMES
    // =========================

    const themeForm = document.querySelector(".theme-form");
    const root = document.documentElement;

    const themes = {
        claro: {
            "--bg": "#ffffff",
            "--text": "#363537",
            "--surface": "rgb(245 247 249)",
            "--surface-2": "#ffffff",
            "--nav-active": "#00b05e",
            "--nav-hover": "#00914d",
            "--primary": "#0C9DB4",
            "--primary-hover": "#0a879b",
            "--accent": "#076877",
            "--border": "#dcdcdc"
        },

        "noche-suave": {
            "--bg": "#1e1f24",
            "--text": "#e6e6e6",
            "--surface": "#2a2c34",
            "--surface-2": "#23252c",
            "--nav-active": "#00b05e",
            "--nav-hover": "#00914d",
            "--primary": "#7aa2f7",
            "--primary-hover": "#5f8df0",
            "--accent": "#537cd4",
            "--border": "#3a3d46"
        },

        "alto-contraste": {
            "--bg": "#000000",
            "--text": "#ffffff",
            "--surface": "#000000",
            "--surface-2": "#0a0a0a",
            "--nav-active": "#00ff88",
            "--nav-hover": "#00ff88",
            "--primary": "#cc871f",
            "--primary-hover": "#c7821a",
            "--accent": "#b87614",
            "--border": "#ffffff"
        }
    };

    function applyTheme(name) {
        const theme = themes[name];
        if (!theme) return;

        for (const [key, value] of Object.entries(theme)) {
            root.style.setProperty(key, value);
        }

        localStorage.setItem("theme", name);
    }

    if (themeForm) {
        themeForm.addEventListener("change", (e) => {
            if (e.target.name === "theme") {
                applyTheme(e.target.value);
            }
        });
    }

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme && themes[savedTheme]) {
        const input = document.querySelector(`input[value="${savedTheme}"]`);
        if (input) input.checked = true;
        applyTheme(savedTheme);
    }

    // =========================
    // TOGGLE STOCK COLORS (GLOBAL)
    // =========================

    const toggle = document.getElementById('toggle-colors');

    function applyStockColors(enabled) {
        const stockCells = document.querySelectorAll('.stock-cell');

        stockCells.forEach(cell => {
            const stock = parseInt(cell.textContent.trim(), 10);

            // limpiar siempre
            cell.classList.remove('ok-stock', 'low-stock', 'critic-stock');

            // si está desactivado, no aplicar colores
            if (!enabled) return;

            if (stock > 25) {
                cell.classList.add('ok-stock');
            } else if (stock > 10) {
                cell.classList.add('low-stock');
            } else {
                cell.classList.add('critic-stock');
            }
        });
    }

    if (toggle) {
        const saved = localStorage.getItem('stockColorsEnabled') === 'true';

        toggle.checked = saved;
        applyStockColors(saved);

        toggle.addEventListener('change', () => {
            const enabled = toggle.checked;

            localStorage.setItem('stockColorsEnabled', enabled);
            applyStockColors(enabled);
        });
    }


});

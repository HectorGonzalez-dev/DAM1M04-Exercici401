document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // VALIDACIÓN FORMULARIO
    // =========================
    const form = document.getElementById('addProductForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            let valid = true;

            document.querySelectorAll('.error-message').forEach(el => {
                el.textContent = '';
            });

            const name = (form.productName?.value || form.name?.value || '').trim();
            if (!name) {
                document.getElementById('errorName').textContent = 'El nombre es obligatorio';
                valid = false;
            }

            const category = (form.category?.value || '').trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!category) {
                document.getElementById('errorCategory').textContent = 'La categoría es obligatoria';
                valid = false;
            } else if (category.includes('@') && !emailRegex.test(category)) {
                document.getElementById('errorCategory').textContent = 'Formato de email inválido';
                valid = false;
            }

            const priceValue = (form.price?.value || '').trim();
            const phoneRegex = /^[0-9+]{7,15}$/;
            const priceNumber = parseFloat(priceValue);

            if (!isNaN(priceNumber)) {
                if (priceNumber <= 0) {
                    document.getElementById('errorPrice').textContent = 'El precio debe ser mayor que 0';
                    valid = false;
                }
            }

            if (priceValue && !phoneRegex.test(priceValue)) {
                document.getElementById('errorPrice').textContent = 'Formato de teléfono inválido';
                valid = false;
            }

            if (!priceValue) {
                document.getElementById('errorPrice').textContent = 'Este campo es obligatorio';
                valid = false;
            }

            const stock = parseInt(form.stock?.value);
            if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
                document.getElementById('errorStock').textContent =
                    'El stock debe ser un número entero mayor o igual a 0';
                valid = false;
            }

            const active = form.active?.value;
            if (active !== "1" && active !== "0") {
                document.getElementById('errorActive').textContent =
                    'Seleccione si el producto está activo';
                valid = false;
            }

            if (!valid) e.preventDefault();
        });
    }

    // =========================
    // THEMES (AQUÍ VA TU MENÚ)
    // =========================

    const themeForm = document.querySelector(".theme-form");
    const root = document.documentElement;

    const themes = {
        claro: {
            "--bg": "#ffffff",
            "--text": "#363537",
            "--surface": "rgb(245 247 249)",
            "--surface-2": "#ffffff",
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

    const saved = localStorage.getItem("theme");
    if (saved && themes[saved]) {
        const input = document.querySelector(`input[value="${saved}"]`);
        if (input) input.checked = true;
        applyTheme(saved);
    }

});
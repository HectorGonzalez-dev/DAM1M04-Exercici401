// Validación combinada de formularios

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addProductForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        let valid = true;

        // Limpiar errores
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });

        // ===== Nombre (name / productName) =====
        const name = (form.productName?.value || form.name?.value || '').trim();
        if (!name) {
            document.getElementById('errorName').textContent = 'El nombre es obligatorio';
            valid = false;
        }

        // ===== Categoría (y posible email en primer formulario) =====
        const category = (form.category?.value || '').trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!category) {
            document.getElementById('errorCategory').textContent = 'La categoría es obligatoria';
            valid = false;
        } else {
            // Validación tipo email (solo si parece un email)
            if (category.includes('@') && !emailRegex.test(category)) {
                document.getElementById('errorCategory').textContent = 'Formato de email inválido';
                valid = false;
            }
        }

        // ===== Precio / Teléfono (campo compartido en ambos scripts) =====
        const priceValue = (form.price?.value || '').trim();

        const phoneRegex = /^[0-9+]{7,15}$/;
        const priceNumber = parseFloat(priceValue);

        // Validación como precio
        if (!isNaN(priceNumber)) {
            if (priceNumber <= 0) {
                document.getElementById('errorPrice').textContent = 'El precio debe ser mayor que 0';
                valid = false;
            }
        }

        // Validación como teléfono
        if (priceValue && !phoneRegex.test(priceValue)) {
            document.getElementById('errorPrice').textContent = 'Formato de teléfono inválido';
            valid = false;
        }

        // Obligatorio
        if (!priceValue) {
            document.getElementById('errorPrice').textContent = 'Este campo es obligatorio';
            valid = false;
        }

        // ===== Stock =====
        const stock = parseInt(form.stock?.value);
        if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
            document.getElementById('errorStock').textContent =
                'El stock debe ser un número entero mayor o igual a 0';
            valid = false;
        }

        // ===== Activo =====
        const active = form.active?.value;
        if (active !== "1" && active !== "0") {
            document.getElementById('errorActive').textContent =
                'Seleccione si el producto está activo';
            valid = false;
        }

        if (!valid) {
            e.preventDefault();
        }
    });
});

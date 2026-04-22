// Validación del formulario de cliente

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addProductForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        let valid = true;

        // Limpiar errores
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });

        // Nombre
        const name = form.name.value.trim();
        if (!name) {
            document.getElementById('errorName').textContent = 'El nombre es obligatorio';
            valid = false;
        }

        // Email (category)
        const email = form.category.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            document.getElementById('errorCategory').textContent = 'El email es obligatorio';
            valid = false;
        } else if (!emailRegex.test(email)) {
            document.getElementById('errorCategory').textContent = 'Formato de email inválido';
            valid = false;
        }

        // Teléfono (price)
        const phone = form.price.value.trim();
        const phoneRegex = /^[0-9+]{7,15}$/;
        if (!phone) {
            document.getElementById('errorPrice').textContent = 'El teléfono es obligatorio';
            valid = false;
        } else if (!phoneRegex.test(phone)) {
            document.getElementById('errorPrice').textContent = 'Formato de teléfono inválido';
            valid = false;
        }

        if (!valid) {
            e.preventDefault();
        }
    });
});

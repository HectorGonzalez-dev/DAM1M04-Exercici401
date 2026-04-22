// Validación del formulario de agregar producto

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('addProductForm');
    form.addEventListener('submit', function (e) {
        let valid = true;

        // Limpiar errores
        document.querySelectorAll('.error-message').forEach(div => div.textContent = "");

        // Nombre
        const name = form.productName.value.trim();
        if (!name) {
            document.getElementById('errorName').textContent = 'El nombre es obligatorio';
            valid = false;
        }

        // Categoría
        const category = form.category.value.trim();
        if (!category) {
            document.getElementById('errorCategory').textContent = 'La categoría es obligatoria';
            valid = false;
        }

        // Precio
        const price = parseFloat(form.price.value);
        if (isNaN(price) || price <= 0) {
            document.getElementById('errorPrice').textContent = 'El precio debe ser mayor que 0';
            valid = false;
        }

        // Stock
        const stock = parseInt(form.stock.value);
        if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
            document.getElementById('errorStock').textContent = 'El stock debe ser un número entero mayor o igual a 0';
            valid = false;
        }

        // Activo
        const active = form.active.value;
        if (active !== "1" && active !== "0") {
            document.getElementById('errorActive').textContent = 'Seleccione si el producto está activo';
            valid = false;
        }

        if (!valid) {
            e.preventDefault();
        }
    });
});

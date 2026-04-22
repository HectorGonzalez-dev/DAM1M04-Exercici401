const express = require('express');
const fs = require('fs');
const path = require('path');
const hbs = require('hbs');
const MySQL = require('./utilsMySQL');

const app = express();
const port = 3000;

// Detectar si estem al Proxmox (si és pm2)
const isProxmox = !!process.env.PM2_HOME;

// Iniciar connexió MySQL
const db = new MySQL();
if (!isProxmox) {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'alumnat',
    database: 'tienda'
  });
} else {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'super',
    password: '1234',
    database: 'tienda'
  });
}

// Static files - ONLY ONCE
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

// Disable cache
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Handlebars
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.set('view options', { layout: 'layouts/main' });

// Registrar "Helpers .hbs" aquí
hbs.registerHelper('eq', (a, b) => a == b);
hbs.registerHelper('gt', (a, b) => a > b);

// Partials de Handlebars
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Route
app.get('/', async (req, res) => {
  try {
    const todaySales = await db.query('SELECT COUNT(*) AS ventas_hoy FROM sales WHERE DATE(sale_date) = CURDATE()');
    const todayBilling = await db.query('SELECT COALESCE(SUM(total), 0) AS facturacion_hoy FROM sales WHERE DATE(sale_date) = CURDATE()');
    const todayAvgTicket = await db.query('SELECT COALESCE((SELECT ROUND(AVG(total),2) FROM sales WHERE DATE(sale_date)=CURDATE()),0) AS promedio_gastado_hoy');
    const todayBestProduct = await db.query(`
      SELECT COALESCE((
        SELECT p.name AS name
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        WHERE DATE(s.sale_date) = CURDATE()
        GROUP BY p.id, p.name
        ORDER BY SUM(si.qty) DESC
        LIMIT 1
      ), '-') AS product
  `);
    const todayBestCategory = await db.query(`
      SELECT COALESCE(
          (
              SELECT p.category
              FROM sales s
              JOIN sale_items si ON si.sale_id = s.id
              JOIN products p ON p.id = si.product_id
              WHERE DATE(s.sale_date) = CURDATE()
              GROUP BY p.category
              ORDER BY SUM(si.qty) DESC
              LIMIT 1
          ),
          '-'
      ) AS top_category
  `);
    const yesterdaySales = await db.query('SELECT COUNT(*) AS ventas_ayer FROM sales WHERE DATE(sale_date) = CURDATE() - INTERVAL 1 DAY');
    const yesterdayBilling = await db.query('SELECT COALESCE(SUM(total), 0) AS facturacion_ayer FROM sales WHERE DATE(sale_date) = CURDATE() - INTERVAL 1 DAY');
    const yesterdayAvgTicket = await db.query('SELECT COALESCE((SELECT ROUND(AVG(total),2) FROM sales WHERE DATE(sale_date)=CURDATE()-INTERVAL 1 DAY),0) AS promedio_gastado_ayer');
    const monthSales = await db.query('SELECT COUNT(*) AS ventas_mes FROM sales WHERE YEAR(sale_date) = YEAR(CURDATE()) AND MONTH(sale_date) = MONTH(CURDATE())');
    const monthBilling = await db.query('SELECT COALESCE(SUM(total), 0) AS facturacion_mes FROM sales WHERE YEAR(sale_date) = YEAR(CURDATE()) AND MONTH(sale_date) = MONTH(CURDATE())');
    const monthAvgTicket = await db.query('SELECT COALESCE((SELECT ROUND(AVG(total),2) FROM sales WHERE YEAR(sale_date)=YEAR(CURDATE()) AND MONTH(sale_date)=MONTH(CURDATE())),0) AS promedio_gastado_mes');
    const monthBestProduct = await db.query(`
      SELECT COALESCE((
        SELECT p.name AS name
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        WHERE YEAR(s.sale_date) = YEAR(CURDATE())
          AND MONTH(s.sale_date) = MONTH(CURDATE())
        GROUP BY p.id, p.name
        ORDER BY SUM(si.qty) DESC
        LIMIT 1
      ), '-') AS product
  `);
    const monthBestCategory = await db.query(`
      SELECT COALESCE((
        SELECT p.category
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        WHERE YEAR(s.sale_date) = YEAR(CURDATE())
          AND MONTH(s.sale_date) = MONTH(CURDATE())
        GROUP BY p.category
        ORDER BY SUM(si.qty) DESC
        LIMIT 1
      ), '-') AS category
  `);
    const pastMonthSales = await db.query('SELECT COUNT(*) AS ventas_mes FROM sales WHERE YEAR(sale_date) = YEAR(CURDATE() - INTERVAL 1 MONTH) AND MONTH(sale_date) = MONTH(CURDATE() - INTERVAL 1 MONTH)');
    const pastMonthBilling = await db.query('SELECT COALESCE(SUM(total), 0) AS facturacion_mes_pasado FROM sales WHERE YEAR(sale_date) = YEAR(CURDATE() - INTERVAL 1 MONTH) AND MONTH(sale_date) = MONTH(CURDATE() - INTERVAL 1 MONTH)');
    const pastMonthAvgTicket = await db.query('SELECT COALESCE((SELECT ROUND(AVG(total),2) FROM sales WHERE YEAR(sale_date)=YEAR(CURDATE()-INTERVAL 1 MONTH) AND MONTH(sale_date)=MONTH(CURDATE()-INTERVAL 1 MONTH)),0) AS promedio_gastado_mes_pasado');

    const lastSales = await db.query('SELECT DATE(s.sale_date) AS sale_date, c.name AS customer_name, ROUND(s.total,2) AS total FROM sales s LEFT JOIN customers c ON s.customer_id = c.id ORDER BY s.sale_date DESC LIMIT 5');
    const lastSalesJson = db.table_to_json(lastSales, { sale_date: 'date', customer_name: 'string', total: 'number' });

    const mostSoldProducts = await db.query('SELECT p.name AS name, p.category AS category, p.stock AS stock, SUM(si.qty) AS units_sold FROM sale_items si JOIN products p ON si.product_id = p.id GROUP BY p.id, p.name, p.category, p.stock ORDER BY units_sold DESC LIMIT 5');
    const mostSoldProductsJson = db.table_to_json(mostSoldProducts, { name: 'string', category: 'string', stock: 'number', units_sold: 'number' });

    const lowestStock = await db.query('SELECT id, name, category, price, stock, active FROM products ORDER BY stock ASC LIMIT 9');
    const lowestStockJson = db.table_to_json(lowestStock, { id: 'number', name: 'string', category: 'string', price: 'number', stock: 'number', active: 'number'});

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      common: commonData,
      last_sales: lastSalesJson,
      most_sold_products: mostSoldProductsJson,
      lowest_stock: lowestStockJson,
      today_sales: todaySales[0].ventas_hoy,
      today_billing: todayBilling[0].facturacion_hoy,
      today_avg_ticket: todayAvgTicket[0].promedio_gastado_hoy,
      today_best_product: todayBestProduct[0].product,
      today_best_category: todayBestCategory[0].top_category,
      yesterday_billing: yesterdayBilling[0].facturacion_ayer,
      yesterday_sales: yesterdaySales[0].ventas_ayer,
      yesterday_avg_ticket: yesterdayAvgTicket[0].promedio_gastado_ayer,
      month_sales: monthSales[0].ventas_mes,
      month_billing: monthBilling[0].facturacion_mes,
      month_avg_ticket: monthAvgTicket[0].promedio_gastado_mes,
      month_best_product: monthBestProduct[0].product,
      month_best_category: monthBestCategory[0].category,
      past_month_sales: pastMonthSales[0].ventas_mes,
      past_month_billing: pastMonthBilling[0].facturacion_mes_pasado,
      past_month_avg_ticket: pastMonthAvgTicket[0].promedio_gastado_mes_pasado
    };

    // Renderitzar la plantilla amb les dades
    res.render('index', {
        ...data,
        currentPage: 'Dashboard',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

app.get('/products', async (req, res) => {
  try {
    const pageNum = parseInt(req.query.page, 10)
    const searchString = req.query.search || "";

    if (!Number.isInteger(pageNum) || pageNum <= 0) {
      return res.status(400).send('Paràmetre id invàlid')
    }

    let pageProducts;
    let totalProducts;
    const offset = (pageNum - 1) * 10;

    if (searchString.trim() === "") {
        // Sin búsqueda
        totalProducts = await db.query('SELECT COUNT(*) AS total FROM products');
        pageProducts = await db.query(`
          SELECT id, name, category, price, stock, active
          FROM products
          ORDER BY id
          LIMIT 10 OFFSET ${offset}
        `);
    } else {
        // Con búsqueda
        totalProducts = await db.query(`
          SELECT COUNT(*) AS total FROM products
          WHERE LOWER(name) LIKE LOWER('%${searchString}%')
            OR LOWER(category) LIKE LOWER('%${searchString}%')
        `);
        pageProducts = await db.query(`
          SELECT id, name, category, price, stock, active
          FROM products
          WHERE LOWER(name) LIKE LOWER('%${searchString}%')
            OR LOWER(category) LIKE LOWER('%${searchString}%')
          LIMIT 10 OFFSET ${offset}
        `);
    }
    const totalPages = Math.ceil(Number(totalProducts[0].total) / 10);

    const pageProductsJson = db.table_to_json(pageProducts, { id: 'number', name: 'string', category: 'string', price: 'number', stock: 'number', active: 'number' });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      common: commonData,
      page_products: pageProductsJson,
      page_num: pageNum,
      search_string: searchString,
      prev_page: pageNum - 1,
      next_page: pageNum + 1,
      total_pages: totalPages
    };

    // Renderitzar la plantilla amb les dades
    res.render('products', {
        ...data,
        currentPage: 'Productos',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Mostrar formulario para agregar producto
app.get('/productAdd', (req, res) => {
  // Leer datos comunes
  const commonData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
  );
  res.render('productAdd', {
    common: commonData,
    currentPage: 'Agregar producto',
  });
});

// Crear producto
app.post('/createProduct', async (req, res) => {
  try {
    const { name, category, price, stock, active } = req.body;
    // Validación básica en backend
    const errors = {};
    if (!name || !name.trim()) errors.name = 'El nombre es obligatorio';
    if (!category || !category.trim()) errors.category = 'La categoría es obligatoria';
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) errors.price = 'El precio debe ser mayor que 0';
    const stockNum = parseInt(stock);
    if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) errors.stock = 'El stock debe ser un número entero mayor o igual a 0';
    if (active !== '1' && active !== '0') errors.active = 'Seleccione si el producto está activo';

    if (Object.keys(errors).length > 0) {
      // Si hay errores, volver al formulario con errores
      const commonData = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
      );
      return res.status(400).render('productAdd', {
        common: commonData,
        currentPage: 'Agregar producto',
        errors,
        form: { name, category, price, stock, active }
      });
    }

    // Insertar en la base de datos
    await db.query(
      `INSERT INTO products (name, category, price, stock, active) VALUES ('${name.trim()}', '${category.trim()}', ${priceNum}, ${stockNum}, ${Number(active)})`
    );
    res.redirect('/products?page=1');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear el producto');
  }
});

// Mostrar formulario para agregar producto
app.get('/productEdit', async (req, res) => {
  try {
    const prodID = parseInt(req.query.id, 10)

    if (!Number.isInteger(prodID) || prodID <= 0) {
      return res.status(400).send('Paràmetre id invàlid')
    }

    const prodInfo = await db.query(`SELECT name, category, price, stock, active FROM products WHERE id=${prodID}`);
    const prodInfoJson = db.table_to_json(prodInfo, { name: 'string', category: 'string', price: 'number', stock: 'number', active: 'number' });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      common: commonData,
      prod_info: prodInfoJson[0],
      prod_id: prodID
    };

    // Renderitzar la plantilla amb les dades
    res.render('productEdit', {
        ...data,
        currentPage: 'Editar producto',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Editar producto
app.post('/editProduct', async (req, res) => {
  try {
    const id = parseInt(req.body.id, 10)
    const name = req.body.name
    const category = req.body.category
    const price = parseFloat(req.body.price)
    const stock = parseInt(req.body.stock, 10)
    const active = parseInt(req.body.active, 10)
    // Validación básica en backend
    const errors = {};
    if (!name || !name.trim()) errors.name = 'El nombre es obligatorio';
    if (!category || !category.trim()) errors.category = 'La categoría es obligatoria';
    if (isNaN(price) || price <= 0) errors.price = 'El precio debe ser mayor que 0';
    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) errors.stock = 'El stock debe ser un número entero mayor o igual a 0';
    if (active !== 1 && active !== 0) errors.active = 'Seleccione si el producto está activo';

    if (Object.keys(errors).length > 0) {
      // Si hay errores, volver al formulario con errores
      const commonData = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
      );
      return res.status(400).render('productEdit', {
        common: commonData,
        currentPage: 'Editar producto',
        errors,
        form: { name, category, price, stock, active }
      });
    }

    // Insertar en la base de datos
    await db.query(`
      UPDATE products
      SET name = "${name}", category = "${category}", price = ${price}, stock = ${stock}, active = ${active}
      WHERE id = ${id}
    `)
    res.redirect('/products?page=1');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al editar el producto');
  }
});

app.post('/deleteProduct', async (req, res) => {
  try {

    const id = parseInt(req.body.id, 10)

    // Basic validation
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).send('ID invalida')
    }

    await db.query(`DELETE FROM sale_items WHERE product_id = ${id}`)
    await db.query(`DELETE FROM products WHERE id = ${id}`)

    res.redirect('/products?page=1')

  } catch (err) {
    console.error(err)
    res.status(500).send('Error esborrant el producte')
  }
})

// -------------------------------------------------
// Clientes
// -------------------------------------------------

app.get('/clients', async (req, res) => {
  try {
    const pageNum = parseInt(req.query.page, 10)
    const searchString = req.query.search || "";

    if (!Number.isInteger(pageNum) || pageNum <= 0) {
      return res.status(400).send('Paràmetre id invàlid')
    }

    let pageProducts;
    let totalProducts;
    const offset = (pageNum - 1) * 10;

    if (searchString.trim() === "") {
        // Sin búsqueda
        totalProducts = await db.query('SELECT COUNT(*) AS total FROM customers');
        pageProducts = await db.query(`
          SELECT 
              c.id AS id,
              c.name AS nombre,
              c.email AS email,
              c.phone AS telefono,
              COUNT(s.id) AS numero_compras,
              COALESCE(SUM(s.total), 0) AS total_gastado
          FROM customers c
          LEFT JOIN sales s ON c.id = s.customer_id
          GROUP BY c.id, c.name, c.email, c.phone
          ORDER BY total_gastado DESC
          LIMIT 10 OFFSET ${offset}
        `);
    } else {
        // Con búsqueda
        totalProducts = await db.query(`
          SELECT COUNT(*) AS total FROM customers
          WHERE LOWER(name) LIKE LOWER('%${searchString}%')
            OR LOWER(email) LIKE LOWER('%${searchString}%')
        `);
        pageProducts = await db.query(`
          SELECT
              c.id AS id,
              c.name AS nombre,
              c.email AS email,
              c.phone AS telefono,
              COUNT(s.id) AS numero_compras,
              COALESCE(SUM(s.total), 0) AS total_gastado
          FROM customers c
          LEFT JOIN sales s ON c.id = s.customer_id
          WHERE 
              LOWER(c.name) LIKE LOWER('%${searchString}%')
              OR LOWER(c.email) LIKE LOWER('%${searchString}%')
          GROUP BY c.id, c.name, c.email, c.phone
          ORDER BY total_gastado DESC
          LIMIT 10 OFFSET ${offset}
        `);
    }
    const totalPages = Math.ceil(Number(totalProducts[0].total) / 10);

    const pageProductsJson = db.table_to_json(pageProducts, { id: 'number', nombre: 'string', email: 'string', telefono: 'string', numero_compras: 'number', total_gastado: 'number' });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      common: commonData,
      page_products: pageProductsJson,
      page_num: pageNum,
      search_string: searchString,
      prev_page: pageNum - 1,
      next_page: pageNum + 1,
      total_pages: totalPages
    };

    // Renderitzar la plantilla amb les dades
    res.render('clients', {
        ...data,
        currentPage: 'Clientes',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Mostrar formulario para agregar producto
app.get('/clientAdd', (req, res) => {
  // Leer datos comunes
  const commonData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
  );
  res.render('clientAdd', {
    common: commonData,
    currentPage: 'Agregar cliente',
  });
});

// Crear producto
app.post('/createClient', async (req, res) => {
  try {
    const { name, category, price} = req.body;

    const errors = {};

    // Nombre
    if (!name || !name.trim()) {
      errors.name = 'El nombre es obligatorio';
    }

    // Email
    const email = category?.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.category = 'El email es obligatorio';
    } else if (!emailRegex.test(email)) {
      errors.category = 'El formato del email no es válido';
    }

    // Teléfono
    const phone = price?.trim();
    const phoneRegex = /^[0-9+]{7,15}$/;
    if (!phone) {
      errors.price = 'El teléfono es obligatorio';
    } else if (!phoneRegex.test(phone)) {
      errors.price = 'El formato del teléfono no es válido';
    }

    // Si hay errores
    if (Object.keys(errors).length > 0) {
      const commonData = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
      );

      return res.status(400).render('clientAdd', {
        common: commonData,
        currentPage: 'Agregar cliente',
        errors,
        form: { name, category, price }
      });
    }

    await db.query(`INSERT INTO customers (name, email, phone) VALUES ('${name.trim()}', '${email}', '${phone}')`);

    res.redirect('/clients?page=1');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear el producto');
  }
});

// Mostrar formulario para agregar producto
app.get('/clientEdit', async (req, res) => {
  try {
    const prodID = parseInt(req.query.id, 10)

    if (!Number.isInteger(prodID) || prodID <= 0) {
      return res.status(400).send('Paràmetre id invàlid')
    }

    const prodInfo = await db.query(`SELECT name, email, phone FROM customers WHERE id=${prodID}`);
    const prodInfoJson = db.table_to_json(prodInfo, { name: 'string', email: 'string', phone: 'number' });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      common: commonData,
      prod_info: prodInfoJson[0],
      prod_id: prodID
    };

    // Renderitzar la plantilla amb les dades
    res.render('clientEdit', {
        ...data,
        currentPage: 'Editar cliente',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Editar producto
app.post('/editClient', async (req, res) => {
  try {
    const id = parseInt(req.body.id, 10)
    const name = req.body.name
    const email = req.body.category
    const phone = req.body.price
    // Validación básica en backend
    const errors = {};
    // Nombre
    if (!name || !name.trim()) {
      errors.name = 'El nombre es obligatorio';
    }

    // Email
    const emailTrim = email?.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailTrim) {
      errors.category = 'El email es obligatorio';
    } else if (!emailRegex.test(emailTrim)) {
      errors.category = 'El formato del email no es válido';
    }

    // Teléfono
    const phoneTrim = phone?.trim();
    const phoneRegex = /^[0-9+]{7,15}$/;

    if (!phoneTrim) {
      errors.price = 'El teléfono es obligatorio';
    } else if (!phoneRegex.test(phoneTrim)) {
      errors.price = 'El formato del teléfono no es válido';
    }

    if (Object.keys(errors).length > 0) {
      // Si hay errores, volver al formulario con errores
      const commonData = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
      );
      return res.status(400).render('clientEdit', {
        common: commonData,
        currentPage: 'Editar cliente',
        errors,
        form: { name, email, phone }
      });
    }

    // Insertar en la base de datos
    await db.query(`
      UPDATE customers
      SET name = "${name}", email = "${email}", phone = ${phone}
      WHERE id = ${id}
    `)
    res.redirect('/clients?page=1');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al editar el producto');
  }
});

app.post('/deleteClient', async (req, res) => {
  try {

    const id = parseInt(req.body.id, 10)

    // Basic validation
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).send('ID invalida')
    }

    await db.query(`DELETE FROM customers WHERE id = ${id}`)

    res.redirect('/clients?page=1')

  } catch (err) {
    console.error(err)
    res.status(500).send('Error esborrant el producte')
  }
})

// Start server
const httpServer = app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.end();
  httpServer.close();
  process.exit(0);
});
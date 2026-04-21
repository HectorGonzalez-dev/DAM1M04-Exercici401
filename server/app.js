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

    const lowestStock = await db.query('SELECT id, name, category, price, stock FROM products ORDER BY stock ASC LIMIT 5');
    const lowestStockJson = db.table_to_json(lowestStock, { id: 'number', name: 'string', category: 'string', price: 'number', stock: 'number'});

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
    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      common: commonData
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
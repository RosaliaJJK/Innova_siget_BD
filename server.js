const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const http = require('http');              // 👈 NUEVO
const { Server } = require('socket.io');   // 👈 NUEVO

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* =========================
   SESIONES
========================= */
app.use(session({
  secret: 'innova_siget_secret',
  resave: false,
  saveUninitialized: false
}));

/* =========================
   VISTAS
========================= */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* =========================
   BD
========================= */
const db = mysql.createConnection({
  host: 'shortline.proxy.rlwy.net',
  port: 28959,
  user: 'root',
  password: 'bnDkixOQGBHdOUbZnrbXsgiePjvfJBxa',
  database: 'railway'
});

db.connect(err => {
  if (err) console.error('❌ Error MySQL:', err);
  else console.log('✅ MySQL conectado');
});

/* 👉 INYECTAR DB */
app.use((req, res, next) => {
  req.db = db;
  next();
});

/* =========================
   RUTAS
========================= */
app.use('/auth', require('./routes/auth'));
app.use('/alumno', require('./routes/alumno'));
app.use('/docente', require('./routes/docente'));
app.use('/personal', require('./routes/personal'));

/* =========================
   LOGIN
========================= */
app.get('/', (req, res) => {
  res.render('login');
});

/* =========================
   SOCKET.IO (TIEMPO REAL)
========================= */
const server = http.createServer(app);
const io = new Server(server);

app.set("io", io); // 👈 PERMITE USAR io EN RUTAS

io.on("connection", (socket) => {
  console.log("🟢 Usuario conectado al tiempo real");

  socket.on("disconnect", () => {
    console.log("🔴 Usuario desconectado");
  });
});

/* =========================
   SERVIDOR
========================= */
server.listen(3000, () => {
  console.log('🚀 http://localhost:3000 (Tiempo real activo)');
});

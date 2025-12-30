const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

/* =========================
   LOGOUT
========================= */
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

/* =========================
   LISTAS BLANCAS
========================= */
const PERSONAL_ADMIN = [
  'direccion@teschi.edu.mx',
  'personalinnova013@gmail.com'
];

const MANTENIMIENTO = [
  'ciencias_basicas@teschi.edu.mx',
  'mantenimientoinnova088@gmail.com'
];

const DOCENTES_ESPECIALES = [
  'docenteinnova074@gmail.com'
];

/* =========================
   DETECTAR ROL
========================= */
function detectarRol(email) {
  email = email.toLowerCase().trim();

  if (MANTENIMIENTO.includes(email)) return 'TECNICO';
  if (PERSONAL_ADMIN.includes(email)) return 'PERSONAL';
  if (DOCENTES_ESPECIALES.includes(email)) return 'DOCENTE';

  if (/^[0-9]{10}@teschi\.edu\.mx$/.test(email)) return 'ALUMNO';
  if (/^[a-z]+@teschi\.edu\.mx$/.test(email)) return 'DOCENTE';
  if (/^[a-z0-9._]+@teschi\.edu\.mx$/.test(email)) return 'PERSONAL';

  return null;
}

/* =========================
   VALIDACIÓN CONTRASEÑA
========================= */
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

/* =========================
   REGISTRO
========================= */
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  const db = req.db;

  if (!nombre || !email || !password) {
    return res.send(`
      <script>
        alert('Todos los campos son obligatorios');
        window.location = '/';
      </script>
    `);
  }

  const rol = detectarRol(email);
  if (!rol) {
    return res.send(`
      <script>
        alert('Correo institucional no autorizado');
        window.location = '/';
      </script>
    `);
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.send(`
      <script>
        alert('La contraseña debe tener mínimo 6 caracteres, una mayúscula, un número y un símbolo');
        window.location = '/';
      </script>
    `);
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO usuarios (nombre, email, rol, password) VALUES (?, ?, ?, ?)',
      [nombre, email, rol, hash],
      err => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.send(`
              <script>
                alert('Este correo ya está registrado');
                window.location = '/';
              </script>
            `);
          }

          console.error(err);
          return res.send(`
            <script>
              alert('Error al registrar usuario');
              window.location = '/';
            </script>
          `);
        }

        res.send(`
          <script>
            alert('Registro exitoso. Ahora inicia sesión');
            window.location = '/';
          </script>
        `);
      }
    );
  } catch (err) {
    console.error(err);
    res.send(`
      <script>
        alert('Error del servidor');
        window.location = '/';
      </script>
    `);
  }
});

/* =========================
   LOGIN
========================= */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = req.db;

  db.query(
    'SELECT * FROM usuarios WHERE email = ?',
    [email],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.send(`
          <script>
            alert('Credenciales incorrectas');
            window.location = '/';
          </script>
        `);
      }

      const user = results[0];
      const ok = await bcrypt.compare(password, user.password);

      if (!ok) {
        return res.send(`
          <script>
            alert('Credenciales incorrectas');
            window.location = '/';
          </script>
        `);
      }

      req.session.user = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      };

      // Redirección por rol
      if (user.rol === 'ALUMNO') return res.redirect('/alumno');
      if (user.rol === 'DOCENTE') return res.redirect('/docente');
      if (user.rol === 'PERSONAL') return res.redirect('/personal');
      if (user.rol === 'TECNICO') return res.redirect('/mantenimiento');

      res.redirect('/');
    }
  );
});

module.exports = router;

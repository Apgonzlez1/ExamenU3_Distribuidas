const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketio = require('socket.io');
require('dotenv').config();

// Middleware de autenticación JWT
const verificarToken = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cookieParser());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

// Middleware para proteger rutas estáticas
function protegerRutas(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect('/'); // Si no hay token, va a la página de login
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.redirect('/');
    req.user = user;
    next();
  });
}

// Redirigir "/" a "/tablero.html" solo si está autenticado
app.get('/', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    // Mostrar página estática con login (por ejemplo login.html)
    return res.sendFile(__dirname + '/public/login.html');
  }
  jwt.verify(token, process.env.JWT_SECRET, (err) => {
    if (err) {
      return res.sendFile(__dirname + '/public/login.html');
    }
    res.redirect('/tablero.html');
  });
});

// Proteger la ruta tablero.html
app.get('/tablero.html', protegerRutas, (req, res) => {
  res.sendFile(__dirname + '/public/tablero.html');
});

// Google OAuth 2.0 config
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, name: req.user.displayName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/tablero.html');
  }
);

// API protegida con JWT (ejemplo)
app.get('/api/profile', verificarToken, (req, res) => {
  res.json({ mensaje: 'Perfil de usuario', usuario: req.user });
});

// Socket.io - tablero de ideas
let ideas = [];

io.on('connection', (socket) => {
  console.log('Usuario conectado');
  socket.emit('ideas', ideas);

  socket.on('nueva_idea', (idea) => {
    ideas.push(idea);
    io.emit('ideas', ideas);
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});

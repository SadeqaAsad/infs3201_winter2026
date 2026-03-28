const express = require('express');
const { engine } = require('express-handlebars');
const crypto = require('crypto');
const business = require('./business');
const persistence = require('./Persistence');

const app = express();
const PORT = 8000;

// In-memory session store: { sessionId: { username, expiresAt } }
const sessions = {};

// Set up Handlebars as the view engine
app.engine('handlebars', engine({ extname: '.handlebars' }));
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/templates');

// Middleware to parse form data
app.use(express.urlencoded({ extended: false }));

/**
 * Generates a random session ID string.
 *
 * @returns {string} A random hex session ID
 */
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a plain text password using SHA-256.
 *
 * @param {string} password - The plain text password
 * @returns {string} The SHA-256 hex hash of the password
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Middleware: Logs every request to the security_log collection in MongoDB.
 * Records timestamp, username (if known), URL, and HTTP method.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function securityLogger(req, res, next) {
    const sessionId = req.headers.cookie ? req.headers.cookie.replace('sessionId=', '') : null;
    let username = null;

    if (sessionId && sessions[sessionId]) {
        username = sessions[sessionId].username;
    }

    await persistence.logAccess({
        timestamp: new Date(),
        username: username,
        url: req.url,
        method: req.method
    });

    next();
}

/**
 * Middleware: Protects all routes except /login and /logout.
 * If no valid session exists, redirects the user to /login.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAuth(req, res, next) {
    if (req.path === '/login' || req.path === '/logout') {
        return next();
    }

    const sessionId = req.headers.cookie ? req.headers.cookie.replace('sessionId=', '') : null;

    if (!sessionId || !sessions[sessionId]) {
        return res.redirect('/login?message=Please log in to continue');
    }

    if (sessions[sessionId].expiresAt < Date.now()) {
        delete sessions[sessionId];
        return res.redirect('/login?message=Session expired. Please log in again');
    }

    // Extend session by 5 minutes on every visit
    sessions[sessionId].expiresAt = Date.now() + 5 * 60 * 1000;
    res.setHeader('Set-Cookie', 'sessionId=' + sessionId + '; HttpOnly; Max-Age=300');

    next();
}

// Apply middleware globally
app.use(securityLogger);
app.use(requireAuth);

/**
 * GET /login
 * Displays the login page with an optional message.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.get('/login', (req, res) => {
    const message = req.query.message || null;
    res.render('login', { message: message, layout: false });
});

/**
 * POST /login
 * Handles login form submission.
 * Validates credentials and creates a session on success.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.post('/login', async (req, res) => {
    const username = req.body.username ? req.body.username.trim() : '';
    const password = req.body.password ? req.body.password.trim() : '';

    const hashed = hashPassword(password);
    const user = await persistence.findUser(username, hashed);

    if (!user) {
        return res.redirect('/login?message=Invalid username or password');
    }

    const sessionId = generateSessionId();
    sessions[sessionId] = {
        username: username,
        expiresAt: Date.now() + 5 * 60 * 1000
    };

    res.setHeader('Set-Cookie', 'sessionId=' + sessionId + '; HttpOnly; Max-Age=300');
    res.redirect('/');
});

/**
 * GET /logout
 * Clears the session and cookie, then redirects to login.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.get('/logout', (req, res) => {
    const sessionId = req.headers.cookie ? req.headers.cookie.replace('sessionId=', '') : null;

    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
    }

    res.setHeader('Set-Cookie', 'sessionId=; HttpOnly; Max-Age=0');
    res.redirect('/login?message=You have been logged out');
});

/**
 * GET /
 * Landing page - displays a list of all employees.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
app.get('/', async (req, res) => {
    const employees = await business.getEmployeeList();
    res.render('index', { employees: employees, layout: false });
});

/**
 * GET /employee/:id
 * Employee details page - shows employee info and their shifts.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
app.get('/employee/:id', async (req, res) => {
    const employee = await business.findEmployee(req.params.id);

    if (!employee) {
        res.send('Employee not found');
        return;
    }

    const schedule = await business.getEmployeeSchedule(req.params.id);

    // Mark shifts before 12:00pm for yellow highlight
    for (let i = 0; i < schedule.length; i++) {
        const hour = parseInt(schedule[i].startTime.split(':')[0], 10);
        if (hour < 12) {
            schedule[i].isMorning = true;
        }
    }

    res.render('employee', { employee: employee, schedule: schedule, layout: false });
});

/**
 * GET /edit/:id
 * Edit employee form - prefilled with current employee details.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
app.get('/edit/:id', async (req, res) => {
    const employee = await business.findEmployee(req.params.id);

    if (!employee) {
        res.send('Employee not found');
        return;
    }

    res.render('edit', { employee: employee, layout: false });
});

/**
 * POST /edit/:id
 * Handles the edit form submission.
 * Validates input server-side, updates the database, then redirects (PRG pattern).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
app.post('/edit/:id', async (req, res) => {
    const name = req.body.name.trim();
    const phone = req.body.phone.trim();
    const id = req.params.id;

    // Server-side validation
    if (!name) {
        res.send('Name must not be empty');
        return;
    }

    const phoneRegex = /^\d{4}-\d{4}$/;
    if (!phoneRegex.test(phone)) {
        res.send('Phone number must be in the format ####-####');
        return;
    }

    await business.updateEmployee(id, name, phone);

    // PRG pattern - redirect to landing page after successful update
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});
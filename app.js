const express = require('express');
const { engine } = require('express-handlebars');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const business = require('./business');
const persistence = require('./Persistence');
const emailSystem = require('./emailSystem');

const app = express();
const PORT = 8000;

// Directory where employee documents are stored (outside public static folder)
const DOCUMENTS_DIR = path.join(__dirname, 'employee_docs');
if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR);
}

// Fully authenticated sessions: { sessionId: { username, expiresAt } }
const sessions = {};

// Pending 2FA sessions (password correct but code not yet entered)
const pendingSessions = {};

// ─── Multer file upload config ────────────────────────────────────────────────

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, DOCUMENTS_DIR);
    },
    filename: function (req, file, cb) {
        const safe = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, safe);
    }
});

/**
 * Multer file filter - only allows PDF files.
 *
 * @param {import('express').Request} req
 * @param {Express.Multer.File} file
 * @param {Function} cb
 */
function pdfFilter(req, file, cb) {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are permitted'), false);
    }
}

const upload = multer({
    storage: storage,
    fileFilter: pdfFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
});

// ─── View Engine ──────────────────────────────────────────────────────────────

app.engine('handlebars', engine({ extname: '.handlebars' }));
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/templates');

app.use(express.urlencoded({ extended: false }));

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random session ID.
 *
 * @returns {string} A 64-character hex session ID
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
 * Generates a random 6-digit 2FA code as a zero-padded string.
 *
 * @returns {string} A 6-digit code string
 */
function generate2FACode() {
    const num = Math.floor(Math.random() * 1000000);
    let code = String(num);
    while (code.length < 6) {
        code = '0' + code;
    }
    return code;
}

/**
 * Extracts the session ID from the request cookie header.
 *
 * @param {import('express').Request} req
 * @returns {string|null} The session ID string, or null if absent
 */
function getSessionId(req) {
    if (!req.headers.cookie) {
        return null;
    }
    const cookies = req.headers.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const parts = cookies[i].trim().split('=');
        if (parts[0] === 'sessionId') {
            return parts[1];
        }
    }
    return null;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Middleware: Logs every request to the security_log collection in MongoDB.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function securityLogger(req, res, next) {
    const sessionId = getSessionId(req);
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
 * Middleware: Protects all routes except /login, /logout, and /2fa.
 * Redirects unauthenticated users to /login.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAuth(req, res, next) {
    if (
        req.path === '/login' ||
        req.path === '/logout' ||
        req.path.startsWith('/2fa')
    ) {
        return next();
    }

    const sessionId = getSessionId(req);

    if (!sessionId || !sessions[sessionId]) {
        return res.redirect('/login?message=Please log in to continue');
    }

    if (sessions[sessionId].expiresAt < Date.now()) {
        delete sessions[sessionId];
        return res.redirect('/login?message=Session expired. Please log in again');
    }

    sessions[sessionId].expiresAt = Date.now() + 5 * 60 * 1000;
    res.setHeader('Set-Cookie', 'sessionId=' + sessionId + '; HttpOnly; Max-Age=300');

    next();
}

app.use(securityLogger);
app.use(requireAuth);

// ─── Auth Routes ──────────────────────────────────────────────────────────────

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
 * Validates credentials. On success generates a 2FA code and redirects to /2fa.
 * Tracks failed attempts - warning email at 3, account locked at 10.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.post('/login', async (req, res) => {
    const username = req.body.username ? req.body.username.trim() : '';
    const password = req.body.password ? req.body.password.trim() : '';

    const userRecord = await persistence.findUserByUsername(username);

    if (!userRecord) {
        return res.redirect('/login?message=Invalid username or password');
    }

    if (userRecord.locked) {
        return res.redirect('/login?message=Your account has been locked. Please contact an administrator.');
    }

    const hashed = hashPassword(password);
    const validUser = await persistence.findUser(username, hashed);

    if (!validUser) {
        await persistence.incrementFailedAttempts(username);

        const updated = await persistence.findUserByUsername(username);
        const attempts = updated.failedAttempts || 0;

        if (attempts >= 10) {
            await persistence.lockAccount(username);
            await emailSystem.sendAccountLockedEmail(updated.email || username, username);
            return res.redirect('/login?message=Your account has been locked due to too many failed attempts.');
        }

        if (attempts >= 3) {
            await emailSystem.sendSuspiciousActivityWarning(updated.email || username, username);
        }

        return res.redirect('/login?message=Invalid username or password');
    }

    const code = generate2FACode();
    const pendingId = generateSessionId();

    pendingSessions[pendingId] = {
        username: username,
        code: code,
        expiresAt: Date.now() + 3 * 60 * 1000
    };

    await emailSystem.send2FACode(validUser.email || username, code);

    res.setHeader('Set-Cookie', 'pendingId=' + pendingId + '; HttpOnly; Max-Age=180');
    res.redirect('/2fa');
});

/**
 * GET /2fa
 * Displays the 2FA code entry page.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.get('/2fa', (req, res) => {
    const message = req.query.message || null;
    res.render('2fa', { message: message, layout: false });
});

/**
 * POST /2fa
 * Validates the submitted 2FA code.
 * On success creates the authenticated session and resets failed attempt counter.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.post('/2fa', async (req, res) => {
    let pendingId = null;

    if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const parts = cookies[i].trim().split('=');
            if (parts[0] === 'pendingId') {
                pendingId = parts[1];
                break;
            }
        }
    }

    if (!pendingId || !pendingSessions[pendingId]) {
        return res.redirect('/login?message=Session expired. Please log in again.');
    }

    const pending = pendingSessions[pendingId];

    if (pending.expiresAt < Date.now()) {
        delete pendingSessions[pendingId];
        return res.redirect('/login?message=2FA code expired. Please log in again.');
    }

    const enteredCode = req.body.code ? req.body.code.trim() : '';

    if (enteredCode !== pending.code) {
        return res.redirect('/2fa?message=Invalid code. Please try again.');
    }

    const username = pending.username;
    delete pendingSessions[pendingId];

    const sessionId = generateSessionId();
    sessions[sessionId] = {
        username: username,
        expiresAt: Date.now() + 5 * 60 * 1000
    };

    await persistence.resetFailedAttempts(username);

    res.setHeader('Set-Cookie', [
        'pendingId=; HttpOnly; Max-Age=0',
        'sessionId=' + sessionId + '; HttpOnly; Max-Age=300'
    ]);
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
    const sessionId = getSessionId(req);

    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
    }

    res.setHeader('Set-Cookie', 'sessionId=; HttpOnly; Max-Age=0');
    res.redirect('/login?message=You have been logged out');
});

// ─── Main Application Routes ──────────────────────────────────────────────────

/**
 * GET /
 * Landing page - displays a list of all employees.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.get('/', async (req, res) => {
    const employees = await business.getEmployeeList();
    res.render('index', { employees: employees, layout: false });
});

/**
 * GET /employee/:id
 * Employee details page - shows info, schedule, and uploaded documents.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.get('/employee/:id', async (req, res) => {
    const employee = await business.findEmployee(req.params.id);

    if (!employee) {
        res.send('Employee not found');
        return;
    }

    const schedule = await business.getEmployeeSchedule(req.params.id);

    for (let i = 0; i < schedule.length; i++) {
        const hour = parseInt(schedule[i].startTime.split(':')[0], 10);
        if (hour < 12) {
            schedule[i].isMorning = true;
        }
    }

    const documents = await business.getEmployeeDocuments(req.params.id);
    const uploadMessage = req.query.uploadMessage || null;
    const uploadError = req.query.uploadError || null;

    res.render('employee', {
        employee: employee,
        schedule: schedule,
        documents: documents,
        uploadMessage: uploadMessage,
        uploadError: uploadError,
        layout: false
    });
});

/**
 * GET /edit/:id
 * Edit employee form - prefilled with current employee details.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
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
 * Handles edit form submission. Validates input then updates the database.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.post('/edit/:id', async (req, res) => {
    const name = req.body.name.trim();
    const phone = req.body.phone.trim();
    const id = req.params.id;

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
    res.redirect('/');
});

// ─── Document Routes ──────────────────────────────────────────────────────────

/**
 * POST /employee/:id/upload
 * Accepts a PDF upload for the given employee.
 * Enforces: PDF only, max 2MB, max 5 documents per employee.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.post('/employee/:id/upload', async (req, res) => {
    const employeeId = req.params.id;

    const count = await business.countEmployeeDocuments(employeeId);
    if (count >= 5) {
        return res.redirect('/employee/' + employeeId + '?uploadError=Maximum of 5 documents allowed per employee.');
    }

    const singleUpload = upload.single('document');

    singleUpload(req, res, async function (err) {
        if (err) {
            let msg = 'Upload failed.';
            if (err.code === 'LIMIT_FILE_SIZE') {
                msg = 'File must not exceed 2 MB.';
            } else if (err.message === 'Only PDF files are permitted') {
                msg = 'Only PDF files are permitted.';
            }
            return res.redirect('/employee/' + employeeId + '?uploadError=' + encodeURIComponent(msg));
        }

        if (!req.file) {
            return res.redirect('/employee/' + employeeId + '?uploadError=No file selected.');
        }

        await business.saveDocumentMeta(employeeId, req.file.filename, req.file.originalname);
        return res.redirect('/employee/' + employeeId + '?uploadMessage=Document uploaded successfully.');
    });
});

/**
 * GET /documents/:docId
 * Serves a protected document file. Requires an active session.
 * Not accessible via any public static route.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.get('/documents/:docId', async (req, res) => {
    const doc = await business.findDocumentById(req.params.docId);

    if (!doc) {
        res.status(404).send('Document not found');
        return;
    }

    const filePath = path.join(DOCUMENTS_DIR, doc.filename);

    if (!fs.existsSync(filePath)) {
        res.status(404).send('File not found on disk');
        return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + doc.originalName + '"');
    fs.createReadStream(filePath).pipe(res);
});

/**
 * POST /documents/:docId/delete
 * Deletes a document from disk and its metadata from the database.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
app.post('/documents/:docId/delete', async (req, res) => {
    const doc = await business.findDocumentById(req.params.docId);

    if (!doc) {
        res.status(404).send('Document not found');
        return;
    }

    const filePath = path.join(DOCUMENTS_DIR, doc.filename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    await business.deleteDocumentRecord(req.params.docId);
    res.redirect('/employee/' + doc.employeeId + '?uploadMessage=Document deleted successfully.');
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});
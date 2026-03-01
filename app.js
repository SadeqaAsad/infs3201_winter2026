const express = require('express');
const { engine } = require('express-handlebars');
const business = require('./business');

const app = express();
const PORT = 8000;

// Set up Handlebars as the view engine
app.engine('handlebars', engine({ extname: '.handlebars' }));
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/templates');

// Middleware to parse form data
app.use(express.urlencoded({ extended: false }));

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
    const employeeId = req.params.id;

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

    await business.updateEmployee(employeeId, name, phone);

    // PRG pattern - redirect to landing page after successful update
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});
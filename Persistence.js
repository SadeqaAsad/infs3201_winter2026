const fs = require('fs/promises');
const mongodb = require('mongodb');

const DB_NAME = 'infs3201_winter2026';

let client = undefined;

/**
 * Creates and returns a singleton MongoDB client connection.
 *
 * @returns {Promise<mongodb.MongoClient>} Connected MongoDB client
 */
async function getClient() {
    if (!client) {
        client = new mongodb.MongoClient('mongodb+srv://60303237:12class34@cluster0.l3ymimn.mongodb.net/?appName=Cluster0');
        await client.connect();
    }
    return client;
}

/**
 * Retrieves all employees from the employees collection.
 *
 * @returns {Promise<Array>} Array of all employee objects
 */
async function getAllEmployees() {
    let c = await getClient();
    let db = c.db(DB_NAME);
    let employees = db.collection('employees');
    let result = employees.find();
    return await result.toArray();
}

/**
 * Retrieves a single employee by their ID.
 *
 * @param {string} employeeId - The unique identifier of the employee
 * @returns {Promise<Object|null>} The employee object, or null if not found
 */
async function findEmployee(employeeId) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    let employees = db.collection('employees');
    let result = await employees.findOne({ employeeId: employeeId });
    return result;
}

/**
 * Inserts a new employee document into the database.
 *
 * @param {Array} employees - Full array of employees (only the last one is inserted)
 * @returns {Promise<void>}
 */
async function saveEmployees(employees) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    await db.collection('employees').insertOne(employees[employees.length - 1]);
}

/**
 * Updates an existing employee's name and phone number.
 *
 * @param {string} employeeId - The ID of the employee to update
 * @param {string} name - The new name
 * @param {string} phone - The new phone number
 * @returns {Promise<void>}
 */
async function updateEmployee(employeeId, name, phone) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    await db.collection('employees').updateOne(
        { employeeId: employeeId },
        { $set: { name: name, phone: phone } }
    );
}

/**
 * Retrieves all shifts from the shifts collection.
 *
 * @returns {Promise<Array>} Array of all shift objects
 */
async function getAllShifts() {
    let c = await getClient();
    let db = c.db(DB_NAME);
    let shifts = db.collection('shifts');
    let result = shifts.find();
    return await result.toArray();
}

/**
 * Retrieves a single shift by its ID.
 *
 * @param {string} shiftId - The unique identifier of the shift
 * @returns {Promise<Object|null>} The shift object, or null if not found
 */
async function findShift(shiftId) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    let shifts = db.collection('shifts');
    return await shifts.findOne({ shiftId: shiftId });
}

/**
 * Retrieves all assignments from the assignments collection.
 *
 * @returns {Promise<Array>} Array of all assignment objects
 */
async function getAllAssignments() {
    let c = await getClient();
    let db = c.db(DB_NAME);
    let assignments = db.collection('assignments');
    let result = assignments.find();
    return await result.toArray();
}

/**
 * Retrieves all assignments for a specific employee by their employee ID.
 *
 * @param {string} employeeId - The unique identifier of the employee
 * @returns {Promise<Array>} Array of assignment objects belonging to the employee
 */
async function getAssignmentsByEmployee(employeeId) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    let assignments = db.collection('assignments');
    let result = assignments.find({ employeeId: employeeId });
    return await result.toArray();
}

/**
 * Retrieves all assignments for a specific employee on a specific date.
 *
 * @param {string} employeeId - The unique identifier of the employee
 * @param {string} date - The date to filter by (format: YYYY-MM-DD)
 * @returns {Promise<Array>} Array of shift objects for the employee on that date
 */
async function getAssignmentsByEmployeeAndDate(employeeId, date) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    let assignments = await db.collection('assignments').find({ employeeId: employeeId }).toArray();
    let results = [];

    for (let i = 0; i < assignments.length; i++) {
        let shift = await db.collection('shifts').findOne({
            shiftId: assignments[i].shiftId,
            date: date
        });
        if (shift) {
            results.push(shift);
        }
    }

    return results;
}

/**
 * Reads application configuration from the local config.json file.
 *
 * @returns {Promise<Object>} Configuration object containing settings such as maxDailyHours
 */
async function getConfig() {
    let data = await fs.readFile('config.json', 'utf-8');
    return JSON.parse(data);
}

module.exports = {
    getAllEmployees,
    findEmployee,
    saveEmployees,
    updateEmployee,
    getAllShifts,
    findShift,
    getAllAssignments,
    getAssignmentsByEmployee,
    getAssignmentsByEmployeeAndDate,
    getConfig
};
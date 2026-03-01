const { MongoClient } = require('mongodb');
const fs = require('fs/promises');

const configFile = 'config.json';
const DB_NAME = 'infs3201_winter2026';

let client = null;

/**
 * Returns a connected MongoClient, reusing the existing connection if available.
 *
 * @returns {Promise<MongoClient>} A connected MongoClient instance
 */
async function getClient() {
    if (client) {
        return client;
    }
    const config = await getConfig();
    client = new MongoClient(config.mongoUri);
    await client.connect();
    return client;
}

/**
 * Returns the application database object.
 *
 * @returns {Promise<import('mongodb').Db>} The MongoDB database object
 */
async function getDb() {
    const c = await getClient();
    return c.db(DB_NAME);
}

/**
 * @returns {Promise<Array>} Array of employee objects
 */
async function getAllEmployees() {
    const db = await getDb();
    return await db.collection('employees').find({}).toArray();
}

/**
 * @param {string} employeeId - The employee ID to search for
 * @returns {Promise<Object|null>} The employee object if found, null otherwise
 */
async function findEmployee(employeeId) {
    const db = await getDb();
    const employee = await db.collection('employees').findOne({ employeeId: employeeId });
    return employee || null;
}

/**
 * Inserts a new employee document into the database.
 *
 * @param {Array} employees - Full array of employees (only the last one is inserted)
 * @returns {Promise<void>}
 */
async function saveEmployees(employees) {
    const db = await getDb();
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
    const db = await getDb();
    await db.collection('employees').updateOne(
        { employeeId: employeeId },
        { $set: { name: name, phone: phone } }
    );
}

/**
 * @returns {Promise<Array>} Array of shift objects
 */
async function getAllShifts() {
    const db = await getDb();
    return await db.collection('shifts').find({}).toArray();
}

/**
 * @param {string} shiftId - The shift ID to search for
 * @returns {Promise<Object|null>} The shift object if found, null otherwise
 */
async function findShift(shiftId) {
    const db = await getDb();
    const shift = await db.collection('shifts').findOne({ shiftId: shiftId });
    return shift || null;
}

/**
 * @returns {Promise<Array>} Array of assignment objects
 */
async function getAllAssignments() {
    const db = await getDb();
    return await db.collection('assignments').find({}).toArray();
}

/**
 * @param {string} employeeId - The employee ID to search for
 * @returns {Promise<Array>} Array of assignment objects for the employee
 */
async function getAssignmentsByEmployee(employeeId) {
    const db = await getDb();
    return await db.collection('assignments').find({ employeeId: employeeId }).toArray();
}

/**
 * @param {string} employeeId - The employee ID to search for
 * @param {string} date - The date to filter by (format: YYYY-MM-DD)
 * @returns {Promise<Array>} Array of shift objects for the employee on that date
 */
async function getAssignmentsByEmployeeAndDate(employeeId, date) {
    const db = await getDb();
    const assignments = await db.collection('assignments').find({ employeeId: employeeId }).toArray();
    const results = [];

    for (let i = 0; i < assignments.length; i++) {
        const shift = await db.collection('shifts').findOne({
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
 * Reads the application configuration from config.json.
 * Config is intentionally kept as a file, not stored in the database.
 *
 * @returns {Promise<Object>} Configuration object
 */
async function getConfig() {
    const rawData = await fs.readFile(configFile, 'utf8');
    return JSON.parse(rawData);
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
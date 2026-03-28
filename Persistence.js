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
    return await db.collection('employees').find().toArray();
}

/**
 * Retrieves a single employee by their MongoDB ObjectId string.
 *
 * @param {string} id - The MongoDB ObjectId string of the employee
 * @returns {Promise<Object|null>} The employee object, or null if not found
 */
async function findEmployee(id) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    return await db.collection('employees').findOne({ _id: new mongodb.ObjectId(id) });
}

/**
 * Inserts a new employee document into the database.
 *
 * @param {Object} employee - The employee object to insert
 * @returns {Promise<void>}
 */
async function saveEmployee(employee) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    await db.collection('employees').insertOne(employee);
}

/**
 * Updates an existing employee's name and phone number using their ObjectId.
 *
 * @param {string} id - The MongoDB ObjectId string of the employee to update
 * @param {string} name - The new name
 * @param {string} phone - The new phone number
 * @returns {Promise<void>}
 */
async function updateEmployee(id, name, phone) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    await db.collection('employees').updateOne(
        { _id: new mongodb.ObjectId(id) },
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
    return await db.collection('shifts').find().toArray();
}

/**
 * Retrieves all shifts that contain a specific employee's ObjectId
 * in their embedded employees array.
 *
 * @param {mongodb.ObjectId} employeeObjectId - The ObjectId of the employee
 * @returns {Promise<Array>} Array of shift objects assigned to the employee
 */
async function getShiftsByEmployee(employeeObjectId) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    return await db.collection('shifts').find({ employees: employeeObjectId }).toArray();
}

module.exports = {
    getAllEmployees,
    findEmployee,
    saveEmployee,
    updateEmployee,
    getAllShifts,
    getShiftsByEmployee
};
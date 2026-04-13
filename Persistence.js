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
        client = new mongodb.MongoClient('mongodb://60303237:12class34@ac-givhpn0-shard-00-01.amhx6zk.mongodb.net:27017/?authSource=admin&ssl=true');
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
 * Updates an existing employee's name and phone number.
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
 * Retrieves all shifts assigned to a specific employee.
 *
 * @param {mongodb.ObjectId} employeeObjectId - The ObjectId of the employee
 * @returns {Promise<Array>} Array of shift objects assigned to the employee
 */
async function getShiftsByEmployee(employeeObjectId) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    return await db.collection('shifts').find({ employees: employeeObjectId }).toArray();
}

/**
 * Finds a user by username only.
 *
 * @param {string} username - The username to search for
 * @returns {Promise<Object|null>} The user object if found, null otherwise
 */
async function findUserByUsername(username) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    return await db.collection('users').findOne({ username: username });
}

/**
 * Finds a user by username and hashed password.
 *
 * @param {string} username - The username to search for
 * @param {string} hashedPassword - The SHA-256 hashed password
 * @returns {Promise<Object|null>} The user object if found, null otherwise
 */
async function findUser(username, hashedPassword) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    return await db.collection('users').findOne({ username: username, password: hashedPassword });
}

/**
 * Increments the failed login attempt counter for a user.
 *
 * @param {string} username - The username to update
 * @returns {Promise<void>}
 */
async function incrementFailedAttempts(username) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    await db.collection('users').updateOne(
        { username: username },
        { $inc: { failedAttempts: 1 } }
    );
}

/**
 * Resets the failed login attempt counter to zero.
 *
 * @param {string} username - The username to reset
 * @returns {Promise<void>}
 */
async function resetFailedAttempts(username) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    await db.collection('users').updateOne(
        { username: username },
        { $set: { failedAttempts: 0 } }
    );
}

/**
 * Locks a user account by setting the locked flag in the database.
 *
 * @param {string} username - The username to lock
 * @returns {Promise<void>}
 */
async function lockAccount(username) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    await db.collection('users').updateOne(
        { username: username },
        { $set: { locked: true } }
    );
}

/**
 * Inserts a security log entry into the security_log collection.
 *
 * @param {Object} logEntry - The log entry object
 * @returns {Promise<void>}
 */
async function logAccess(logEntry) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    await db.collection('security_log').insertOne(logEntry);
}

/**
 * Returns all document metadata records for a given employee.
 *
 * @param {string} employeeId - The MongoDB ObjectId string of the employee
 * @returns {Promise<Array>} Array of document metadata objects
 */
async function getDocumentsByEmployee(employeeId) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    return await db.collection('employee_documents').find({ employeeId: employeeId }).toArray();
}

/**
 * Saves metadata about an uploaded employee document.
 *
 * @param {Object} docMeta - { employeeId, filename, originalName, uploadedAt }
 * @returns {Promise<void>}
 */
async function saveDocumentMeta(docMeta) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    await db.collection('employee_documents').insertOne(docMeta);
}

/**
 * Retrieves a single document metadata record by its ID.
 *
 * @param {string} docId - The MongoDB ObjectId string of the document
 * @returns {Promise<Object|null>} The document metadata object, or null if not found
 */
async function findDocumentById(docId) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    return await db.collection('employee_documents').findOne({ _id: new mongodb.ObjectId(docId) });
}

/**
 * Deletes a document metadata record by its ID.
 *
 * @param {string} docId - The MongoDB ObjectId string of the document to delete
 * @returns {Promise<void>}
 */
async function deleteDocumentById(docId) {
    let c = await getClient();
    let db = c.db(DB_NAME);
    await db.collection('employee_documents').deleteOne({ _id: new mongodb.ObjectId(docId) });
}

module.exports = {
    getAllEmployees,
    findEmployee,
    saveEmployee,
    updateEmployee,
    getAllShifts,
    getShiftsByEmployee,
    findUser,
    findUserByUsername,
    incrementFailedAttempts,
    resetFailedAttempts,
    lockAccount,
    logAccess,
    getDocumentsByEmployee,
    saveDocumentMeta,
    findDocumentById,
    deleteDocumentById
};
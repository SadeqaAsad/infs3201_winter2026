const persistence = require('./Persistence');
const mongodb = require('mongodb');

/**
 * Calculates how many hours a shift lasts.
 *
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {number} Duration in hours
 */
function computeShiftDuration(startTime, endTime) {
    const startParts = startTime.split(':');
    const startHour = parseInt(startParts[0], 10);
    const startMinute = parseInt(startParts[1], 10);

    const endParts = endTime.split(':');
    const endHour = parseInt(endParts[0], 10);
    const endMinute = parseInt(endParts[1], 10);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    return (endTotalMinutes - startTotalMinutes) / 60;
}

/**
 * Returns the full list of employees.
 *
 * @returns {Promise<Array>} Array of employee objects
 */
async function getEmployeeList() {
    return await persistence.getAllEmployees();
}

/**
 * Creates a new employee and saves it to the database.
 *
 * @param {string} name - The employee's full name
 * @param {string} phone - The employee's phone number
 * @returns {Promise<Object>} The newly created employee object
 */
async function createEmployee(name, phone) {
    const newEmployee = {
        name: String(name).trim(),
        phone: String(phone).trim()
    };
    await persistence.saveEmployee(newEmployee);
    return newEmployee;
}

/**
 * Returns an employee's schedule sorted by date and start time.
 *
 * @param {string} id - The MongoDB ObjectId string of the employee
 * @returns {Promise<Array>} Sorted array of shift objects
 */
async function getEmployeeSchedule(id) {
    const employeeObjectId = new mongodb.ObjectId(id);
    const schedule = await persistence.getShiftsByEmployee(employeeObjectId);

    for (let i = 0; i < schedule.length - 1; i++) {
        for (let j = 0; j < schedule.length - 1 - i; j++) {
            if (
                schedule[j].date + schedule[j].startTime >
                schedule[j + 1].date + schedule[j + 1].startTime
            ) {
                const temp = schedule[j];
                schedule[j] = schedule[j + 1];
                schedule[j + 1] = temp;
            }
        }
    }

    return schedule;
}

/**
 * Finds a single employee by their MongoDB ObjectId string.
 *
 * @param {string} id - The MongoDB ObjectId string of the employee
 * @returns {Promise<Object|null>} The employee object, or null if not found
 */
async function findEmployee(id) {
    return await persistence.findEmployee(String(id).trim());
}

/**
 * Updates the name and phone number of an existing employee.
 *
 * @param {string} id - The MongoDB ObjectId string of the employee to update
 * @param {string} name - The new name
 * @param {string} phone - The new phone number
 * @returns {Promise<void>}
 */
async function updateEmployee(id, name, phone) {
    await persistence.updateEmployee(id, name, phone);
}

/**
 * Retrieves all documents for a given employee.
 *
 * @param {string} employeeId - The MongoDB ObjectId string of the employee
 * @returns {Promise<Array>} Array of document metadata objects
 */
async function getEmployeeDocuments(employeeId) {
    return await persistence.getDocumentsByEmployee(String(employeeId).trim());
}

/**
 * Counts how many documents an employee already has uploaded.
 *
 * @param {string} employeeId - The MongoDB ObjectId string of the employee
 * @returns {Promise<number>} The document count
 */
async function countEmployeeDocuments(employeeId) {
    const docs = await persistence.getDocumentsByEmployee(String(employeeId).trim());
    return docs.length;
}

/**
 * Saves document metadata after a successful file upload.
 *
 * @param {string} employeeId - The MongoDB ObjectId string of the employee
 * @param {string} filename - The stored filename on disk
 * @param {string} originalName - The original filename from the uploader
 * @returns {Promise<void>}
 */
async function saveDocumentMeta(employeeId, filename, originalName) {
    await persistence.saveDocumentMeta({
        employeeId: String(employeeId).trim(),
        filename: filename,
        originalName: originalName,
        uploadedAt: new Date()
    });
}

/**
 * Finds a document metadata record by its database ID.
 *
 * @param {string} docId - The MongoDB ObjectId string of the document
 * @returns {Promise<Object|null>} The document metadata object, or null if not found
 */
async function findDocumentById(docId) {
    return await persistence.findDocumentById(String(docId).trim());
}

/**
 * Deletes a document metadata record from the database.
 *
 * @param {string} docId - The MongoDB ObjectId string of the document
 * @returns {Promise<void>}
 */
async function deleteDocumentRecord(docId) {
    await persistence.deleteDocumentById(String(docId).trim());
}

module.exports = {
    computeShiftDuration,
    getEmployeeList,
    createEmployee,
    getEmployeeSchedule,
    findEmployee,
    updateEmployee,
    getEmployeeDocuments,
    countEmployeeDocuments,
    saveDocumentMeta,
    findDocumentById,
    deleteDocumentRecord
};
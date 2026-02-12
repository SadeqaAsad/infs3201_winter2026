const fs = require('fs/promises');

const employeesFile = 'employees.json';
const shiftsFile = 'shifts.json';
const assignmentsFile = 'assignments.json';
const configFile = 'config.json';

/**
 * @returns {Promise<Array>} Array of employee objects
 */
async function getAllEmployees() {
    const rawData = await fs.readFile(employeesFile, 'utf8');
    return JSON.parse(rawData);
}

/**
 * @param {string} employeeId - The employee ID to search for
 * @returns {Promise<Object|null>} The employee object if found, null otherwise
 */
async function findEmployee(employeeId) {
    const employees = await getAllEmployees();
    
    for (let i = 0; i < employees.length; i++) {
        if (employees[i].employeeId === employeeId) {
            return employees[i];
        }
    }
    
    return null;
}

/**
 * @param {Array} employees - Array of employee objects to save
 * @returns {Promise<void>}
 */
async function saveEmployees(employees) {
    await fs.writeFile(employeesFile, JSON.stringify(employees, null, 4));
}

/**
 * Loads all shifts from the shifts.json file.
 * 
 * @returns {Promise<Array>} Array of shift objects
 */
async function getAllShifts() {
    const rawData = await fs.readFile(shiftsFile, 'utf8');
    return JSON.parse(rawData);
}

/**
 * @param {string} shiftId - The shift ID to search for
 * @returns {Promise<Object|null>} The shift object if found, null otherwise
 */
async function findShift(shiftId) {
    const shifts = await getAllShifts();
    
    for (let i = 0; i < shifts.length; i++) {
        if (shifts[i].shiftId === shiftId) {
            return shifts[i];
        }
    }
    
    return null;
}

/**
 * @returns {Promise<Array>} Array of assignment objects
 */
async function getAllAssignments() {
    const rawData = await fs.readFile(assignmentsFile, 'utf8');
    return JSON.parse(rawData);
}

/**
 * @param {string} employeeId - The employee ID to search for
 * @returns {Promise<Array>} Array of assignment objects for the employee
 */
async function getAssignmentsByEmployee(employeeId) {
    const assignments = await getAllAssignments();
    const results = [];
    
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId) {
            results.push(assignments[i]);
        }
    }
    
    return results;
}

/*
 * @param {string} employeeId - The employee ID to search for
 * @param {string} date - The date to filter by (format: YYYY-MM-DD)
 * @returns {Promise<Array>} Array of shift objects for the employee on that date
 */
async function getAssignmentsByEmployeeAndDate(employeeId, date) {
    const assignments = await getAllAssignments();
    const shifts = await getAllShifts();
    const results = [];
    
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId) {
            // Find the corresponding shift
            for (let j = 0; j < shifts.length; j++) {
                if (shifts[j].shiftId === assignments[i].shiftId && shifts[j].date === date) {
                    results.push(shifts[j]);
                }
            }
        }
    }
    
    return results;
}

/**
 * @param {string} employeeId - The employee ID
 * @param {string} shiftId - The shift ID
 * @returns {Promise<boolean>} True if assignment exists, false otherwise
 */
async function assignmentExists(employeeId, shiftId) {
    const assignments = await getAllAssignments();
    
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId && assignments[i].shiftId === shiftId) {
            return true;
        }
    }
    
    return false;
}

/**
 * @param {Array} assignments - Array of assignment objects to save
 * @returns {Promise<void>}
 */
async function saveAssignments(assignments) {
    await fs.writeFile(assignmentsFile, JSON.stringify(assignments, null, 4));
}

/**
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
    getAllShifts,
    findShift,
    getAllAssignments,
    getAssignmentsByEmployee,
    getAssignmentsByEmployeeAndDate,
    assignmentExists,
    saveAssignments,
    getConfig
};
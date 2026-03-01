const persistence = require('./Persistence');

/**
 * Calculates how many hours a shift lasts.
 * Times are given in HH:MM format.
 *
 * @param {string} startTime
 * @param {string} endTime
 * @returns {number} duration in hours
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
 * Finds the next available employee ID (E###).
 *
 * @returns {Promise<string>} The next employee ID string (e.g. "E010")
 */
async function generateNextEmployeeId() {
    const employees = await persistence.getAllEmployees();
    let maxNum = 0;

    for (let i = 0; i < employees.length; i++) {
        const id = String(employees[i].employeeId || '');
        if (id.length > 1 && id[0] === 'E') {
            const num = parseInt(id.slice(1), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    }

    let nextNum = String(maxNum + 1);
    while (nextNum.length < 3) {
        nextNum = '0' + nextNum;
    }

    return 'E' + nextNum;
}

/**
 * Creates a new employee and saves it.
 *
 * @param {string} name - The employee's full name
 * @param {string} phone - The employee's phone number
 * @returns {Promise<Object>} The newly created employee object
 */
async function createEmployee(name, phone) {
    const employees = await persistence.getAllEmployees();
    const employeeId = await generateNextEmployeeId();

    const newEmployee = {
        employeeId: employeeId,
        name: String(name).trim(),
        phone: String(phone).trim()
    };

    employees.push(newEmployee);
    await persistence.saveEmployees(employees);

    return newEmployee;
}

/**
 * Returns an employee's schedule sorted by date and time.
 *
 * @param {string} employeeId - The ID of the employee
 * @returns {Promise<Array>} Sorted array of shift objects
 */
async function getEmployeeSchedule(employeeId) {
    const empId = String(employeeId).trim();
    const assignments = await persistence.getAssignmentsByEmployee(empId);
    const shifts = await persistence.getAllShifts();
    const schedule = [];

    for (let i = 0; i < assignments.length; i++) {
        for (let j = 0; j < shifts.length; j++) {
            if (shifts[j].shiftId === assignments[i].shiftId) {
                schedule.push(shifts[j]);
            }
        }
    }

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
 * Finds a single employee by ID.
 *
 * @param {string} employeeId - The employee ID to look up
 * @returns {Promise<Object|null>} The employee object, or null if not found
 */
async function findEmployee(employeeId) {
    return await persistence.findEmployee(String(employeeId).trim());
}

/**
 * Updates the name and phone number of an existing employee.
 *
 * @param {string} employeeId - The ID of the employee to update
 * @param {string} name - The new name
 * @param {string} phone - The new phone number
 * @returns {Promise<void>}
 */
async function updateEmployee(employeeId, name, phone) {
    await persistence.updateEmployee(employeeId, name, phone);
}

module.exports = {
    computeShiftDuration,
    getEmployeeList,
    createEmployee,
    getEmployeeSchedule,
    findEmployee,
    updateEmployee
};
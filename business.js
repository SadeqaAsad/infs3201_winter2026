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
 */
async function getEmployeeList() {
    return await persistence.getAllEmployees();
}

/**
 * Finds the next available employee ID (E###).
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

// REMOVED: validateEmployeeExists     
// REMOVED: validateShiftExists         
// REMOVED: getEmployeeHoursForDate   
// REMOVED: checkHourLimit              
// REMOVED: assignEmployeeToShift       

/**
 * Returns an employee's schedule sorted by date and time.
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

module.exports = {
    computeShiftDuration,
    getEmployeeList,
    createEmployee,
    getEmployeeSchedule
    // REMOVED: assignEmployeeToShift
};
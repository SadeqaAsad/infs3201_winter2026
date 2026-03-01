const prompt = require('prompt-sync')();
const businessLogic = require('./business');

/**
 * Displays all employees in a formatted table.
 *
 * @returns {Promise<void>}
 */
async function showAllEmployees() {
    const employees = await businessLogic.getEmployeeList();

    if (!employees || employees.length === 0) {
        console.log('No employees found');
        return;
    }

    console.log('\nEmployee ID   Name                 Phone');
    console.log('-----------  -------------------- ---------');

    for (let i = 0; i < employees.length; i++) {
        let id = String(employees[i].employeeId || '');
        while (id.length < 12) {
            id = id + ' ';
        }

        let name = String(employees[i].name || '');
        while (name.length < 22) {
            name = name + ' ';
        }

        const phone = String(employees[i].phone || '');
        console.log(id + ' ' + name + ' ' + phone);
    }
}

/**
 * Prompts user for employee details and adds a new employee.
 *
 * @returns {Promise<void>}
 */
async function addNewEmployee() {
    const name = prompt('Enter employee name: ').trim();
    const phone = prompt('Enter phone number: ').trim();

    if (!name || !phone) {
        console.log('Name and phone are required');
        return;
    }

    await businessLogic.createEmployee(name, phone);
    console.log('Employee added...');
}

// REMOVED: assignEmployeeToShift - feature removed per assignment instructions

/**
 * Prompts user for employee ID and displays their schedule in CSV format.
 *
 * @returns {Promise<void>}
 */
async function viewEmployeeSchedule() {
    const employeeId = prompt('Enter employee ID: ').trim();

    if (!employeeId) {
        console.log('Employee ID required');
        return;
    }

    const schedule = await businessLogic.getEmployeeSchedule(employeeId);

    console.log('date,startTime,endTime');
    for (let i = 0; i < schedule.length; i++) {
        console.log(schedule[i].date + ',' + schedule[i].startTime + ',' + schedule[i].endTime);
    }
}

/**
 * @returns {void}
 */
function displayMenu() {
    console.log('\nEmployee Scheduling System');
    console.log('1. Show all employees');
    console.log('2. Add new employee');
    console.log('3. View employee schedule');  // was option 4
    console.log('4. Exit');                     // was option 5
    // REMOVED: option 3 - Assign employee to shift
}

/**
 * @returns {Promise<void>}
 */
async function runApplication() {
    while (true) {
        displayMenu();
        const choice = prompt('What is your choice> ').trim();

        if (choice === '1') {
            await showAllEmployees();
        } else if (choice === '2') {
            await addNewEmployee();
        } else if (choice === '3') {
            await viewEmployeeSchedule();  // was option 4
        } else if (choice === '4') {
            console.log('Goodbye!');        // was option 5
            break;
        } else {
            console.log('Invalid choice');
        }
    }
}

runApplication();

module.exports = {
    runApplication
};
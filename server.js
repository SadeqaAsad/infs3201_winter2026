const fs = require('fs/promises')
const prompt = require('prompt-sync')()

const employeesFile = 'employees.json'
const shiftsFile = 'shifts.json'
const assignmentsFile = 'assignments.json'

/**
 * Loads employee data from employees.json.
 * 
 * @returns {Promise<Array>} Array of employee objects
 */
async function loadEmployees() {
    let rawEmployees = await fs.readFile(employeesFile, "utf8")
    let parsedEmployees = JSON.parse(rawEmployees)
    return parsedEmployees
}

/**
 * Loads shift data from shifts.json.
 * 
 * @returns {Promise<Array>} Array of shift objects
 */
async function loadShifts() {
    let rawShifts = await fs.readFile(shiftsFile, "utf8")
    let parsedShifts = JSON.parse(rawShifts)
    return parsedShifts
}

/**
 * Loads assignment data from assignments.json.
 * 
 * @returns {Promise<Array>} Array of assignment objects
 */
async function loadAssignments() {
    let rawAssignments = await fs.readFile(assignmentsFile, "utf8")
    let parsedAssignments = JSON.parse(rawAssignments)
    return parsedAssignments
}

/**
 * Saves the employee list to the employees.json file.
 * @param {Array} employees List of employees to save
 */
async function saveEmployees(employees) {
    await fs.writeFile(employeesFile, JSON.stringify(employees, null, 4))
}

/**
 * Saves the assignment list to the assignments.json file.
 * @param {Array} assignments List of assignments to save
 */
async function saveAssignments(assignments) {
    await fs.writeFile(assignmentsFile, JSON.stringify(assignments, null, 4))
}

/**
 * Displays all employees in a formatted table.
 */
async function showAllEmployees() {
    let employees = await loadEmployees()

    if (employees.length === 0) {
        console.log('No employees found')
        return
    }

    console.log('\nEmployee ID   Name                 Phone')
    console.log('-----------  -------------------- ---------')

    for (let emp of employees) {
        let id = emp.employeeId
        while (id.length < 12) {
            id = id + ' '
        }
        
        let name = emp.name
        while (name.length < 22) {
            name = name + ' '
        }
        
        console.log(id + name + emp.phone)
    }
}

/**
 * Generates the next employee ID based on existing employees.
 * @param {Array} employees List of current employees
 * @returns {string} New employee ID
 */
function getNextEmployeeId(employees) {
    let max = 0

    for (let emp of employees) {
        let num = parseInt(emp.employeeId.slice(1))
        if (num > max) max = num
    }

    let nextNum = String(max + 1)
    while (nextNum.length < 3) {
        nextNum = '0' + nextNum
    }
    return 'E' + nextNum
}

/**
 * Adds a new employee by prompting for name and phone number.
 */
async function addNewEmployee() {
    let name = prompt('Enter employee name: ')
    let phone = prompt('Enter phone number: ')

    if (!name || !phone) {
        console.log('Name and phone are required')
        return
    }

    let employees = await loadEmployees()

    employees.push({
        employeeId: getNextEmployeeId(employees),
        name: name,
        phone: phone
    })

    await saveEmployees(employees)
    console.log('Employee added...')
}

/**
 * Assigns an employee to a shift.
 * Performs validation to ensure:
 * - Employee exists
 * - Shift exists
 * - Assignment does not already exist
 */
async function assignEmployeeToShift() {
    let employeeId = prompt('Enter employee ID: ')
    let shiftId = prompt('Enter shift ID: ')

    if (!employeeId || !shiftId) {
        console.log('Employee ID and Shift ID required')
        return
    }

    let employees = await loadEmployees()
    let shifts = await loadShifts()
    let assignments = await loadAssignments()

    let employeeExists = false
    for (let e of employees) {
        if (e.employeeId === employeeId) employeeExists = true
    }

    if (!employeeExists) {
        console.log('Employee does not exist')
        return
    }

    let shiftExists = false
    for (let s of shifts) {
        if (s.shiftId === shiftId) shiftExists = true
    }

    if (!shiftExists) {
        console.log('Shift does not exist')
        return
    }

    for (let a of assignments) {
        if (a.employeeId === employeeId && a.shiftId === shiftId) {
            console.log('Assignment already exists')
            return
        }
    }

    assignments.push({ employeeId, shiftId })
    await saveAssignments(assignments)

    console.log('Shift Recorded')
}

/**
 * Displays the schedule for a given employee in CSV format.
 */
async function viewEmployeeSchedule() {
    let employeeId = prompt('Enter employee ID: ')

    if (!employeeId) {
        console.log('Employee ID required')
        return
    }

    let assignments = await loadAssignments()
    let shifts = await loadShifts()

    let results = []

    for (let a of assignments) {
        if (a.employeeId === employeeId) {
            for (let s of shifts) {
                if (s.shiftId === a.shiftId) {
                    results.push(s)
                }
            }
        }
    }

    for (let i = 0; i < results.length - 1; i++) {
        for (let j = 0; j < results.length - 1 - i; j++) {
            let current = results[j].date + results[j].startTime
            let next = results[j + 1].date + results[j + 1].startTime
            if (current > next) {
                let temp = results[j]
                results[j] = results[j + 1]
                results[j + 1] = temp
            }
        }
    }

    console.log('date,startTime,endTime')
    for (let r of results) {
        console.log(`${r.date},${r.startTime},${r.endTime}`)
    }
}

/**
 * Main application loop.
 * Displays menu options and handles user input.
 */
async function application() {
    while (true) {
        console.log('\n1. Show all employees')
        console.log('2. Add new employee')
        console.log('3. Assign employee to shift')
        console.log('4. View employee schedule')
        console.log('5. Exit')

        let choice = prompt('What is your choice> ')

        if (choice === '1') await showAllEmployees()
        else if (choice === '2') await addNewEmployee()
        else if (choice === '3') await assignEmployeeToShift()
        else if (choice === '4') await viewEmployeeSchedule()
        else if (choice === '5') break
        else console.log('Invalid choice')
    }
}

application()
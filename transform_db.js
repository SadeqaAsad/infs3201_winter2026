const { MongoClient } = require('mongodb');

const DB_NAME = 'infs3201_winter2026';
const MONGO_URI = 'mongodb+srv://60303237:12class34@cluster0.l3ymimn.mongodb.net/?appName=Cluster0';
let client = null;

/**
 * Database Connection Utilities
 * -----------------------------
 * Provides helper functions to establish and reuse a MongoDB connection.
 * Ensures that the application consistently uses the same client instance.
 */

/**
 * Returns a connected MongoClient, reusing existing connection if available.
 *
 * @returns {Promise<MongoClient>} A connected MongoClient instance
 */
async function getClient() {
    if (client) return client;
    client = new MongoClient(MONGO_URI);
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
 * Step 1: Initialize employees array in shifts
 * --------------------------------------------
 * Adds an empty "employees" array field to every shift document.
 * This prepares the schema for embedding employee ObjectIds in later steps.
 * Run this step before any other transformation.
 */
async function addEmptyEmployeesArray() {
    const db = await getDb();
    const result = await db.collection('shifts').updateMany(
        {},
        { $set: { employees: [] } }
    );
    console.log('Step 1 done: added employees array to ' + result.modifiedCount + ' shifts');
}

/**
 * Step 2: Embed employees into shifts
 * -----------------------------------
 * Iterates through all assignment records and, for each one:
 *   - Finds the corresponding employee document to retrieve its ObjectId.
 *   - Finds the corresponding shift document.
 *   - Pushes the employee’s ObjectId into the shift’s "employees" array.
 * This replaces the relational-style assignment mapping with embedded references.
 */
async function embedEmployeesInShifts() {
    const db = await getDb();
    const assignments = await db.collection('assignments').find({}).toArray();

    let count = 0;

    for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];

        // Find the employee document to get their ObjectId
        const employee = await db.collection('employees').findOne(
            { employeeId: assignment.employeeId }
        );

        // Find the shift document to get its ObjectId
        const shift = await db.collection('shifts').findOne(
            { shiftId: assignment.shiftId }
        );

        if (employee && shift) {
            await db.collection('shifts').updateOne(
                { _id: shift._id },
                { $push: { employees: employee._id } }
            );
            count++;
        }
    }

    console.log('Step 2 done: embedded ' + count + ' employee references into shifts');
}

/**
 * Step 3: Remove obsolete fields and collections
 * ----------------------------------------------
 * Cleans up the schema by:
 *   - Removing "employeeId" from all employee documents.
 *   - Removing "shiftId" from all shift documents.
 *   - Dropping the "assignments" collection entirely.
 * These changes finalize the transition to a document-oriented model.
 *
 * If you prefer to do this in Compass instead, use these shell commands:
 *   db.employees.updateMany({}, { $unset: { employeeId: "" } })
 *   db.shifts.updateMany({}, { $unset: { shiftId: "" } })
 *   db.assignments.drop()
 */
async function removeUnnecessaryFields() {
    const db = await getDb();

    // Remove employeeId from all employees
    const empResult = await db.collection('employees').updateMany(
        {},
        { $unset: { employeeId: '' } }
    );
    console.log('Step 3a done: removed employeeId from ' + empResult.modifiedCount + ' employees');

    // Remove shiftId from all shifts
    const shiftResult = await db.collection('shifts').updateMany(
        {},
        { $unset: { shiftId: '' } }
    );
    console.log('Step 3b done: removed shiftId from ' + shiftResult.modifiedCount + ' shifts');

    // Drop the assignments collection
    await db.collection('assignments').drop();
    console.log('Step 3c done: dropped assignments collection');
}

/**
 * Step 4: Run all migration steps
 * -------------------------------
 * Executes the full transformation pipeline in sequence:
 *   1. Add empty employees arrays.
 *   2. Embed employee ObjectIds into shifts.
 *   3. Remove obsolete fields and collections.
 * After completion, the database is fully migrated to the Assignment 4 schema.
 */
async function runAll() {
    await addEmptyEmployeesArray();
    await embedEmployeesInShifts();
    await removeUnnecessaryFields();
    console.log('All steps complete. Database migration finished.');
}

// Entry point
runAll()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

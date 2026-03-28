Employee Scheduling System - Assignment 4
Test User Credentials
Username    -     password
--------------------------
admin       -     admin
user1       -     password

Running the Application

1. Install dependencies: npm install
2. Start the server: node app.js
3. Open browser at: http://localhost:8000
4. Log in with one of the credentials above.

Notes

Sessions expire after 5 minutes of inactivity.
Every page visit extends the session by another 5 minutes.
All HTTP requests are logged to the security_log collection in MongoDB.
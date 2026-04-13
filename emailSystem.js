/**
 * @fileoverview Email system abstraction layer.
 * Uses console.log() to simulate sending emails.
 * Swap the internals for nodemailer without changing any other file.
 */

/**
 * Sends an email.
 *
 * @param {string} to - Recipient address
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @returns {Promise<void>}
 */
async function sendEmail(to, subject, body) {
    console.log('========== EMAIL ==========');
    console.log('To:      ' + to);
    console.log('Subject: ' + subject);
    console.log('---');
    console.log(body);
    console.log('===========================');
}

/**
 * Sends a 2FA code to the user.
 *
 * @param {string} email - User's email address
 * @param {string} code - The 6-digit code
 * @returns {Promise<void>}
 */
async function send2FACode(email, code) {
    await sendEmail(
        email,
        'Your Login Verification Code',
        'Your 2FA code is: ' + code + '\nThis code expires in 3 minutes.'
    );
}

/**
 * Sends a suspicious activity warning after multiple failed logins.
 *
 * @param {string} email - User's email address
 * @param {string} username - The account username
 * @returns {Promise<void>}
 */
async function sendSuspiciousActivityWarning(email, username) {
    await sendEmail(
        email,
        'Suspicious Login Activity Detected',
        'Multiple failed login attempts were detected on account: ' + username + '\nIf this was not you, secure your account immediately.'
    );
}

/**
 * Sends an account locked notification.
 *
 * @param {string} email - User's email address
 * @param {string} username - The account username
 * @returns {Promise<void>}
 */
async function sendAccountLockedEmail(email, username) {
    await sendEmail(
        email,
        'Account Locked',
        'Your account (' + username + ') has been locked due to too many failed login attempts.\nContact your administrator to unlock it.'
    );
}

module.exports = {
    sendEmail,
    send2FACode,
    sendSuspiciousActivityWarning,
    sendAccountLockedEmail
};
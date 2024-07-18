const bcrypt = require("bcrypt");

function generateSecurePassword() {
    const password = Math.random().toString(36).slice(-10);
    const saltRounds = 10;
    const salt = bcrypt.genSaltSync(saltRounds);
    const hashedPassword = bcrypt.hashSync(password, salt);
    return { plain: password, hashed: hashedPassword };
};

module.exports = {
    generateSecurePassword,
};
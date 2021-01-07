const chai = require('chai');
const chaiHttp = require('chai-http');
const path = require('path');
const fs = require('fs');

const server = require('../server');

chai.use(chaiHttp);

// Helper function for any methods requiring authentication
function registerHelper(email, password, tokensObj, done) {
    const user = {
        email: email,
        password: password,
        passwordConfirmation: password
    };

    chai.request(server)
        .post('/api/register')
        .send(user)
        .end((err, res) => {
            tokensObj.ac = res.body.accessToken;
            tokensObj.rf = res.body.refreshToken;

            done();
        });
}

// Checks if the specified filepath exists and is a directory
function checkIfDirectoryExists(filepath) {
    try {
        const p = path.resolve(filepath);
        console.log(p);
        const stat = fs.lstatSync(p);

        return stat.isDirectory();
    } catch (err) {
        return false;
    }
}

// Clears the contents of the filesTest folder 
async function clearFilesTest() {
    try {
        const files = fs.readdirSync(path.resolve('filesTest'));
    
        const deletePromises = [];
        for (let i in files) {
            deletePromises.push(fs.promises
                                .rmdir(path.resolve(`filesTest/${files[i]}`)));
        }

        await Promise.all(deletePromises);
    } catch (err) {
        return;
    }
}

module.exports = {
    registerHelper,
    checkIfDirectoryExists,
    clearFilesTest
}
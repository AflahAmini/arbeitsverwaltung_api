const bcrypt = require('bcryptjs');

const passwordToDigest = "admin";

bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(passwordToDigest, salt, (err, hash) => {
        console.log(hash);
    });
    bcrypt.hash(passwordToDigest, salt, (err, hash) => {
        console.log(hash);
    });
});

bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(passwordToDigest, salt, (err, hash) => {
        bcrypt.compare(passwordToDigest, hash, (err, succ) => {
            console.log(succ);
        });
    });
});
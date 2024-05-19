const express = require('express');
const mysql = require('mysql2');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const setRounds = 10;

app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000,
    }
}));

// Database connection setup
const db = mysql.createConnection({
    user: 'avnadmin',
    password: 'AVNS_5W135YZrjuwuLR-WHt5',
    host: 'mysql-39af648c-gokul.a.aivencloud.com',
    database: 'home',
    port: '11941'
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images")
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
})

app.use('/images',express.static('./images'))

const upload = multer({ storage: storage });

app.post('/register', (req, res) => {
    const { name, mail, contact, password, cpassword, address, area, state, country, category } = req.body;

    if (password !== cpassword) {
        return res.status(400).json({ error: 'Password and Confirm Password do not match' });
    }

    bcryptjs.hash(password, setRounds, (err, hash) => {
        if (err) {
            console.log(err);
        }

        db.query(
            'INSERT INTO register(name, mail, contact, password, cpassword, address, area, state, country, category) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [name, mail, contact, hash, hash, address, area, state, country, category],
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                } else {
                    console.log(result);
                    return res.status(200).json({ message: 'Registration Successful' });
                }
            }
        );
    });
});

app.post('/login', async (req, res) => {
    const { mail, password } = req.body;

    db.query(
        "SELECT * FROM register WHERE mail=?",
        [mail],
        (err, result) => {
            if (err) {
                console.log("Error:", err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            if (result.length > 0) {
                bcryptjs.compare(password, result[0].password, (err, response) => {
                    if (response) {
                        const id = result[0].id;
                        const token = jwt.sign({ id }, "secret", { expiresIn: '1h' });
                        const userData = result[0];
                        res.json({ auth: true, token: token, result: userData, message: 'Login Successful' });
                    } else {
                        res.status(401).json({ message: 'Invalid Credentials' });
                    }
                });
            } else {
                res.status(401).json({ message: 'Invalid Credentials' });
            }
        }
    );
});

const verJWT = (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) {
        res.send("We need token give it next time");
    } else {
        jwt.verify(token, "secret", (err, decoded) => {
            if (err) {
                res.json({ auth: false, message: "Failed to authenticate" });
            } else {
                req.mail = decoded.id;
                next();
            }
        });
    }
};

app.get('/isAuth', verJWT, (req, res) => {
    const userDetails = {
        mail: req.mail,
    };
    res.json({ result: userDetails });
});

app.post('/owner', upload.fields([
    { name: 'hall', maxCount: 1 },
    { name: 'kitchen', maxCount: 1 },
    { name: 'bedroomone', maxCount: 1 },
    { name: 'toiletone', maxCount: 1 },
    { name: 'bedroomtwo', maxCount: 1 },
    { name: 'toilettwo', maxCount: 1 }
]), (req, res) => {
    const { name, contact, address, area, state, country, category } = req.body;
    const { hall, kitchen, bedroomone, toiletone, bedroomtwo, toilettwo } = req.files;

    db.query(
        'INSERT INTO owner(name, contact, address, area, state, country, category, hall, kitchen, bedroomone, toiletone, bedroomtwo, toilettwo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [name, contact, address, area, state, country, category, hall[0].path, kitchen[0].path, bedroomone[0].path, toiletone[0].path, bedroomtwo[0].path, toilettwo[0].path],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                console.log(result);
                return res.status(200).json({ message: 'Owner details inserted successfully' });
            }
        }
    );
});

// Modify the /owners endpoint to fetch BLOB images
app.get('/owners', (req, res) => {
    db.query(
        'SELECT * FROM owner',
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                // Send the result containing BLOB data as response
                res.status(200).json({ owners: result });
            }
        }
    );
});


app.listen(3002, () => {
    console.log('Server started');
});
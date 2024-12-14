//imports and setup stuff
const express = require('express'); //
const app = express();  //creates an express instance
const path = require('path'); 
const { MongoClient } = require('mongodb'); //imports mongoDB client
require('dotenv').config(); // load variables from .env

// mongoDB connection string
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.mlby5.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`;

// connect to MongoDB
let db;
let mongoClient;

async function connectToDB() {
    try {
        mongoClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        await mongoClient.connect();
        db = mongoClient.db(process.env.MONGO_DB_NAME);
    } catch (err) {
        console.error("Failed to connect to MongoDB", err);
        process.exit(1);
    }
}

// parses urls/json
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// sets up the templates and specifies ejs
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'ejs');













/* ROUTES START*/


// renders the WELCOME page with login/signup functionality
app.get('/', (req, res) => {
    res.render('index', { isSignup: false }); //uses a variable to toggle between login/signup
});

// renders the signup form that shows up when the user clicks "Login here"
app.get('/signup', (req, res) => {
    res.render('index', { isSignup: true }); // Toggle to display signup form
});

// Handle login form submission
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("Email and Password are required!");
    }

    try {
        const user = await db.collection('users').findOne({ email, password });

        if (!user) {
            return res.status(401).send("Invalid email or password!");
        }

        res.send("Login successful!");
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).send("Login failed.");
    }
});

// Handle signup form submission
app.post('/signup', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).send("Name, Email, and Password are required!");
    }

    const newUser = { name, email, password };

    try {
        const existingUser = await db.collection('users').findOne({ email });

        if (existingUser) {
            return res.status(400).send("Email is already registered!");
        }

        await db.collection('users').insertOne(newUser);
        res.send("Signup successful!");
    } catch (err) {
        console.error("Error during signup:", err);
        res.status(500).send("Signup failed.");
    }
});
 


/* ROUTES STOP*/
















// start the server after connecting to the database
// use port 3000 by default but port can be specified
const PORT = process.argv[2] || process.env.PORT || 3000;

connectToDB().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`Web server started and running at http://localhost:${PORT}`);
        process.stdout.write("Stop to shut down the server: ");
    });

    // Start listening for commands in the terminal
    process.stdin.on("data", (data) => {
        const command = data.toString().trim();
    
        if (command === "stop") {
            console.log("Shutting down the server");
            server.close(async () => {
                try {
                    if (mongoClient) {
                        await mongoClient.close();
                    }
                } catch (err) {
                    console.error("Error closing MongoDB connection:", err);
                }
                process.exit(0);
            });
        } else {
            console.log(`Invalid command: ${command}`);
        }
    });

}).catch(err => {
    console.error("Failed to start server:", err);
});
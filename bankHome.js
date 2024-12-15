//imports and setup stuff
const express = require('express'); //
const app = express();  //creates an express instance
const path = require('path'); 
const { MongoClient } = require('mongodb'); //imports mongoDB client
require('dotenv').config(); // load variables from .env

// mongoDB connection string !!!change this to your mongo url!!!!
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.3j2zh.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`;
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
    res.render('index', { isSignup: false, error: null }); //uses a variable to toggle between login/signup
});

// renders the signup form that shows up when the user clicks "Login here"
app.get('/signup', (req, res) => {
    res.render('index', { isSignup: true, error: null }); // toggle to display signup form
});

// handles the login form submission
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('index', { isSignup: false, error: "Email and Password are required!" });
    }

    try {
        const user = await db.collection('users').findOne({ email, password });

        if (!user) {
            return res.render('index', { isSignup: false, error: "Invalid email or password!" });
        }

        res.redirect(`/profile?email=${encodeURIComponent(email)}`);
    } catch (err) {
        console.error("Error during login:", err);
        res.render('index', { isSignup: false, error: "An unexpected error occurred during login." });
    }
});

// Handle signup form submission
app.post('/signup', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.render('index', { isSignup: true, error: "Name, Email, and Password are required!" });
    }

    try {
        const existingUser = await db.collection('users').findOne({ email });

        if (existingUser) {
            return res.render('index', { isSignup: true, error: "Email is already registered!" });
        }

        await db.collection('users').insertOne({ name, email, password });
        res.redirect('/');
    } catch (err) {
        console.error("Error during signup:", err);
        res.render('index', { isSignup: true, error: "An unexpected error occurred during signup." });
    }
});

app.get('/profile', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await db.collection('users').findOne({ email });

        if (!user) {
            return res.status(404).send("User not found.");
        }

        res.render('profile', { user });
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).send("Error fetching profile.");
    }
});

//delete users
app.post('/delete', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send("Email is required to delete user!");
    }

    try {
        const result = await db.collection('users').deleteOne({ email });
        if (result.deletedCount === 0) {
            return res.status(404).send(`
                <p>User not found. Try to log in to another account.</p>
                <a href="/">Here</a>`);
        }
        res.send("User deleted successfully!");
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).send("Error deleting user.");
    }
});

app.get('/search', async (req, res) => {
    const {query} = req.query;
    try {
        const users = await db.collection('users').find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).toArray();

        res.render('search', { users });
    } catch (err) {
        console.error("Error searching users:", err);
        res.status(500).send("Error searching users.");
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
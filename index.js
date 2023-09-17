const express = require('express');
const app = express();
const connectFunction = require('./database');

app.listen(
    process.env.PORT,
    () => console.log(`alive on http://localhost:${process.env.PORT}`)
)
// middleware to parse JSON in request body
app.use(express.json());

// middleware to connect to mongodb client
app.use(async (req, res, next) => {
    try {
        // connect to db using database.js file
        const client = await connectFunction();

        // grabs db object from client and passes to route via req object
        const db = client.db('sample_db');
        req.db = db;

        // proceed to expressjs route
        next();
    } catch (error) {
        // handles all errors and prints for debugging
        console.log(error);
        res.status(500).send({message: 'Database connection error'});
    }
})


app.get('/user/:username', async (req, res) => {
    // grab username from request url parameters
    const { username } = req.params;

    // connect to collection and retrieve document with matching username
    try {
        const users = req.db.collection('Users');
        const query = { username: username };
        const user = await users.findOne(query);
        
        // if user is not found, return error message, otherwise return error
        if (!user) {
            res.status(404).send({message : "the requested user does not exist"});
        } else {
            res.status(200).send({user : user});
        }

    } catch (err) {
        console.log(err);
        res.status(400).send({message : `An error ocurred trying to retrieve data`});
    } finally {
        if (req.db) {
            await req.db.client.close();
        }
    }
});

app.post('/user', async (req, res) => {
    // grab user from request body
    const newUser = req.body.user;

    // call helper function to validate requested user
    const validationResult = validateUserRequest(newUser);
    if (!validationResult.isValid) {
        return res.status(400).send({message : validationResult.message});
    }

    // connect to collection and insert newUser into database
    try {
        const users = req.db.collection("Users");

        // check if username is already taken
        const query = {username : newUser.username};
        const queriedUser = await users.findOne(query);
        if (queriedUser) {
            return res.status(400).send({message : "The requested username is already taken"});
        }

        // insert new user into the database
        newUser.isLoggedIn = false;
        await users.insertOne(newUser);
        res.status(200).send({
            message : "user added successfully",
            user : newUser
        });
    } catch (err) {
        console.log(err);
        res.status(422).send({message : "An error ocurred attempting to insert data"});
    } finally {
        // close MongoDB client
        if (req.db) {
            await req.db.client.close();
        }
    }
});

app.patch('/user/flipLogIn', async (req, res) => {
    const { user } = req.body;
    // call helper function to validate requested user
    const validationResult = validateUserRequest(user);
    if (!validationResult.isValid) {
        return res.status(400).send({message : validationResult.message});
    }

    // connect to database and edit existing document
    try {
        const users = req.db.collection("Users");

        // check if user exists
        const queriedUser = await users.findOne(user);
        if (!queriedUser) {
            return res.status(400).send({message : "The requested user does not exist"})
        }

        // flip user's loggedIn status
        const newLoginStatus = !queriedUser.isLoggedIn;
        await users.updateOne(
            queriedUser,
            { $set: {'isLoggedIn' : newLoginStatus}}
        );
        
        // determine whether user logged in or out and convert to message
        queriedUser.isLoggedIn = newLoginStatus;
        const inOrOut = newLoginStatus ? "in" : "out";
        const message = `user sucessfully logged ${inOrOut}`;

        res.status(200).send({
            message : message,
            user : queriedUser
        });
    } catch (err) {
        console.log(err);
        res.status(422).send({message : "An error ocurred attempting to edit data"});
    } finally {
        // close MongoDB client
        if (req.db) {
            await req.db.client.close();
            console.log("MongoDB client closed");
        }
    }
})


app.delete('/user/:username/:password', async (req, res) => {
    // grab requested username and password from request parameters, then construct user object
    const { username } = req.params;
    const { password } = req.params;
    const userToDelete = {
        username : username, 
        password : password
    };

    // connect to collection and delete matching document from database
    try {
        const users = req.db.collection("Users");
        
        // check that specified user exists in database, return 404 if not
        const queriedUser = await users.findOne(userToDelete);
        if (!queriedUser) {
            return res.status(404).send({message : "The requested user to delete was not found. Ensure that username and password are correct"});
        }

        // delete user from database
        await users.deleteOne(userToDelete);

        res.status(204).send({
            message : "user deleted successfully",
            deletedUser : userToDelete
        });
    } catch (err) {
        console.log(err);
        res.status(400).send({message : "An error ocurred attempting to delete data"});
    } finally {
        // close MongoDB client
        if (req.db) {
            await req.db.client.close();
            console.log("MongoDB client closed");
        }
    }
});

function validateUserRequest(user) {
    // create validation error message if necessary
    let message = "";
    if (!user) {
        message = "user object cannot be found";
        isValid = false;
    } else {
        if (!user.username) {
            message = "null or empty username field"};
            isValid = false;
        if (!user.password) {
            message = "null or empty password field";
            isValid = false;
        }
    }
    
    // true when all required fields are present, false otherwise
    isValid = !!user && !!user.username && !!user.password;
    return {
        isValid : isValid,
        message : message
    }
}
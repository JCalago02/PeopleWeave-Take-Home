const { MongoClient } = require("mongodb");
require('dotenv').configDotenv();

const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.PASSWORD}@peopleweavetakehome.wmdeede.mongodb.net/?retryWrites=true&w=majority`;


// exports function to connect to db
module.exports = async function connect() {
    try {
        const client = new MongoClient(uri);

        // returns mongodb client
        return client;

    } catch (error) {
        console.log(error);
    }
}
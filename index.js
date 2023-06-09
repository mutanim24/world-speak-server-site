const express = require("express")
const app = express();
const cors = require("cors");
// const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z12trsh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const classCollection = client.db("WorldSpeak").collection("classes");
        const userCollection = client.db("WorldSpeak").collection("users");

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result)
        })

        // my class for instructor
        app.get('/classes', async (req, res) => {
            const email = req.query.email;
            const query = {instructor_email: email};
            const result = await classCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/classes', async (req, res) => {
            const body = req.body;
            const result = await classCollection.insertOne(body);
            res.send(result)
        })

        // users
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("World Speak is running")
})

app.listen(port, () => {
    console.log(`world speak is running on ${port}`)
})
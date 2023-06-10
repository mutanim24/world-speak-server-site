const express = require("express")
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())

const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "unauthorize access" })
    }
    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: "unauthorize access" })
        }
        req.decoded = decoded;
        next();
    })
}

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

        // jwt
        app.post('/jwt', async (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.JWT_ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ token })
        })

        // class
        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result)
        })

        // my class for instructor
        app.get('/my-class', verifyJwt, async (req, res) => {
            const email = req.query.email;
            const query = { instructor_email: email };
            const result = await classCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/classes', verifyJwt, async (req, res) => {
            const body = req.body;
            const result = await classCollection.insertOne(body);
            res.send(result)
        })

        app.put('update-class/:id', async (req, res) => {
            const updatedBody = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    admin: 'admin'
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        // users
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = {email: user.email}
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already exist" })
            }
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
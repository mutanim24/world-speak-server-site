const express = require("express")
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
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
        // await client.connect();

        const classCollection = client.db("WorldSpeak").collection("classes");
        const selectedClassCollection = client.db("WorldSpeak").collection("selectedClasses");
        const userCollection = client.db("WorldSpeak").collection("users");
        const paymentCollection = client.db("WorldSpeak").collection("payment");

        // jwt
        app.post('/jwt', async (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.JWT_ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ token })
        })

        // verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== "admin") {
                return res.status(403).send({ error: true, message: "Forbidden Access" })
            }
            next()
        }

        // class
        app.get('/allclasses', verifyJwt, verifyAdmin, async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        });

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find({ class_status: "approved" }).sort({ enrolled_class: -1 }).toArray();
            res.send(result);
        });


        app.patch('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    class_status: req.body.class_status,
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.patch('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    feedback: req.body.feedback,
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // selected class
        app.get('/select-class', async (req, res) => {
            const email = req.query.email;
            const query = { userEmail: email };
            const result = await selectedClassCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/select-class', async (req, res) => {
            const body = req.body;
            const result = await selectedClassCollection.insertOne(body);
            res.send(result);
        })

        app.delete('/select-class/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedClassCollection.deleteOne(query);
            res.send(result);
        })

        // enrolled class
        app.get('/enrolledclass', async(req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
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

        // app.put('/my-class/update-class/:id', async (req, res) => {
        //     const updatedBody = req.body;
        //     const id = req.params.id;
        //     const filter = { _id: new ObjectId(id) };
        //     const options = { upsert: true };
        //     const updateDoc = {
        //         $set: {
        //             admin: 'admin'
        //         },
        //     };
        //     const result = await classCollection.updateOne(filter, updateDoc, options);
        //     res.send(result)
        // })

        // users
        app.get('/users', verifyJwt,  async (req, res) => { 
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;            
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already exist" })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        // admin or not
        app.get("/users/admin/:email", verifyJwt, async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === "admin" }
            res.send(result)
        })


        app.patch("/users/admin/:id", async (req, res) => {
            const id = req.params.id;
            const position = req.body.role;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: position,
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // instructor or not
        app.get("/users/instructor/:email", verifyJwt, async (req, res) => {
            const email = req.params.email;
            
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === "instructor" }
            res.send(result)
        })


        app.patch("/users/instructor/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: "instructor",
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // feedback handle
        app.patch("/insertFeedback/:id", async (req, res) => {
            const id = req.params.id;
            const feedback = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    feedback: feedback,
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        });





        //payment gateway
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: price * amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });


        app.post("/paymenthistory", async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            res.send(result);
        });

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
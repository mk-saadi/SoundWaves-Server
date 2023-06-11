const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
// const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 12000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "unauthorized access" });
    }
    const token = authorization.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
    });
};

//mongodb server
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mrt0xqs.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect(); // delete if vercel

        const classCollection = client.db("summerCamp12").collection("classes");
        const userCollection = client.db("summerCamp12").collection("users");

        // middleware
        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "10h",
            });

            res.send({ token });
        });

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== "admin") {
                return res.status(403).send({ error: true, message: "forbidden message" });
            }
            next();
        };

        // mongodb api
        app.get("/classes", async (req, res) => {
            const cursor = classCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get("/classes/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.findOne(query);
            res.send(result);
        });

        app.post("/classes", async (req, res) => {
            const figures = req.body;
            const result = await classCollection.insertOne(figures);
            res.send(result);
        });

        // users
        app.post("/users", (req, res) => {
            const user = req.body;
            userCollection
                .insertOne(user)
                .then((result) => {
                    res.send(result);
                })
                .catch((error) => {
                    res.status(500).send(error);
                });
        });

        app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
            const cursor = userCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        // admin routes api
        app.get("/users/admin/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false });
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === "admin" };
            res.send(result);
        });

        app.patch("/users/admin/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: "admin",
                },
            };

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // instructor routes api
        app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instructor: true });
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === "instructor" };
            res.send(result);
        });

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

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("summer camp is over!");
});

app.listen(port, () => {
    console.log(`summer camp was live on port ${port}`);
});

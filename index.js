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

        const userType = decoded.userType;
        if (userType !== "admin") {
            return res.status(403).send({ error: true, message: "Access forbidden" });
        }
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

        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "10h",
            });

            res.send({ token });
        });

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

/* --------------------------------- ignore --------------------------------- */
// // Make Instructor route
// app.post("/admin/make-instructor/:userId", verifyJWT, async (req, res) => {
//     try {
//         const { userId } = req.params;
//         // Update the user role as instructor in the MongoDB collection based on the provided userId
//         const result = await userCollection.updateOne(
//             { _id: ObjectId(userId) },
//             { $set: { role: "instructor" } }
//         );
//         if (result.modifiedCount === 0) {
//             return res.status(404).send({ error: true, message: "User not found" });
//         }
//         res.send({ message: "User role updated to instructor" });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send({ error: true, message: "Internal server error" });
//     }
// });

// // Make Admin route
// app.post("/admin/make-admin/:userId", verifyJWT, async (req, res) => {
//     try {
//         const { userId } = req.params;
//         // Update the user role as admin in the MongoDB collection based on the provided userId
//         const result = await userCollection.updateOne(
//             { _id: ObjectId(userId) },
//             { $set: { role: "admin" } }
//         );
//         if (result.modifiedCount === 0) {
//             return res.status(404).send({ error: true, message: "User not found" });
//         }
//         res.send({ message: "User role updated to admin" });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send({ error: true, message: "Internal server error" });
//     }
// });

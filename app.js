const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();

app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    console.log('decoded', decoded);
    req.decoded = decoded;
    next();
  });
}

// Connection URI
const uri = process.env.DB;

const client = new MongoClient(uri);
async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Establish and verify connection

    console.log('Connected successfully to server');

    const inventoryCollection = client.db('geniusCar').collection('service');

    app.post('/login', async (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1d',
      });
      res.send({ accessToken });
    });

    app.get('/inventory', async (req, res) => {
      const query = {};
      const cursor = inventoryCollection.find(query);
      const inventories = await cursor.toArray();
      res.send(inventories);
    });

    app.get('/inventory/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };
      const inventory = await inventoryCollection.findOne(query);
      console.log(inventory);
      res.send(inventory);
    });
    app.put('/delivered/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };

      const inventory = await inventoryCollection.findOne(query);
      const newQuantity = inventory.quantity;
      if (newQuantity < 1) {
        return;
      }
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          quantity: newQuantity - 1,
        },
      };

      const result = await inventoryCollection.updateOne(
        query,
        updateDoc,
        options,
      );
      const inventory2 = await inventoryCollection.findOne(query);
      console.log(inventory2);
      res.send(inventory2);
    });

    app.put('/restock/:id', async (req, res) => {
      const id = req.params.id;
      const restock = req.query.value;
      console.log(typeof restock);
      const query = { _id: ObjectId(id) };

      const inventory = await inventoryCollection.findOne(query);
      const newQuantity = inventory.quantity;

      const options = { upsert: true };
      const updateDoc = {
        $set: {
          quantity: parseInt(newQuantity) + parseInt(restock),
        },
      };

      const result = await inventoryCollection.updateOne(
        query,
        updateDoc,
        options,
      );
      const inventory2 = await inventoryCollection.findOne(query);
      console.log(inventory2);
      res.send(inventory2);
    });

    app.delete('/inventory/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };
      const inventory = await inventoryCollection.deleteOne(query);
      console.log(inventory);
      res.send(inventory);
    });

    app.post('/inventory', async (req, res) => {
      const item = req.body.item;
      console.log(item);
      const result = await inventoryCollection.insertOne(item);
      res.send(result);
    });

    app.get('/myItem', verifyJWT, async (req, res) => {
      const uid = req.query.uid;
      const email = req.query.email;

      const query = { email };
      const cursor = inventoryCollection.find(query);
      const inventories = await cursor.toArray();
      console.log(inventories);
      res.send(inventories);
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log('App is running on port 5000');
});

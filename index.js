const express = require('express');
require('dotenv').config();
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express()
const prot = process.env.PROT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5174',
    'https://job-protal-925b2.web.app',
    'https://job-protal-925b2.firebaseapp.com'
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);
  if (!token) {
    return res.status(401).send({ message: 'Unauthoright' })
  }

  // verify Token
  jwt.verify(token, process.env.TOKEN_ACCESS, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unaajsdfljd' })
    }

    req.user = decoded;
    console.log(req.user.userEmail);
    next()
  })

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g9i8u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClien
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

    const jobCollection = client.db('Job-Protal').collection('jobs');
    const jobApplyCollection = client.db('Job-Protal').collection('job-apply');

    // Auth relative 
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_ACCESS, { expiresIn: '5h' })
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
        .send({ success: true })
    });
    app.post('/logOut', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
        .send({ success: true })
    })

    // jobs api 
    app.get('/jobs', async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email }
      }
      const cousur = jobCollection.find(query);
      const result = await cousur.toArray();
      res.send(result)
    })

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const qurey = { _id: new ObjectId(id) }
      const result = await jobCollection.findOne(qurey)
      res.send(result)
    })
    app.post('/jobs', async (req, res) => {
      const newjob = req.body;
      const result = await jobCollection.insertOne(newjob)
      res.send(result)
    })
    //jobApplycations
    app.get('/job-applycation', verifyToken, async (req, res) => {
      const email = req.query.email;
      const qurey = { apply_cationEmail: email }
      const result = await jobApplyCollection.find(qurey).toArray();


      console.log(req.cookies.email);
      if (req.user.userEmail !== req.query.email) {
        return res.status(403).send({ massage: 'fordiden' })
      }


      for (const applecation of result) {
        console.log(applecation.job_id);
        const qurey = { _id: new ObjectId(applecation.job_id) }
        const job = await jobCollection.findOne(qurey)
        if (job) {
          applecation.title = job.title;
          applecation.company = job.company;
          applecation.company_logo = job.company_logo;
          applecation.location = job.location;
        }
      }
      res.send(result)
    })

    app.get('/job-applycations/jobs/:job_id', async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId }
      const result = await jobApplyCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/job-applycations', async (req, res) => {
      const application = req.body;
      const result = await jobApplyCollection.insertOne(application)
      //application id
      const id = application.job_id;
      const qurey = { _id: new ObjectId(id) }
      const job = await jobCollection.findOne(qurey)
      let newCount = 0;
      if (job.applicationCount) {
        newCount = job.applicationCount + 1;
      }
      else {
        newCount = 1;
      }
      //  update
      const filter = { _id: new ObjectId(id) }
      const updateDos = {
        $set: {
          applicationCount: newCount
        }
      }
      const updateResult = await jobCollection.updateOne(filter, updateDos)
      res.send(result)
    });

    app.put('/job-applycations/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: data.status
        },
      };
      const resut = await jobApplyCollection.updateOne(filter, updateDoc)
      res.send(resut)
    })

    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //  await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('This is my job protal')
})
app.listen(prot, () => {
  console.log(`This is my job ${prot}`);
})
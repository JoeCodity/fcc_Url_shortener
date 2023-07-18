require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require("body-parser");
const mongoose = require('mongoose');

const Mongo_URI = process.env['MONGO_URI']
mongoose.connect(Mongo_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let shortURL = new mongoose.Schema({
  short: {
    type: Number,
    required: true,
    unique: true
  },
  URL: {
    type: String,
    required: true
  }
});


let URL = mongoose.model('urldata', shortURL);

app.use(bodyParser.urlencoded({ extended: false })); // Needed middleware for parsing url
app.use(bodyParser.json());

app.use("/", (req, res, next) => {
  console.log(req.method + " " + req.path + " - " + req.ip);//Debug delete later
  next();
})

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.use('/api/deletedb', function(req, res) {
  URL.deleteMany({})
    .then(result => {
      console.log('Deleted:', result.deletedCount, 'documents');
    })
    .catch(error => {
      console.error('Error deleting users:', error);
    });

});

// When posting to url add url to database
app.post('/api/shorturl', async (req, res) => {
  // Get the latest shortUrl
  if (!isValidUrl(req.body.url)){
    res.json({ error: 'invalid url' })
    return
  }
  try {
    let shortUrl;
    const checkAvailability = await URL.findOne({ URL: req.body.url })
      .exec();
    if (!checkAvailability) {
      console.log(`Entry not There`)
      const maxShort = await URL.findOne({})
        .sort({ short: -1 })
        .limit(1)
        .exec();

      console.log(`Maxshort is ${maxShort}`)
      if (!maxShort) {
        shortUrl = 1;
      } else {
        shortUrl = maxShort.short + 1;
      }
      // Create a new URL document and save it to the database
      const newURL = new URL({
        URL: req.body.url,
        short: shortUrl,
      });

      await newURL.save();
    } else {
      console.log(`Entry There`)
      shortUrl = checkAvailability.short
    }

    res.status(200).json({ original_url : req.body.url, short_url : shortUrl});
    
  }
  catch (error) {
    console.error('Error adding URL:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

})
  ;
app.get('/api/shorturl/:id', async (req, res) => {
  try{
  const redirectURL = await URL.findOne({ short: req.params.id })
      .exec();
    res.redirect(redirectURL.URL)
  
  }
  catch(err){
    res.json({error: `Short ${req.params.id} not found`})
  }
  
  //res.redirect('https://google.com');
});

function isValidUrl(inputUrl) {
  const urlPattern = /^(https?:\/\/)?([a-z0-9.-]+)\.([a-z]{2,})(:[0-9]+)?(\/.*)?$/i;
  return urlPattern.test(inputUrl);
}


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});


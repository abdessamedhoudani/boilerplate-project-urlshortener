require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const mongoose = require('mongoose');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

const port = process.env.PORT || 3000;

// ✅ Connexion MongoDB
mongoose.set('strictQuery', false);
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// ✅ Schema et Model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', function(req, res) {
  const original_url = req.body.url;
  let host;

  try {
    host = new URL(original_url).hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(host, async function(err, address) {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    // Vérifier si l'URL existe déjà
    const existing = await Url.findOne({ original_url });
    if (existing) {
      return res.json({
        original_url: existing.original_url,
        short_url: existing.short_url
      });
    }

    // Générer le prochain short_url
    const count = await Url.countDocuments();
    const short_url = count + 1;

    // Sauvegarder dans MongoDB
    const newUrl = new Url({ original_url, short_url });
    await newUrl.save();

    res.json({
      original_url: original_url,
      short_url: short_url
    });
  });
});

app.get('/api/shorturl/:short_url', async function(req, res) {
  const short_url = parseInt(req.params.short_url);
  const found = await Url.findOne({ short_url });

  if (found) {
    res.redirect(found.original_url);
  } else {
    res.json({ error: 'No short URL found for the given input' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
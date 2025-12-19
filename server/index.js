const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views')); // Always correct

const PORT = process.env.PORT || 3000;

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Express server is running!');
});

app.get('/test', (req, res) => {
  res.render('test');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
var express = require('express')
var path = require('path');
var bodyParser = require('body-parser')

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'build')))

app.get('/auth/check', (req, res) => {
    if (req.cookie) {
        return true
    } else {
        return false
    }
})

app.get('/*', (req, res) => {
    if (!req.cookie) {
        res.redirect('/login')
    } else {
        res.sendFile(path.join(__dirname, 'build', 'index.html'))
    }
})

app.listen(5000, () => {
    console.log('ok')
})
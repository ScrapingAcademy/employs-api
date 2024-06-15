const express = require("express")
const app = express()
const port = 3000
const mongoose = require("mongoose");

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`app listening in port ${port}`)
})
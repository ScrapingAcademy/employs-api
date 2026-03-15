const express = require('express')
const jobsRoutes = require("./routes/jobs.routes")

const pkg = require('../package.json')
const port = process.env.PORT || 3000

const app = express()
app.use(express.json())
app.use('/jobs', jobsRoutes)

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Employs API is running',
        version: pkg.version,
        timestamp: new Date().toISOString(),
        // environment: process.env.NODE_ENV || 'development'
    })
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
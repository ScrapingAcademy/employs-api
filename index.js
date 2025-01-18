const express = require('express')
const app = express()
const port = 3000
const scraper = require('./src/scraper.js')

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/jobs', async (req, res) => {
    const searchQuery = req.query.search
    const limit = req.query.limit

    if(!searchQuery) {
        return res.status(400).send({ error: 'Search query is required' })
    }

    try {
        const result = await scraper.searchJobs(searchQuery, limit);
        res.send(result);
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch jobs' });
    }
})

app.listen(port, () => {
    console.log(`app listening in port ${port}`)
})
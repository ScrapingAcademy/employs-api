const express = require('express')
const { searchJobs } = require('./src/scraper')

const app = express()
const port = Number(process.env.PORT || 3000)

app.use(express.json())

app.get('/', (_req, res) => {
  res.send({ name: 'employs-api', status: 'ok' })
})

app.get('/jobs', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const rawLimit = req.query.limit

    if (!search) {
      return res.status(400).send({ error: 'Search query is required' })
    }

    let limit
    if (rawLimit !== undefined) {
      limit = Number.parseInt(rawLimit, 10)
      if (Number.isNaN(limit) || limit <= 0 || limit > 50) {
        return res.status(400).send({ error: 'limit must be an integer between 1 and 50' })
      }
    }

    const result = await searchJobs(search, limit)
    return res.send({ count: result.length, items: result })
  } catch (error) {
    return next(error)
  }
})

app.use((error, _req, res, _next) => {
  console.error('[error]', error)
  if (res.headersSent) {
    return
  }

  return res.status(500).send({ error: 'Failed to fetch jobs' })
})

app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})

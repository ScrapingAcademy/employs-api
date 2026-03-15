exports.slicePagination = (urls, limit, cursor) => {
  const start = cursor
  const end = start + limit

  const items = urls.slice(start, end)
  const nextCursor = end < urls.length ? end : null

  return {
    items,
    nextCursor
  }
}
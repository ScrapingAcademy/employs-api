const test = require('node:test')
const assert = require('node:assert/strict')

const { contactScraper, normalizeDateTime, parseLabelValue } = require('../src/scraper')

test('normalizeDateTime removes trailing parenthesis section and normalizes spaces', () => {
  const value = normalizeDateTime('12/03/2026 10:00 (há 2 horas)')
  assert.equal(value, '12/03/2026 10:00')
})

test('parseLabelValue extracts text after label', () => {
  const value = parseLabelValue(['Descrição: Limpeza geral'], 'Descrição')
  assert.equal(value, 'Limpeza geral')
})

test('contactScraper parses email pattern', () => {
  const line = 'Interessados encaminhar currículo aos cuidados de RH para e-mail contato@empresa.com com a sigla LIMPEZA no campo assunto até o dia 30/04/2026.'
  const parsed = contactScraper(line)

  assert.equal(parsed.type, 'email')
  assert.equal(parsed.email, 'contato@empresa.com')
  assert.equal(parsed.subject, 'LIMPEZA')
  assert.equal(parsed.deadline, '30/04/2026')
})

import fs from 'fs'
import path from 'path'

// The database, its Storage and the OMR VM all live in Korea (Supabase
// ap-northeast-2, NAVER Cloud). Functions in iad1 paid a trans-Pacific round
// trip for every query, which was most of the 1.6–3.9s the public list took on
// a cache miss (#187, D-092). Moving them away from the data brings that back.
describe('Vercel function region', () => {
  it('runs functions in Seoul, next to the database', () => {
    const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../vercel.json'), 'utf8'))
    expect(config.regions).toEqual(['icn1'])
  })
})

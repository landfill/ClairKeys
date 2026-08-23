/**
 * @jest-environment node
 */
import { getOmrServiceUrl, OmrServiceNotConfiguredError } from '../serviceUrl'

/**
 * `OMR_SERVICE_URL` is typed into a Vercel dashboard by a person, so the
 * realistic failure is a malformed value rather than an absent one.
 *
 * Checking only for emptiness sent every malformed value down the same path as
 * a network outage: the upload route's `catch` classified it
 * `OMR_SERVICE_UNAVAILABLE` and told the user to try again later. Nothing about
 * a missing scheme improves by retrying, and the operator — the only person who
 * can fix it — was told nothing at all.
 *
 * That is the defect this PR exists to remove, one layer up. It removed a
 * default that pointed at a host nobody had deployed; this removes the same
 * concealment for a value nobody can reach. Both are configuration facts
 * arriving dressed as transient failures.
 *
 * The cases below are the ones an actual person produces. `example.com:3000`
 * is the subtle one: `new URL` accepts it, reading `example.com:` as the
 * scheme, so parsing alone is not enough — the scheme has to be checked.
 */

describe('getOmrServiceUrl', () => {
  const original = process.env.OMR_SERVICE_URL

  afterEach(() => {
    if (original === undefined) delete process.env.OMR_SERVICE_URL
    else process.env.OMR_SERVICE_URL = original
  })

  describe('values that are usable', () => {
    it('returns an absolute http URL unchanged', () => {
      process.env.OMR_SERVICE_URL = 'http://101.79.16.73:3000'
      expect(getOmrServiceUrl()).toBe('http://101.79.16.73:3000')
    })

    it('returns an absolute https URL unchanged', () => {
      process.env.OMR_SERVICE_URL = 'https://omr.example.com'
      expect(getOmrServiceUrl()).toBe('https://omr.example.com')
    })

    it('strips trailing slashes so the caller can append a path', () => {
      process.env.OMR_SERVICE_URL = 'http://101.79.16.73:3000///'
      expect(getOmrServiceUrl()).toBe('http://101.79.16.73:3000')
    })

    it('trims surrounding whitespace, which a paste often carries', () => {
      process.env.OMR_SERVICE_URL = '  http://101.79.16.73:3000  '
      expect(getOmrServiceUrl()).toBe('http://101.79.16.73:3000')
    })
  })

  describe('values that are not usable are configuration errors, not outages', () => {
    it.each([
      ['unset', undefined],
      ['empty', ''],
      ['whitespace only', '   '],
      ['a bare path', '/'],
      ['a host with no scheme', '101.79.16.73:3000'],
      ['a hostname with no scheme', 'omr.example.com'],
      ['a hostname and port read as a scheme', 'example.com:3000'],
      ['a mistyped scheme', 'htp://101.79.16.73:3000'],
      ['a non-HTTP scheme', 'ftp://101.79.16.73'],
      ['a file URL', 'file:///etc/passwd'],
    ])('throws OmrServiceNotConfiguredError for %s', (_label, value) => {
      if (value === undefined) delete process.env.OMR_SERVICE_URL
      else process.env.OMR_SERVICE_URL = value

      expect(() => getOmrServiceUrl()).toThrow(OmrServiceNotConfiguredError)
    })

    it('says which of the two problems it is, so an operator knows what to do', () => {
      delete process.env.OMR_SERVICE_URL
      expect(() => getOmrServiceUrl()).toThrow(/not set/i)

      process.env.OMR_SERVICE_URL = 'ftp://101.79.16.73'
      expect(() => getOmrServiceUrl()).toThrow(/http/i)
    })
  })

  describe('the error message does not leak the value', () => {
    /**
     * A URL can carry credentials. The upload route logs this error and echoes
     * its message in development, so putting the raw value in it would put a
     * password in a log. The scheme alone is enough to diagnose the problem.
     */
    it('omits userinfo from the message', () => {
      process.env.OMR_SERVICE_URL = 'ftp://admin:hunter2@101.79.16.73'

      expect(() => getOmrServiceUrl()).toThrow(OmrServiceNotConfiguredError)
      try {
        getOmrServiceUrl()
      } catch (error) {
        const message = (error as Error).message
        expect(message).not.toContain('hunter2')
        expect(message).not.toContain('admin')
        expect(message).not.toContain('101.79.16.73')
      }
    })
  })
})

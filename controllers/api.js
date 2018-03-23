const BlitzQuery = require('blitz-js-query')
const EndpointController = require('./endpoints.js')
const CircularJSON = require('circular-json') // required for passing req object

/**
 * Connects to local API Node & handles basic cycles
 */
class Client {
  /**
   * Connect to blitz.js API node
   */
  constructor (config) {
    this.config = config

    // blitz-js-query options
    let options = {

      // Connection Settings
      api_url: config.apiUrl,
      auth_url: config.authUrl,
      use_socket: true,
      namespace: '/root',
      ignore_limiter: true,

      // Authentication Settings
      user_key: config.userKey,
      user_secret: config.userSecret
    }

    // Connect to api-node
    this.api = new BlitzQuery(options)

    // Load Endpoint Controller
    this.endpointController = new EndpointController(config)
    this.init()
  }

  /**
   * Initialization method called by EndpointHandler after passing methods
   */
  init () {
    // Listen to incoming requests & send config
    this.listen()

    // Listen on Reconnect
    let name = this.config.master ? this.config.master + ' core' : 'core'
    this.api.on('connect', () => {
      blitz.log.verbose(`${this.config.prefix} | connected to target API`)
    })

    this.api.on('disconnect', () => {
      blitz.log.verbose(`${this.config.prefix} | disconnected from target API`)
    })
  }

  /**
   * Listen to incoming requests to be processed
   */
  listen () {
    this.listenForChecks()
    this.listenForRequests()
  }

  /**
   * Listen to incoming file checks
   */
  listenForChecks () {
    this.api.on('check', async req => {
      // Check if file available
      try {
        await this.endpointController.getEndpoint(req.url, req.method)
        blitz.log.silly(`${this.config.prefix} | Check successful`)
        this.api.emit(req.id, {
          available: true
        })
      }

      // Not available -> let other nodes respond
      catch (err) {
        blitz.log.silly(`${this.config.prefix} | Checked file not available`)
        this.api.emit(req.id, {
          available: false
        })
      }
    })
  }

  /**
   * Listen to incoming requests
   */
  listenForRequests () {
    this.api.on('req', async req => {
      blitz.log.silly(`${this.config.prefix} | Request received`)
      req = CircularJSON.parse(req)

      let res = await this.endpointController.getResponse(req, this.api)
      blitz.log.silly(`${this.config.prefix} | Request resolved`)
      this.api.emit(req.id, res)
    })
  }
}

module.exports = Client

const fs = require('fs')
const EndpointController = require('cubic-core/controllers/endpoints.js')

/**
 * Endpoint controller which implicitly uses the default endpoint for all
 * requests if no explicit endpoint is given. They would all just call
 * `this.render(req)` anyway, so this abstraction saves a lot of time.
 */
class Endpoints extends EndpointController {
  /**
   * Get endpoint schema from src/pages folder instead of endpoint folder alone
   */
  generateEndpointSchema () {
    this.endpoints = []
    this.getEndpointTree(this.config.endpointPath)
    this.getViewTree(`${cubic.config.ui.sitesPath}`)

    // Reorder items which must not override previous url's with similar route
    // e.g. /something/:id must not be routed before /something/else
    let pushToStart = []
    let pushToEnd = []
    this.endpoints.forEach(endpoint => {
      if (endpoint.route.includes(':')) pushToEnd.push(endpoint)
      else pushToStart.push(endpoint)
    })
    this.endpoints = pushToStart.concat(pushToEnd)
  }

  /**
   * Change which file types are detected and change endpoint attributes
   */
  getViewTree (filepath) {
    let stats = fs.lstatSync(filepath)

    // Folder
    if (stats.isDirectory()) {
      fs.readdirSync(filepath).map(child => {
        return this.getViewTree(filepath + '/' + child)
      })
    }

    // File -> Set endpoint config
    else {
      let Endpoint = cubic.nodes.ui.core.Endpoint
      let endpoint = new Endpoint().schema
      let sitesSubDir = cubic.config.ui.sitesPath.replace(cubic.config.ui.sourcePath, '')
      endpoint.view = filepath.replace(`${cubic.config.ui.sourcePath}`, '')
      endpoint.route = endpoint.view.replace(sitesSubDir, '').replace('.vue', '').replace('index', '')
      endpoint.file = cubic.config.ui.core.endpointParent

      // Only add to list of endpoints if no explicit endpoint with same
      // route already exists
      if (!this.endpoints.find(e => e.route === endpoint.route)) {
        this.endpoints.push(endpoint)
      }
    }
  }
}

module.exports = Endpoints

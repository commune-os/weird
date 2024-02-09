import indexRoute from '../routes/index.js'
import notFoundRoute from '../routes/404.js'
import liveReloadRoute from '../routes/live-reload.dev.js'
import emailFormRoute from '../routes/email-form.js'
import accountLinkingRoute from '../routes/account-linking.js'

export default url => {
  let route = notFoundRoute

  // TODO urlpattern api + globbing so we can skip
  // this manual stuff below and the imports above

  if (url === '/') {
    route = indexRoute
  } else if (url === '/live-reload') {
    route = liveReloadRoute
  } else if (url.startsWith('/email-form')) {
    route = emailFormRoute
  } else if (url.startsWith('/account-linking')) {
    route = accountLinkingRoute
  } else if (url.startsWith('/actions/')) {
    //
    // TODO: clean this up
    const action = url.split('/').pop()

    return import(`../actions/${action}.js`).then(
      ({ default: actionRoute }) => {
        console.log('actionRoute', actionRoute)
        return actionRoute
      }
    )
    // TODO: glob actions on boot so we don't have to the promise dance
  }

  return route
}

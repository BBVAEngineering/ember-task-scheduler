import EmberRouter from '@ember/routing/router';
import config from 'dummy/config/environment';

<<<<<<< HEAD
const Router = EmberRouter.extend({
	location: config.locationType,
	rootURL: config.rootURL
});
||||||| parent of 72ed8ff... v3.10.0...v3.21.2
const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL
});
=======
export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}
>>>>>>> 72ed8ff... v3.10.0...v3.21.2

<<<<<<< HEAD
// Router.map(function() {
// });

export default Router;
||||||| parent of 72ed8ff... v3.10.0...v3.21.2
Router.map(function() {
});

export default Router;
=======
Router.map(function() {
});
>>>>>>> 72ed8ff... v3.10.0...v3.21.2

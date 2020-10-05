'use strict';

const getChannelURL = require('ember-source-channel-url');

<<<<<<< HEAD
module.exports = function() {
	return Promise.all([
		getChannelURL('release'),
		getChannelURL('beta'),
		getChannelURL('canary')
	]).then((urls) => ({
		scenarios: [
			{
				name: 'ember-lts-2.18',
				env: {
					EMBER_OPTIONAL_FEATURES: JSON.stringify({ 'jquery-integration': true })
				},
				npm: {
					devDependencies: {
						'@ember/jquery': '^0.5.1',
						'ember-source': '~2.18.0'
					}
				}
			},
			{
				name: 'ember-lts-3.4',
				npm: {
					devDependencies: {
						'ember-source': '~3.4.0'
					}
				}
			},
			{
				name: 'ember-release',
				npm: {
					devDependencies: {
						'ember-source': urls[0]
					}
				}
			},
			{
				name: 'ember-beta',
				npm: {
					devDependencies: {
						'ember-source': urls[1]
					}
				}
			},
			{
				name: 'ember-canary',
				npm: {
					devDependencies: {
						'ember-source': urls[2]
					}
				}
			},
			// The default `.travis.yml` runs this scenario via `npm test`,
			// not via `ember try`. It's still included here so that running
			// `ember try:each` manually or from a customized CI config will run it
			// along with all the other scenarios.
			{
				name: 'ember-default',
				npm: {
					devDependencies: {}
				}
			},
			{
				name: 'ember-default-with-jquery',
				env: {
					EMBER_OPTIONAL_FEATURES: JSON.stringify({
						'jquery-integration': true
					})
				},
				npm: {
					devDependencies: {
						'@ember/jquery': '^0.5.1'
					}
				}
			}
		]
	}));
||||||| parent of 72ed8ff... v3.10.0...v3.21.2
module.exports = function() {
  return Promise.all([
    getChannelURL('release'),
    getChannelURL('beta'),
    getChannelURL('canary')
  ]).then((urls) => {
    return {
      useYarn: true,
      scenarios: [
        {
          name: 'ember-lts-2.18',
          env: {
            EMBER_OPTIONAL_FEATURES: JSON.stringify({ 'jquery-integration': true })
          },
          npm: {
            devDependencies: {
              '@ember/jquery': '^0.5.1',
              'ember-source': '~2.18.0'
            }
          }
        },
        {
          name: 'ember-lts-3.4',
          npm: {
            devDependencies: {
              'ember-source': '~3.4.0'
            }
          }
        },
        {
          name: 'ember-release',
          npm: {
            devDependencies: {
              'ember-source': urls[0]
            }
          }
        },
        {
          name: 'ember-beta',
          npm: {
            devDependencies: {
              'ember-source': urls[1]
            }
          }
        },
        {
          name: 'ember-canary',
          npm: {
            devDependencies: {
              'ember-source': urls[2]
            }
          }
        },
        // The default `.travis.yml` runs this scenario via `yarn test`,
        // not via `ember try`. It's still included here so that running
        // `ember try:each` manually or from a customized CI config will run it
        // along with all the other scenarios.
        {
          name: 'ember-default',
          npm: {
            devDependencies: {}
          }
        },
        {
          name: 'ember-default-with-jquery',
          env: {
            EMBER_OPTIONAL_FEATURES: JSON.stringify({
              'jquery-integration': true
            })
          },
          npm: {
            devDependencies: {
              '@ember/jquery': '^0.5.1'
            }
          }
        }
      ]
    };
  });
=======
module.exports = async function() {
  return {
    useYarn: true,
    scenarios: [
      {
        name: 'ember-lts-3.16',
        npm: {
          devDependencies: {
            'ember-source': '~3.16.0'
          }
        }
      },
      {
        name: 'ember-lts-3.20',
        npm: {
          devDependencies: {
            'ember-source': '~3.20.5'
          }
        }
      },
      {
        name: 'ember-release',
        npm: {
          devDependencies: {
            'ember-source': await getChannelURL('release')
          }
        }
      },
      {
        name: 'ember-beta',
        npm: {
          devDependencies: {
            'ember-source': await getChannelURL('beta')
          }
        }
      },
      {
        name: 'ember-canary',
        npm: {
          devDependencies: {
            'ember-source': await getChannelURL('canary')
          }
        }
      },
      {
        name: 'ember-default-with-jquery',
        env: {
          EMBER_OPTIONAL_FEATURES: JSON.stringify({
            'jquery-integration': true
          })
        },
        npm: {
          devDependencies: {
            '@ember/jquery': '^1.1.0'
          }
        }
      },
      {
        name: 'ember-classic',
        env: {
          EMBER_OPTIONAL_FEATURES: JSON.stringify({
            'application-template-wrapper': true,
            'default-async-observers': false,
            'template-only-glimmer-components': false
          })
        },
        npm: {
          ember: {
            edition: 'classic'
          }
        }
      }
    ]
  };
>>>>>>> 72ed8ff... v3.10.0...v3.21.2
};

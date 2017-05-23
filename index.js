var SocketResponseTester = {}

// Attaches listeners to the relevant sockets,
// then fires a sequence (embodied in the form of a promise factory, which fires for the side-effects),
// then waits for the response from all those users
// and finally returns an array of the messages received by each socket, in the original order
SocketResponseTester.fire = function(sockets, promiseFactory) {
	// sockets should be 


	var that = this
	// The resolves object is used to carry resolves from a later stage
	// to a former stage in a bit of wizardy trickery. 
	var resolves = {}
	var storedPromises = [];

	// create the listener and attach to the respective clients
	// only after all have been attached do we fire the promise factory
	// utilize resolves from the latter stage in the listener up above, but resolve in the promises down below 
	return Promise.all(sockets.map((socket, index) => {
		return new Promise((resolve, reject) => {
			var listener = (data) => {
				socket.removeListener('message', listener)
				resolves[index](data)
			}
			socket.on('message', listener)
			resolve(true)
		})
	}))
	.then(() => {
	// need to store the resolves 
	// THEN fire the promiseFactory
	// THEN retrieve the promise that holds these stored promises 
		return Promise.all(sockets.map((socket, index) => {
			// This promise only returns when the stored promise that has been pushed 
			// into storedPromises has finished storing its resolve function to the resolves object.
			// Therefore, the Promise.all that encases this only returns when everything has been attached. 
			return new Promise((res, reje) => {
				storedPromises.push(new Promise((resolve, reject) => {
					resolves[index] = resolve
					res(true)
				}))
			})
		}))
	})
	.then(() => {
		return promiseFactory()
	})

	.then(() => {
		return Promise.all(storedPromises)
	})

}

module.exports = SocketResponseTester
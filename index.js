// Current solution falls apart when need to listen for the same kind of event more than 1 time. 
// complication is how to make it easy for users to understand and apply. What should the output consist of if we want to account for
// - different events
// - different number of each event

// Answer: array by default, and convert to single element without array if its multiple seems to be the answer.
// 	Returns:
//	{
//		id1: {
//			message: data,
//			news: [data, data]
//		}
//	}

//	What connections should look like
//	{
//		id1: {
//			socket: socket,
//			events: ['message', 'news', 'news'],
//			resolves: {
//				'message': [resolve],
//				'news': [resolve1, resolve2]
//			}
//		},
//		id2: {
//			...
//		}
//	}



var SocketResponseTester = (function() {

	return {

		build: function() {

			var connections = []
			var tester = {}
			var asyncs = []
			var resolves = {}
			var storedPromises = []
			var responses = {}

			tester.attachEvent = function(sockets, event) {
				// can be either a single socket, or an array of sockets
				if (sockets.length == undefined) {
					sockets = [sockets]
				}
				for (var i = 0; i < sockets.length; i++) {
					var conn = connections[socket.io.engine.id]
					if (!conn) {
						conn = {
							socket: socket,
							events: [],
							resolves: {}
						}
						connections[socket.io.engine.id] = conn
					}
					var listener = (data) => {
						socket.removeListener(event, listener);
						if (!responses[socket.io.engine.id]) {
							responses[socket.io.engine.id] = {}
						}
						if (!responses[socket.io.engine.id][event]) {
							responses[socket.io.engine.id][event] = []
						}
						responses[socket.io.engine.id][event].push(data)
						conn.resolves[event].shift()(true)
					}
					conn.events.push(event)
					conn.socket.on(event, listener)
				}
			}

			tester.attachAsynFunc = function(f) {
				asyncs.push(f)
			}

			tester.then = function(f) {
				// this mechanism creates promises whose resolves are stored for later use
				Object.keys(connections).forEach((id) => {
					storedPromises.concat(connections[id].events.map((event) => {
						return new Promise((resolve, reject) => {
							if (!connections[id].resolves[event]) {
								connections[id].resolves[event] = []
							}
							connections[id].resolves[event].push(resolve)
						})
					}))
				})
				asyncs.forEach((f) => {
					f()
				})
				return Promise.all(storedPromises)
				.then(() => {
					return f(responses)
				})
			}


		},

		fire: function(sockets, promiseFactory) {

			var that = this;
			var resolves = {};
			var storedPromises = [];

			return Promise.all(sockets.map((socket, index) => {
				return new Promise((resolve, reject) => {
					var listener = (data) => {
						socket.removeListener('message', listener);
						// use the resolves from the later stage
						resolves[index](data);
					}
					socket.on('message', listener);
					resolve(true);
				})
			}))
			.then(() => {
				sockets.forEach((socket, index) => {
					// this mechanism creates promises whose resolves are stored for later use
					storedPromises.push(new Promise((resolve, reject) => {
						resolves[index] = resolve;
					}))
				})
				return true;
			})
			.then(() => {
				return promiseFactory();
			})
			.then(() => {
				// at this point, wait for all stored promises to resolve, then return their values
				return Promise.all(storedPromises);
			})

		}

	}

}())

module.exports = SocketResponseTester;
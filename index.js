// Current solution falls apart when need to listen for the same kind of event more than 1 time. 
// complication is how to make it easy for users to understand and apply. What should the output consist of if we want to account for
// - different events
// - different number of each event

// Answer: array by default, and convert to single element without array if its multiple seems to be the answer.
// 	Returns:
//	{
//		id1: {
//			message: [data],
//			news: [data, data]
//		}
//	}

//	What connections should look like
//	{
//		id1: {
//			socket: socket,
//			events: {
//				message: 1,
//				news: 2
//			},
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
			var asyncs = []
			var resolves = {}
			var storedPromises = []
			var responses = {}

			var tester = {}

			tester.addEventWaiter = function(sockets, event) {
				// can be either a single socket, or an array of sockets
				if (sockets.length == undefined) {
					sockets = [sockets]
				}
				sockets.forEach((socket) => {
					var conn = connections[socket.io.engine.id]
					if (!conn) {
						conn = {
							socket: socket,
							events: {},
							resolves: {}
						}
						connections[socket.io.engine.id] = conn
					}
					if (!conn.events[event]) {
						conn.events[event] = 0
					}
					conn.events[event]++
				})
				return this
			}

			tester.queueFunction = function(f) {
				asyncs.push(f)
				return this
			}



			tester.then = function(f) {
				// attach listeners to listen for emit events. 
				Object.keys(connections).forEach((id) => {
					var conn = connections[id]
					Object.keys(conn.events).forEach((event) => {
						var listener = (data) => {
							// only remove the listener if all events have been caught
							conn.events[event]--
							if (conn.events[event] == 0) {
								conn.socket.off(event, listener);
							}
							if (!responses[conn.socket.io.engine.id]) {
								responses[conn.socket.io.engine.id] = {}
							}
							if (!responses[conn.socket.io.engine.id][event]) {
								responses[conn.socket.io.engine.id][event] = []
							}
							responses[conn.socket.io.engine.id][event].push(data)
							conn.resolves[event].shift()(true)
						}
						conn.socket.on(event, listener)
					})
				})
				// this mechanism creates promises whose resolves are stored for later use
				Object.keys(connections).forEach((id) => {
					var conn = connections[id]
					Object.keys(conn.events).forEach((event) => {
						for (var i = 0; i < conn.events[event]; i++) {
							storedPromises.push(new Promise((resolve, reject) => {
								if (!conn.resolves[event]) {
									conn.resolves[event] = []
								}
								conn.resolves[event].push(resolve)
							}))
						}
					})
				})
				asyncs.forEach((f) => {
					f()
				})
				return Promise.all(storedPromises)
				.then(() => {
					return f(responses)
				})
			}

			return tester


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
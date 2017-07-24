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



var SocketResponseTester = function() {

	var connections = {}
	var asyncs = []
	var resolves = {}
	var storedPromises = []
	var responses = {}

	return {

		registerSockets: function(sockets) {
			// sockets => {name1: socket1, name2: socket2}
			Object.keys(sockets).forEach((name) => {
				if (!connections[name]) {
					connections[name] = {
						socket: sockets[name],
						events: {},
						resolves: {}
					}
				} else {
					connections[name].socket = sockets[name]
				}
			})
			return this
		},

		addEventWaiter: function(names, event) {
			// can be either a single name or an array of names
			if (typeof(names) == 'string') {
				names = [names]
			} 
			// check that sockets are all registered
			names.forEach((name) => {
				if (!connections[name] || !connections[name].socket || connections[name].socket.disconnected) {
					throw new Error(name + ' is not a registered socket')
				}
			})
			// add events
			names.forEach((name) => {
				var conn = connections[name]
				if (!conn.events[event]) {
					conn.events[event] = 1
				} else {
					conn.events[event]++
				}
			})
			return this
		},

		queueFunction : function(f) {
			asyncs.push(f)
			return this
		},


		then: function(f) {
			// attach listeners to listen for emit events. 
			Object.keys(connections).forEach((name) => {
				var conn = connections[name]
				Object.keys(conn.events).forEach((event) => {
					var listener = (data) => {
						// only remove the listener if all events have been caught
						conn.events[event]--
						if (conn.events[event] == 0) {
							conn.socket.off(event, listener);
						}
						if (!responses[name]) {
							responses[name] = {}
						}
						if (!responses[name][event]) {
							responses[name][event] = []
						}
						responses[name][event].push(data)
						conn.resolves[event].shift()(true)
					}
					conn.socket.on(event, listener)
				})
			})
			// this mechanism creates promises whose resolves are stored for later use
			Object.keys(connections).forEach((name) => {
				var conn = connections[name]
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

	}

}

module.exports = SocketResponseTester;
var SocketResponseTester = (function() {

	return {

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
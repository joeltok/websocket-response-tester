var assert = require('chai').assert

// Convenient global variable to store all connected sockets on the server side
var clients = []

// Create server
// On message received from other end, send out messages to all connected clients
var server = require('http').createServer()
var io = require('socket.io')(server)
io.on('connection', function(client) {
	clients.push(client)
	console.log('One donkey connected.')
	client.on('message', (data) => {
		clients.forEach((c) => {
			if (c.connected) {
				c.send(data)
			}
		})
	})
	client.on('disconnect', () => {
		console.log('One donkey has disconnected. I think it is bored of carrying goods.')
	})
})
server.listen(3000)

// Create sockets
var socketGen = function(name) {
	var client = require('socket.io-client')('http://localhost:3000')
	client.on('connect', () => {
		console.log(name + ': brayyyy!')
	})
	return client
}
var donkeys = {
	blue: socketGen('blue'),
	pink: socketGen('pink'),
	teal: socketGen('teal')
}

// Call the module to test
var wrt = require('./../index.js')


// test cases
describe('echo from one donkey', function() {

	it('brayyyy', function(done) {
		wrt.fire(
			[donkeys.blue, donkeys.pink, donkeys.teal], 
			function() {
				return new Promise((resolve, reject) => {
					donkeys.blue.send('brayyyy')
					resolve(true)
				})
			}
		)
		.then((responses) => {
			responses.forEach((res) => {
				assert.equal(res, 'brayyyy')
			})
			done()
		})
	})

	it('cloink', function(done) {
		wrt.fire(
			[donkeys.blue, donkeys.pink, donkeys.teal], 
			function() {
				return new Promise((resolve, reject) => {
					donkeys.teal.send('cloink')
					resolve(true)
				})
			}
		)
		.then((responses) => {
			responses.forEach((res) => {
				assert.equal(res, 'cloink')
			})
			done()
		})
	})

})


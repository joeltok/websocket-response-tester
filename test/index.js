var assert = require('chai').assert

// Convenient global variable to store all connected sockets on the server side
var clients = []

// Create server
// On message received from other end, send out messages to all connected clients
var server = require('http').createServer()
var io = require('socket.io')(server)
io.on('connection', function(client) {

	clients.push(client)
//	console.log('One donkey connected.')

	client.on('message', (data) => {
		clients.forEach((c) => {
			if (c.connected) {
				c.emit('message', data)
			}
		})
	})

	client.on('animal sound', (data) => {
		clients.forEach((c) => {
			if(c.connected) {
				if (data == 'brayyyy') {
					c.emit('animal sound', 'good boy')
				} else {
					c.emit('animal sound', 'you are supposed to be a donkey')
				}
			}
		})
	})

	client.on('disconnect', () => {
		console.log('One donkey has disconnected. I think it is bored of carrying goods.')
	})
})
server.listen(3000)

// Create sockets
var socketGen = function() {
	return new Promise((resolve, reject) => {
		var client = require('socket.io-client')('http://localhost:3000')
		client.on('connect', () => {
			resolve(client)
		})

	}) 
	
}

// Call the module to test
var wrt = require('./../index.js')


// test cases
describe('Test builder', function() {

	var donkeys;

	before('Create the sockets', function(done) {
		Promise.all([socketGen(), socketGen(), socketGen()])
		.then((sockets) => {
			donkeys = {
				blue: sockets[0],
				pink: sockets[1],
				teal: sockets[2]
			}
			done()
		})
	})

	it('# One socket with one event', function(done) {
		wrt()
		.registerSockets(donkeys)
		.addEventWaiter('blue', 'animal sound')
		.queueFunction(() => {
			donkeys.blue.emit('animal sound', 'oink oink')
		})
		.then((responses) => {
			assert.equal(responses['blue']['animal sound'][0], 'you are supposed to be a donkey')
			done()
		})

	})

	it('# Socket array with one event', function(done) {
		wrt.build()
		.addEventWaiter([donkeys.pink, donkeys.teal], 'message')
		.queueFunction(() => {
			donkeys.blue.emit('message', 'brayyyy')
		})
		.then((responses) => {
			assert.equal(responses[donkeys.pink.io.engine.id]['message'][0], 'brayyyy')
			assert.equal(responses[donkeys.teal.io.engine.id]['message'][0], 'brayyyy')
			done();
		})
	})

	it('# Socket array with layered events', function(done) {
		wrt.build()
		.addEventWaiter([donkeys.blue, donkeys.pink, donkeys.teal], 'message')
		.addEventWaiter([donkeys.blue, donkeys.pink], 'message')
		.addEventWaiter(donkeys.teal, 'animal sound')
		.queueFunction(() => {
			donkeys.blue.emit('message', 'hey!')
			donkeys.blue.emit('message', 'moo?')
			donkeys.blue.emit('animal sound', 'brayyyy')
		})
		.then((responses) => {
			assert.equal(responses[donkeys.blue.io.engine.id]['message'][0], 'hey!')
			assert.equal(responses[donkeys.pink.io.engine.id]['message'][0], 'hey!')
			assert.equal(responses[donkeys.teal.io.engine.id]['message'][0], 'hey!')
			assert.equal(responses[donkeys.blue.io.engine.id]['message'][1], 'moo?')
			assert.equal(responses[donkeys.pink.io.engine.id]['message'][1], 'moo?')
			assert.equal(responses[donkeys.teal.io.engine.id]['animal sound'][0], 'good boy')
			done()			
		})
	})

})


describe('Test fire (deprecated)', function() {

	it('# brayyyy', function(done) {
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

	it('# cloink', function(done) {
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


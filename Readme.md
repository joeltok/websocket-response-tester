# Websocket Tester

## Introduction

The objective of this module is to effectively test asynchronous message events from websocket connections. This module has only been tested with socket.io. 

The difficulty involved with testing websocket message events arise in particular during indirect trigger events. This occurs when a message is sent to the socket *not as a result of a write from the socket itself*. Examples of use cases are:
- Socket A writes to its counterparty socket, which then receives the message and sends out messages to sockets B, C and D. In this case, we must test that sockets B, C and D have received the message. 
- An HTTP call from a secondary source - maybe an admin user wishing to trigger an event - results in several sockets receiving messages. Again, we have to test that these sockets have received the correct messages. 

One of the ways to overcome this problem is by the use of setTimeout in Node.js to check periodically for any changes in non-local state variables. The downsides of this approach are 
1. The pollution of higher scope environments.
2. The need for custom code to hook up messages to the respective clients at the start, then remove them after the third-party trigger has done its work.
3. The need for waiting time while polls take time to happen.

A more elegant way to approach the problem is via the use of delayed promises. 

## Installation

```bash
npm install socket.io --save
```

## How to use

```js
var WRT = require('websocket-response-tester')
WRT.fire(sockets, promiseFactory)
.then((messages) => {
	console.log(messages)
})
```

where,
- sockets: an array of socket connections.
- promiseFactory: a function that returns a promise,  This mechanism exists to ensure that the promise is not fired until we want to fire it in the module code. 
- messages: the messages from the on 'message' event handler on each socket, ordered according to the 'sockets' array order

Example Promise Factory

```js
var promiseFactory = function() {
	return new Promise((resolve, reject) => {
		// do something...

		resolve(true)
	})
}
```

## Testing

Fork and download this repository.

```bash
cd websocket-response-tester
npm test
```

This spins up a node.js server that 
- Starts up a server with some server side socket.io code
- Starts up 3 client sockets that connect to the server
- Requires this module 
- Uses this module to send messages to the server and test the messages sent back to the client side sockets
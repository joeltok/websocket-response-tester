## Introduction

Effectively test asynchronous message events from websocket connections. Only tested with socket.io. 

The difficulty involved with testing websocket message events arise in particular during indirect trigger events. This occurs when a message is sent to the socket *not as a result of a write from the socket itself*. Examples of use cases are:
- Socket A writes to its counterparty socket, which then receives the message and sends out messages to sockets B, C and D. In this case, we must test that sockets B, C and D have received the message. 
- An HTTP call from a secondary source - maybe an admin user wishing to trigger an event - results in several sockets receiving messages. Again, we have to test that these sockets have received the correct messages. 

The ideal scenario in the above is
1. The sockets have listeners attached
2. An event is triggered that sends messages to the above sockets
3. Somehow catch the messages and only proceed if all messages are received. 

One of the ways to deal with this flow is by the use of setTimeout in Node.js to check periodically for any changes in non-local state variables to which any messages from the sockets are diverted. The downsides of this approach are 
- The need for waiting time while polls take time to happen.
- The potential for pollution of higher scope environments.
- The need for custom code to hook up messages to the respective clients at the start, then remove them after the third-party trigger has done its work.

A more elegant way to approach the problem is via the use of **delayed promises**, which this module uses. 

## Installation

```bash
npm install websocket-response-tester --save
```

## How to use

```js
// require the module
var WRT = require('websocket-response-tester')

// call the function from the module.
// then is only called after all sockets have received a message.
// if any of the sockets fails to receive a message, then is never called, and the code just stalls and waits indefinitely.
// this is not an issue for mocha test cases, which have a timeout of 2000ms.
// future implementations of this module can implement a timer option.
WRT.fire(sockets, promiseFactory)
.then((messages) => {
	console.log(messages)
})
```

where,
- sockets: an array of socket connections.
- promiseFactory: a function that returns a promise,  This mechanism exists to ensure that the promise is not fired until we want to fire it in the module code. 
- messages: the messages received from the 'message' event handler on each socket, ordered according to the 'sockets' array order

Example Promise Factory

```js
var promiseFactory = function() {
	return new Promise((resolve, reject) => {
		// do something that should trigger messages being received by the sockets in the sockets array...

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
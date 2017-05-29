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
npm install websocket-response-tester --save-dev
```

## Simple Usage

```js
var WRT = require('websocket-response-tester')

var socket = require('socket.io-client')('http://localhost:3000')
console.log(socket.io.engine.id) // to get the socketUniqueId

WRT.build()
.addEventWaiter(socket, 'message')
.queueFunction(() => {
	// do something that should trigger messages being received by the socket

})
.then((responses) => {
	console.log(responses) 
})
```

Then is only called after the socket has received the stated event. If the socket fails to receive a message, then is never called, and the code just stalls and waits indefinitely. This is not an issue for mocha test cases, which have a timeout of 2000ms.


```javascript
// Responses are of the form
{
	socketUniqueId1: {
		eventTitle1: [data]
	},
	socketUniqueId2: {
		eventTitle2: [data, data],
		eventTitle3: [data3]
	}
}
```

## Advanced Usage

- Each socket can have multiple event waiters attached.
- Event waiters can be stacked, i.e. one socket can wait for multiple events of the same kind. Then only fires after all of the attached events are returned. In the above example, socket1 and socket2 will wait for 2 'message' events each, while socket3 will wait for 1 'message' event and 1 'news' event. 

```js
var WRT = require('websocket-response-tester')

var socket1 = require('socket.io-client')('http://localhost:3000')
var socket2 = require('socket.io-client')('http://localhost:3000')
var socket3 = require('socket.io-client')('http://localhost:3000')

WRT.build()
.addEventWaiter([socket1, socket2, socket3], 'message')
.addEventWaiter([socket1, socket2], 'message')
.addEventWaiter(socket3, 'news')
.queueFunction(() => {
	// do something that should trigger messages being received by the socket

})
.then((responses) => {
	console.log(responses) 
})
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

## Contributions

To-do:
- timer option that throws an error, so that the code doesn't stall and wait indefinitely.

Contributions are welcome. For questions, please contact me at jtok.dev@gmail.com
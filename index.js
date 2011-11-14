var ws = require('./node-websocket-server/lib/ws/server');
var server = ws.createServer();

var connections = {};
server.addListener('connection', function(conn){

  // setup the connection map
  connections[conn.id] = {};
  connections[conn.id].client = conn;
  connections[conn.id].context = undefined;
  connections[conn.id].lastMessage = new Date();
  console.log('Opened connection with '+conn.id+'.');

  // add the main listener  
  conn.addListener('message', function(message){
    
    // check what type of message this is
    message = JSON.parse(message);

    // store the last date
    connections[conn.id].lastMessage = new Date();

    // for setContext, set it on this particular connection
    if(message.action == 'setContext') {
      connections[conn.id].context = message.context;
      console.log('Set context for "'+conn.id+'" : '+message.context);
      return;
    } else if(message.action == 'openConnection') {
      return;
    } else if(message.action == 'closeConnection') {
      return;
    } else if(message.action == 'getConnections') {
      return;
    }

    if(message.action == undefined || message.context == undefined)
      return;
    
    // for get connections, return the connections on this context
    if(message.action == 'getConnections') {
      var data = {};
      for(var id in connections) {
        if(id == conn.id)
          continue;
        if(connections[id].context == undefined)
          continue;
        if(connections[id].context != connections[conn.id].context)
          continue;
        data[id] = {};
        data.id = id;
      }
      conn.send(JSON.stringify({'targetID': conn.id, 'action': 'getConnections', 'context': message.context, 'data': data}));
      return;
    }
    
    // store the sourceID in the message
    message.sourceID = conn.id;
    
    // send this to either a specific target
    // or to all other clients on this context
    if(message.targetID == '*') {
      
      for(var id in connections) {
        // filter by context
        if(connections[id].context == undefined)
          continue;
        if(connections[id].context != connections[conn.id].context)
          continue;
        
        message.targetID = id;
        
        // send it
        connections[id].client.send(JSON.stringify(message));
      }
    } else if (connections[message.targetID]) {
      if(connections[message.targetID].context == message.context)
        connections[message.targetID].client.send(JSON.stringify(message));
      else
        console.log('Invalid message for connection '+message.targetId+'.');
    }
  });
});

server.addListener('close', function(conn){
  console.log('Closing connection with '+conn.id+'....');
  for(var id in connections) {
    if(id == conn.id)
      continue;
    if(connections[id].context == undefined)
      continue;
    if(connections[id].context != connections[conn.id].context)
      continue;
    
    // send it
    connections[id].client.send(JSON.stringify({'targetID': id, 'sourceID': conn.id, 'context':conntections[id].context ,'action': 'closeConnection'}));
  }
  connections[conn.id] = undefined;
  console.log('Closed connection with '+conn.id+'.');
});

server.listen(8123);
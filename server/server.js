// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 3000;

// STATIC FILE SERVER

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // route to index.html
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  };

  const fullPath = path.join(__dirname, filePath);

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(content);
  });
});

//WEBSOCKET SERVER
//Broadcasts game state between clients
 //Sends playerCount so clients can assign LEFT/RIGHT
 
const wss = new WebSocketServer({ server });

// Helper: broadcast number of connected clients
function broadcastPlayerCount() {
  const msg = JSON.stringify({
    type: "playerCount",
    count: wss.clients.size
  });

  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  // Notify all clients about updated count
  broadcastPlayerCount();

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      // If it's not JSON, just ignore
      return;
    }

    // Ignore "join" messages (they are only used to say "I'm here")
    if (msg.type === "join") {
      return;
    }

    // Forward all other messages to all other clients
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(data.toString());
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Update playerCount when someone leaves and disconnected shows
    broadcastPlayerCount();
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

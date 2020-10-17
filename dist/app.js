const Express = require('express');
const Http = require('http');
const Path = require('path');
const app = Express();
const server = Http.createServer(app);
const APP_PORT = process.env.PORT || 5000;
app.use('/static', Express.static(Path.join(__dirname, 'public')));
app.set('port', APP_PORT);
// Routing
app.get('/', function (request, response) {
    response.sendFile(Path.join(__dirname, '/public/index.html'));
});
// Starts the server.
server.listen(APP_PORT, function () {
    console.log();
    console.log('Starting server on port ' + APP_PORT);
});

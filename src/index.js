/**
 * etcports entry point
 */

var fs = require('fs');
var http = require('http');
var https = require('https');
var domain = require('domain');
var httpProxy = require('http-proxy');

function getPortMapping(next) {
    fs.readFile('/etc/ports', {
        encoding: 'utf8'
    }, function(err, fileContent) {
        if (err)
            return next(err);

        var portMap = {};
        var lines = fileContent.split(/\r?\n/);

        lines.forEach(function(line) {
            var parts = line.replace(/^\s\s*/, '').replace(/\s\s*$/, '').split(/\s+/);
            if (parts.length > 1) {
                var port = parts[0];
                var domain = parts[1];

                if (!isNaN(parseInt(port)) && !!domain)
                    portMap[domain] = port;
            }
        });

        return next(null, portMap);
    });
};

function proxyWith(proxy, portMap, protocol, req, res) {
    var host = ((req.headers || {}).host) || 'localhost';
    var port = portMap[host];

    if (!port) {
        res.statusCode = 404;
        return res.end('Domain ' + host + ' not mapped to any port in /etc/ports');
    }

    proxy.web(req, res, { target: protocol + '://' + host + ':' + port }, function(err) {
        res.statusCode = 500;
        res.end('Remote server threw error: \n' + err.message);
    });
};

function setupSocksServer(portMap) {
    var proxy = httpProxy.createProxyServer({});

    http.createServer(function(req, res) {
        proxyWith(proxy, portMap, 'http', req, res);
    }).listen(80, function(err) {
        if (err)
            throw err;

        console.log('etcports listening on 80');
    });

    https.createServer({
        key: fs.readFileSync('./config/key.pem'),
        cert: fs.readFileSync('./config/key-cert.pem')
    }, function(req, res) {
        proxyWith(proxy, portMap, 'https', req, res);
    }).listen(443, function(err) {
        if (err)
            throw err;

        console.log('etcports listening on 443');
    });
};

function init() {
    var appDomain = domain.create();

    appDomain.on('error', function(err) {
        if (err.code === 'EACCES')
            return console.log('You have to run as super user to bind on port 80/443 for etcports functionality to work.');

        throw err;
    });

    appDomain.run(function() {
        getPortMapping(function(err, portMap) {
            if (err) {
                if (err.code === 'ENOENT' || err.code === 'EACCES')
                    return console.log('/etc/ports file missing or not accessible. Create a /etc/ports file similar to /etc/hosts file, except with ip addresses replaced with port numbers. Then try again.');
                throw err;
            }

            setupSocksServer(portMap);
        });
    });
};

init();

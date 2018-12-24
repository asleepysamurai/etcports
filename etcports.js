/**
 * Etcports Proxy Server
 */

var SingleInstance = require('single-instance');
var argv = require('minimist')(process.argv.slice(2));

var signal = argv.s || argv.signal || 'start';

var locker = new SingleInstance('bc61d3babbe3cad821b4b9492add01cd3b69835e66d1e213317503ffc1a35f70');

function start() {
    var fs = require('fs');
    var path = require('path');
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

                    if (!isNaN(parseInt(port)) && !!domain && port != 443 && port != 80)
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

        var httpServer = http.createServer(function(req, res) {
            proxyWith(proxy, portMap, 'http', req, res);
        });

        httpServer.listen(80, function(err) {
            if (err)
                throw err;

            console.log('etcports listening on 80');
        });

        var httpsServer = https.createServer({
            key: fs.readFileSync(path.resolve(__dirname, './config/key.pem')),
            cert: fs.readFileSync(path.resolve(__dirname, './config/key-cert.pem'))
        }, function(req, res) {
            proxyWith(proxy, portMap, 'https', req, res);
        });

        httpsServer.listen(443, function(err) {
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
};

function stop(restart, pid) {
    var { fork } = require('child_process');
    var path = require('path');

    if (restart)
        fork(path.resolve(__dirname, './index.js'), { detached: true });

    console.log('etcports stopped listening on ports 80, 443.');
    if (pid)
        process.kill(pid);
    process.exit(0);
};

process.on('exit', function() {
    process.kill(process.pid, 'SIGTERM');
});

locker.lock()
    .then(function() {
        if (signal == 'stop' || signal == 'restart')
            return stop(signal == 'restart');
        if (signal == 'start')
            return start();
    })
    .catch(function(err) {
        const pid = (err || {}).pid;

        if (signal == 'start')
            console.log('etcports already running. To restart use \'-s restart\' option');
        else if (signal == 'stop' || signal == 'restart')
            stop(signal == 'restart', pid);

        process.exit(0);
    });

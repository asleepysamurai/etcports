# etcports
/etc/hosts, but port numbers instead of IP addresses. Map a domain name to any port on your machine.

etcports starts a http proxy server, listening on ports 80 and 443 and proxies all requests through to the port mapping specified in */etc/ports* file.

## Installation

#### Yarn
```
yarn global add etcports
```

#### NPM
```
npm install -g etcports
```

## Usage

1. Ensure that hosts are mapped to 127.0.0.1 in ***/etc/hosts***. If this is not done, then etcports will never receive the requests.
```
127.0.0.1   staticserver.local
127.0.0.1   apiserver
127.0.0.1   remoteserver.com
```

2. Ensure that ports are mapped in ***/etc/ports***. Create the file if it does not exist.
```
7000    staticserver.local
7005    apiserver
7015    remoteserver.com
7015    apiserver
```

##### Note
You can bind the same port to different domains, but you can only map one domain to one port. If a domain is mapped to multiple ports, the mapping that appears lower most in */etc/ports* is used. In the example above, both *remoteserver.com* and *apiserver* are bound to port *7015*.

Also note that any bindings for ports *80* and *443* are ignored.

3. Once you've got the config done, start etcports:
```
sudo etcports
```

##### Note
Super user permissions are required to bind to ports 80 and 443.

5. If you make any changes to ***/etc/ports***, remember to restart etcports
```
sudo etcports
```

4. To stop etcports:
```
sudo etcports --stop
```

That's all folks!

## Contributors:
* Balaganesh Damodaran (asleepysamurai)

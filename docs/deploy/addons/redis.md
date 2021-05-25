# Deployment
To deploy a Redis instance on Porter, head to the **Community Add-ons** tab. You can optionally specify a password for the instance or configure the amount of resources (i.e. CPU and RAM) assigned to the instance.

![Redis settings](https://files.readme.io/3274ddb-Screen_Shot_2021-03-19_at_12.26.26_PM.png "Screen Shot 2021-03-19 at 12.26.26 PM.png")

# Connecting to the Database

Redis on Porter is by default only exposed to internal traffic - only applications and add-on's that are deployed in the same Kubernetes cluster can connect to the Redis instance. The DNS name for the instance can be found on the deployment view as shown below. Note that Redis listens on port 6379 by default.

![Redis URI](https://files.readme.io/d0d7317-Screen_Shot_2021-03-19_at_12.27.42_PM.png "Screen Shot 2021-03-19 at 12.27.42 PM.png")

The connection URI for the Redis instance follows this format: 
```
redis://${DNS_NAME}:6379
```
If you've enabled password, the connection string would look like:
```
redis://${ARBITRARY_USERNAME}:${PASSWORD}@${DNA_NAME}:6379
```
You can pass in any string as your username (even an empty string). Redis does not support users but implements this behavior to comply with [URI RFC standard](https://tools.ietf.org/html/rfc3986).

For the example above that does not have password enabled, the connection string would be:
```
redis://peaches-redis-master.default.svc.cluster.local:6379
```

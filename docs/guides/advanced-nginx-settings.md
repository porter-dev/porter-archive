> 🚧
>
> **Note:** these advanced configuration will only work if you've set up a [custom domain](https://docs.getporter.dev/docs/https-and-custom-domains). They will not work on `*.porter.run` domains. 

Every cluster provisioned by Porter by default uses an NGINX [ingress controller](https://kubernetes.github.io/ingress-nginx) to connect your web applications to the internet. There are different options for customizing the NGINX configuration that a specific application uses. 

Most of the time, you can customize the NGINX configuration by adding an "Ingress Annotation" when deploying a web service. This can be found in the "Advanced" tab of the web template:

![Advanced tab ingress](https://files.readme.io/fcfa8a2-Screen_Shot_2021-06-02_at_5.15.26_PM.png "Screen Shot 2021-06-02 at 5.15.26 PM.png")

To add an annotation, simply click "Add row" and add key-value pairs for the annotation. 

> 📘
>
> **Note:** this document attempts to cover the most common use-cases. To view the full list of annotations, [go here](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations).

# NGINX Settings Options

## Client Max Body Size 

If you are getting undesired `413 Request Entity Too Large` errors, you can increase the maximum size of the client request by setting the field [client_max_body_size](http://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size). You can do this by adding the following annotation:

```yaml
nginx.ingress.kubernetes.io/proxy-body-size: 8m
```

This will set the maximum client request body size to 8 megabytes. [Read more about NGINX units](http://nginx.org/en/docs/syntax.html).

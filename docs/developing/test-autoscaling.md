# Test Cluster and HPA Autoscaling

Prerequisites: 
- [`metrics-server`](https://artifacthub.io/packages/helm/bitnami/metrics-server) must be installed (installed by default on all Porter clusters). 
- [`cluster-autoscaler`](https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler) must be enabled (enabled by default on all Porter clusters). 
- Have `kubectl` access to the cluster, as it is easiest to port-forward to the exposed service. 
- Download [`hey`](https://github.com/rakyll/hey) or an equivalent. 

# Steps

1. Launch a Docker template with image URL `k8s.gcr.io/hpa-example`. Enable autoscaling under the **Resources** tab -- suggested params are 100 Mi RAM, 100m CPU, 1-100 replicas, 50% CPU & RAM util. Do not **Expose to external traffic** to run load tests.

2. Confirm that the horizontal pod autoscaler was created via kubectl (`kubectl get hpa`) and that the metrics server is reporting metrics via `kubectl top pods`. Current utilization may initially show up as `<undefined>`, but this information should load after a minute or so.

3. Port-forward to the service via `kubectl port-forward svc/<svc-name> 10000:80`. 
4. In a different terminal window, run `hey http://localhost:10000`. Vary the `hey` parameters to test autoscaling under different loads (`hey -h` for options). 

Check that replicas scale when passing the threshold from the metrics tab. Use kubectl to probe the nodes and confirm cluster-level upscaling has also occurred. Delete the chart and confirm node downscaling when done.

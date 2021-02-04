{
export API_SERVER_CONTAINER=porter-server-657f5c594c-nvdd2; 
export WEBPACK_SERVER_CONTAINER=porter-webpack-64d48578b5-vnk7x; 
kubectl port-forward $API_SERVER_CONTAINER 8081:8080 & 
kubectl port-forward $WEBPACK_SERVER_CONTAINER 8082:8080 & 
devspace sync --upload-only --container-path /webpack --local-path ./dashboard/ --pod $WEBPACK_SERVER_CONTAINER & 
devspace sync --upload-only --exclude dashboard --pod $API_SERVER_CONTAINER & 
kubectl logs $API_SERVER_CONTAINER -f & 
kubectl logs $WEBPACK_SERVER_CONTAINER -f & 
nginx -c $(pwd)/docker/nginx_remote.conf;
}
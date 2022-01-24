package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

func serve(w http.ResponseWriter, req *http.Request) {
	contents, err := ioutil.ReadFile("install.sh")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Header().Add("Content-Type", "text/plain")
	w.Write(contents)
}

func main() {
	var port string
	if port = os.Getenv("PORT"); port == "" {
		port = "80"
	}

	http.HandleFunc("/", serve)
	http.ListenAndServe(fmt.Sprintf(":%s", port), nil)
}

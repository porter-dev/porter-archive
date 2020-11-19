package api

import (
	"fmt"
	"net/http"

	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/remote"
)

// HandleListImages retrieves a list of repo names
func (app *App) HandleListImages(w http.ResponseWriter, r *http.Request) {
	ref, err := name.ParseReference("gcr.io/google-containers/pause")
	if err != nil {
		fmt.Println(err)
		return
	}

	img, err := remote.Image(ref)
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(img.Size())

	ctx := r.Context()
	reg, err := name.NewRegistry("index.docker.io")
	if err != nil {
		fmt.Println("fuk")
		fmt.Println(err)
		return
	}

	stuff, err := remote.Catalog(ctx, reg, remote.WithAuthFromKeychain(authn.DefaultKeychain))
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(stuff[0])
}

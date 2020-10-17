package credstore

import "github.com/docker/docker-credential-helpers/credentials"

const (
	url   = "https://github.com/porter-dev/porter"
	label = "Porter Credentials"
)

// Set stores a given username/pw with a given credentials label in the OS-specific
// credentials store
func Set(username, pw string) error {
	cr := &credentials.Credentials{
		ServerURL: url,
		Username:  username,
		Secret:    pw,
	}

	credentials.SetCredsLabel(label)

	return ns.Add(cr)
}

// Get retrieves a given username/pw with a given credentials label in the OS-specific
// credentials store
func Get() (string, string, error) {
	credentials.SetCredsLabel(label)
	return ns.Get(url)
}

// Del removes a given credential that uses a label in the OS-specific
// credentials store
func Del() error {
	credentials.SetCredsLabel(label)
	return ns.Delete(url)
}

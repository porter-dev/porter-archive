package api

import (
	"fmt"

	"github.com/porter-dev/porter/internal/kubernetes"
	"gopkg.in/yaml.v2"
)

// User is a user type
type User struct {
	ID string
	// The clusters that this user has linked
	Clusters []*kubernetes.ClusterConfig
	// The raw kubeconfig uploaded by this user
	RawKubeConfig []byte
}

// GenerateUser creates a new user based on a unique ID and a kubeconfig
func GenerateUser(id string, kubeconfig []byte) *User {
	conf := kubernetes.KubeConfig{}

	err := yaml.Unmarshal(kubeconfig, &conf)

	// TODO -- HANDLE ERROR
	if err != nil {
		fmt.Println("ERROR IN UNMARSHALING")
	}

	// generate the user's clusters
	clusters := conf.ToClusterConfigs()

	return &User{
		ID:            id,
		Clusters:      clusters,
		RawKubeConfig: kubeconfig,
	}
}

// printUser is a helper function to print a user's config without sensitive information
func (u *User) printUser() {
	for _, cluster := range u.Clusters {
		fmt.Println(cluster.Name, cluster.Context, cluster.Server, cluster.User)
	}
}

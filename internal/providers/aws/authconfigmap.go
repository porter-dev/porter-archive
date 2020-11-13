package aws

// Copy of eksctl that uses authconfigmap
// https://github.com/weaveworks/eksctl/blob/35d0d6dc169e13b1fb655aea19d3aa2e7691dc81/pkg/authconfigmap/authconfigmap.go#L1
//
// eksctl is still pinned on v0.16.8 of Kubernetes, while we use v0.18.8

import (
	"context"
	"fmt"
	"strings"

	"github.com/kris-nova/logger"
	"github.com/pkg/errors"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/client-go/kubernetes/typed/core/v1"

	"github.com/aws/aws-sdk-go/aws/arn"
	"github.com/aws/aws-sdk-go/aws/awsutil"
)

const (
	// ObjectName is the Kubernetes resource name of the auth ConfigMap
	ObjectName = "aws-auth"
	// ObjectNamespace is the namespace the object can be found
	ObjectNamespace = metav1.NamespaceSystem

	rolesData = "mapRoles"

	usersData = "mapUsers"

	accountsData = "mapAccounts"

	// GroupMasters is the admin group which is also automatically
	// granted to the IAM role that creates the cluster.
	GroupMasters = "system:masters"

	// RoleNodeGroupUsername is the default username for a nodegroup
	// role mapping.
	RoleNodeGroupUsername = "system:node:{{EC2PrivateDNSName}}"
)

// AuthConfigMap allows modifying the auth ConfigMap.
type AuthConfigMap struct {
	client v1.ConfigMapInterface
	cm     *corev1.ConfigMap
}

// New creates an AuthConfigMap instance that manipulates
// a ConfigMap. If it is nil, one is created.
func New(client v1.ConfigMapInterface, cm *corev1.ConfigMap) *AuthConfigMap {
	if cm == nil {
		cm = &corev1.ConfigMap{
			ObjectMeta: ObjectMeta(),
			Data:       map[string]string{},
		}
	}
	if cm.Data == nil {
		cm.ObjectMeta = ObjectMeta()
		cm.Data = map[string]string{}
	}
	return &AuthConfigMap{client: client, cm: cm}
}

// ObjectMeta constructs metadata for the ConfigMap.
func ObjectMeta() metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name:      ObjectName,
		Namespace: ObjectNamespace,
	}
}

// NewFromClientSet fetches the auth ConfigMap.
func NewFromClientSet(clientSet kubernetes.Interface) (*AuthConfigMap, error) {
	client := clientSet.CoreV1().ConfigMaps(ObjectNamespace)

	cm, err := client.Get(context.TODO(), ObjectName, metav1.GetOptions{})
	// It is fine for the configmap not to exist. Any other error is fatal.
	if err != nil && !apierrors.IsNotFound(err) {
		return nil, errors.Wrapf(err, "getting auth ConfigMap")
	}
	logger.Debug("aws-auth = %s", awsutil.Prettify(cm))
	return New(client, cm), nil
}

// AddIdentity maps an IAM role or user ARN to a k8s group dynamically. It modifies the
// role or user with given groups. If you are calling
// this as part of node creation you should use DefaultNodeGroups.
func (a *AuthConfigMap) AddIdentity(identity Identity) error {
	identities, err := a.Identities()
	if err != nil {
		return err
	}

	identities = append(identities, identity)

	logger.Info("adding identity %q to auth ConfigMap", identity.ARN())
	return a.setIdentities(identities)
}

// Identities returns a list of iam users and roles that are currently in the (cached) configmap.
func (a *AuthConfigMap) Identities() ([]Identity, error) {
	var roles []RoleIdentity
	if err := yaml.Unmarshal([]byte(a.cm.Data[rolesData]), &roles); err != nil {
		return nil, errors.Wrapf(err, "unmarshalling %q", rolesData)
	}

	var users []UserIdentity
	if err := yaml.Unmarshal([]byte(a.cm.Data[usersData]), &users); err != nil {
		return nil, errors.Wrapf(err, "unmarshalling %q", usersData)
	}

	all := make([]Identity, len(users)+len(roles))
	for i, r := range roles {
		all[i] = r
	}
	for i, u := range users {
		all[i+len(roles)] = u
	}
	return all, nil
}

func (a *AuthConfigMap) setIdentities(identities []Identity) error {
	// Split identities into list of roles and list of users
	users, roles := []Identity{}, []Identity{}
	for _, identity := range identities {
		switch identity.Type() {
		case ResourceTypeRole:
			roles = append(roles, identity)
		case ResourceTypeUser:
			users = append(users, identity)
		default:
			return errors.Errorf("cannot determine if %q refers to a user or role during setIdentities preprocessing", identity.ARN())
		}
	}

	// Update the corresponding keys
	_roles, err := yaml.Marshal(roles)
	if err != nil {
		return errors.Wrapf(err, "marshalling %q", rolesData)
	}
	a.cm.Data[rolesData] = string(_roles)

	_users, err := yaml.Marshal(users)
	if err != nil {
		return errors.Wrapf(err, "marshalling %q", usersData)
	}
	a.cm.Data[usersData] = string(_users)

	return nil
}

// Save persists the ConfigMap to the cluster. It determines
// whether to create or update by looking at the ConfigMap's UID.
func (a *AuthConfigMap) Save() (err error) {
	if a.cm.UID == "" {
		a.cm, err = a.client.Create(context.TODO(), a.cm, metav1.CreateOptions{})
		return err
	}

	a.cm, err = a.client.Update(context.TODO(), a.cm, metav1.UpdateOptions{})
	return err
}

var (
	// ErrNeitherUserNorRole is the error returned when an identity is missing both UserARN
	// and RoleARN.
	ErrNeitherUserNorRole = errors.New("arn is neither user nor role")

	// ErrNoKubernetesIdentity is the error returned when an identity has neither a Kubernetes
	// username nor a list of groups.
	ErrNoKubernetesIdentity = errors.New("neither username nor group are set for iam identity")
)

// Identity represents an IAM identity and its corresponding Kubernetes identity
type Identity interface {
	ARN() string
	Type() string
	Username() string
	Groups() []string
}

// KubernetesIdentity represents a kubernetes identity to be used in iam mappings
type KubernetesIdentity struct {
	KubernetesUsername string   `json:"username,omitempty"`
	KubernetesGroups   []string `json:"groups,omitempty"`
}

// UserIdentity represents a mapping from an IAM user to a kubernetes identity
type UserIdentity struct {
	UserARN string `json:"userarn,omitempty"`
	KubernetesIdentity
}

// RoleIdentity represents a mapping from an IAM role to a kubernetes identity
type RoleIdentity struct {
	RoleARN string `json:"rolearn,omitempty"`
	KubernetesIdentity
}

// Username returns the Kubernetes username
func (k KubernetesIdentity) Username() string {
	return k.KubernetesUsername
}

// Groups returns the Kubernetes groups
func (k KubernetesIdentity) Groups() []string {
	return k.KubernetesGroups
}

// ARN returns the ARN of the iam mapping
func (u UserIdentity) ARN() string {
	return u.UserARN
}

// Type returns the resource type of the iam mapping
func (u UserIdentity) Type() string {
	return ResourceTypeUser
}

// ARN returns the ARN of the iam mapping
func (r RoleIdentity) ARN() string {
	return r.RoleARN
}

// Type returns the resource type of the iam mapping
func (r RoleIdentity) Type() string {
	return ResourceTypeRole
}

// NewIdentity determines into which field the given arn goes and returns the new identity
// alongside any error resulting for checking its validity.
func NewIdentity(arn string, username string, groups []string) (Identity, error) {
	if arn == "" {
		return nil, fmt.Errorf("expected a valid arn but got empty string")
	}
	if username == "" && len(groups) == 0 {
		return nil, ErrNoKubernetesIdentity
	}

	parsedARN, err := Parse(arn)
	if err != nil {
		return nil, err
	}

	switch {
	case parsedARN.IsUser():
		return &UserIdentity{
			UserARN: arn,
			KubernetesIdentity: KubernetesIdentity{
				KubernetesUsername: username,
				KubernetesGroups:   groups,
			},
		}, nil
	case parsedARN.IsRole():
		return &RoleIdentity{
			RoleARN: arn,
			KubernetesIdentity: KubernetesIdentity{
				KubernetesUsername: username,
				KubernetesGroups:   groups,
			},
		}, nil
	default:
		return nil, ErrNeitherUserNorRole
	}
}

const (
	// ResourceTypeRole is the resource type of the role ARN
	ResourceTypeRole = "role"
	// ResourceTypeUser is the resource type of the user ARN
	ResourceTypeUser = "user"
)

// ARN implements the pflag.Value interface for aws-sdk-go/aws/arn.ARN
type ARN struct {
	arn.ARN
}

// Parse wraps the aws-sdk-go/aws/arn.Parse function and instead returns a
// iam.ARN
func Parse(s string) (ARN, error) {
	a, err := arn.Parse(s)
	return ARN{a}, err
}

// ResourceType returns the type of the resource specified in the ARN.
// Typically, in the case of IAM, it is a role or a user
func (a *ARN) ResourceType() string {
	t := a.Resource
	if idx := strings.Index(t, "/"); idx >= 0 {
		t = t[:idx] // remove everything following the forward slash
	}

	return t
}

// IsUser returns whether the arn represents a IAM user or not
func (a *ARN) IsUser() bool {
	return a.ResourceType() == ResourceTypeUser
}

// IsRole returns whether the arn represents a IAM role or not
func (a *ARN) IsRole() bool {
	return a.ResourceType() == ResourceTypeRole
}

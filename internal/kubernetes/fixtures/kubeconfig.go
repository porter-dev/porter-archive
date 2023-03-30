package fixtures

// This file contains test fixtures to test various packages.
// These are not meant to be workable kubeconfigs, but rather
// are meant to test parsers and auth mechanism detection.
// As a result, certificates are simply base-64 encoded versions
// of "-----BEGIN CER", and all paths + key data are fake.

const ClusterCAWithData string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
current-context: context-test
`

const ClusterCAWithoutData string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://10.10.10.10
    certificate-authority: /fake/path/to/ca.pem
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
current-context: context-test
`

const ClusterLocalhost string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://localhost:30000
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
current-context: context-test
`

const X509WithData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
`

const X509WithoutCertData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate: /fake/path/to/cert.pem
    client-key-data: LS0tLS1CRUdJTiBDRVJ=
`

const X509WithoutKeyData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJ=
    client-key: /fake/path/to/key.pem
`

const X509WithoutCertAndKeyData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    client-certificate: /fake/path/to/cert.pem
    client-key: /fake/path/to/key.pem
`

const BearerTokenWithData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    token: LS0tLS1CRUdJTiBDRVJ=
`

const BearerTokenWithoutData string = `
apiVersion: v1
kind: Config
preferences: {}
current-context: context-test
clusters:
- cluster:
    server: https://10.10.10.10
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
users:
- name: test-admin
  user:
    tokenFile: /path/to/token/file.txt
`

const GCPPlugin string = `
apiVersion: v1
kind: Config
clusters:
- name: cluster-test
  cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
users:
- name: test-admin
  user:
    auth-provider:
      name: gcp
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
`

const AWSIamAuthenticatorExec = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      command: aws-iam-authenticator
      args:
        - "token"
        - "-i"
        - "cluster-test-aws-id-guess"
`

const AWSEKSGetTokenExec = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      command: aws
      args:
        - "eks"
        - "get-token"
        - "--cluster-name"
        - "cluster-test-aws-id-guess"
`

const OIDCAuthWithoutData = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    auth-provider:
      config:
        client-id: porter-api
        id-token: token
        idp-issuer-url: https://10.10.10.10
        idp-certificate-authority: /fake/path/to/ca.pem
      name: oidc
`

const OIDCAuthWithData = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    auth-provider:
      config:
        client-id: porter-api
        id-token: token
        idp-issuer-url: https://10.10.10.10
        idp-certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
      name: oidc
`

const BasicAuth = `
apiVersion: v1
clusters:
- cluster:
    server: https://10.10.10.10
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJ=
  name: cluster-test
contexts:
- context:
    cluster: cluster-test
    user: test-admin
  name: context-test
current-context: context-test
kind: Config
preferences: {}
users:
- name: test-admin
  user:
    username: admin
    password: changeme
`

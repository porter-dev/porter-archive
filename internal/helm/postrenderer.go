package helm

import (
	"bytes"
	"fmt"
	"io"
	"net/url"
	"regexp"
	"sort"
	"strings"

	"github.com/aws/aws-sdk-go/aws/arn"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/oauth2"
	"gopkg.in/yaml.v2"
	"helm.sh/helm/v3/pkg/postrender"

	"github.com/docker/distribution/reference"
)

type PorterPostrenderer struct {
	DockerSecretsPostRenderer       *DockerSecretsPostRenderer
	EnvironmentVariablePostrenderer *EnvironmentVariablePostrenderer
}

func NewPorterPostrenderer(
	cluster *models.Cluster,
	repo repository.Repository,
	agent *kubernetes.Agent,
	namespace string,
	regs []*models.Registry,
	doAuth *oauth2.Config,
	disablePullSecretsInjection bool,
) (postrender.PostRenderer, error) {
	var dockerSecretsPostrenderer *DockerSecretsPostRenderer
	var err error

	if !disablePullSecretsInjection && cluster != nil && agent != nil && regs != nil && len(regs) > 0 {
		dockerSecretsPostrenderer, err = NewDockerSecretsPostRenderer(cluster, repo, agent, namespace, regs, doAuth)

		if err != nil {
			return nil, err
		}
	}

	envVarPostrenderer, err := NewEnvironmentVariablePostrenderer()

	if err != nil {
		return nil, err
	}

	return &PorterPostrenderer{
		DockerSecretsPostRenderer:       dockerSecretsPostrenderer,
		EnvironmentVariablePostrenderer: envVarPostrenderer,
	}, nil
}

func (p *PorterPostrenderer) Run(
	renderedManifests *bytes.Buffer,
) (modifiedManifests *bytes.Buffer, err error) {
	if p.DockerSecretsPostRenderer != nil {
		renderedManifests, err = p.DockerSecretsPostRenderer.Run(renderedManifests)

		if err != nil {
			return nil, err
		}
	}

	renderedManifests, err = p.EnvironmentVariablePostrenderer.Run(renderedManifests)

	return renderedManifests, err
}

// DockerSecretsPostRenderer is a Helm post-renderer that adds image pull secrets to
// pod specs that would otherwise be unable to pull an image.
//
// The post-renderer currently looks for two types of registries: GCR and ECR (TODO: DOCR
// and Dockerhub). It also detects if the image pull secret is necessary: if GCR image pulls
// occur in a GKE cluster in the same project, or if ECR image pulls exist in an EKS cluster
// in the same organization + region, an image pull is not necessary.
type DockerSecretsPostRenderer struct {
	Cluster   *models.Cluster
	Repo      repository.Repository
	Agent     *kubernetes.Agent
	Namespace string
	DOAuth    *oauth2.Config

	registries map[string]*models.Registry

	podSpecs  []resource
	resources []resource
}

// while manifests are map[string]interface{} at the top level,
// nested keys will be of type map[interface{}]interface{}
type resource map[interface{}]interface{}

func NewDockerSecretsPostRenderer(
	cluster *models.Cluster,
	repo repository.Repository,
	agent *kubernetes.Agent,
	namespace string,
	regs []*models.Registry,
	doAuth *oauth2.Config,
) (*DockerSecretsPostRenderer, error) {
	// Registries is a map of registry URLs to registry ids
	registries := make(map[string]*models.Registry)

	for _, reg := range regs {
		regURL := reg.URL

		if !strings.Contains(regURL, "http") {
			regURL = "https://" + regURL
		}

		parsedRegURL, err := url.Parse(regURL)

		if err != nil {
			continue
		}

		addReg := parsedRegURL.Host

		if parsedRegURL.Path != "" {
			addReg += "/" + strings.Trim(parsedRegURL.Path, "/")
		}

		registries[addReg] = reg
	}

	return &DockerSecretsPostRenderer{
		Cluster:    cluster,
		Repo:       repo,
		Agent:      agent,
		Namespace:  namespace,
		DOAuth:     doAuth,
		registries: registries,
		podSpecs:   make([]resource, 0),
		resources:  make([]resource, 0),
	}, nil
}

func (d *DockerSecretsPostRenderer) Run(
	renderedManifests *bytes.Buffer,
) (modifiedManifests *bytes.Buffer, err error) {
	bufCopy := bytes.NewBuffer(renderedManifests.Bytes())

	linkedRegs, err := d.getRegistriesToLink(bufCopy)

	// if we encountered an error here, we'll render the manifests anyway
	// without modification
	if err != nil {
		return renderedManifests, nil
	}

	// Check to see if the resources loaded into the postrenderer contain a configmap
	// with a manifest that needs secrets generation as well. If this is the case, create and
	// run another postrenderer for this specific manifest.
	for i, res := range d.resources {
		kindVal, hasKind := res["kind"]
		if !hasKind {
			continue
		}

		kind, ok := kindVal.(string)

		if !ok {
			continue
		}

		if kind == "ConfigMap" {
			labelVal := getNestedResource(res, "metadata", "labels")

			if labelVal == nil {
				continue
			}

			porterLabelVal, exists := labelVal["getporter.dev/manifest"]

			if !exists {
				continue
			}

			if labelValStr, ok := porterLabelVal.(string); ok && labelValStr == "true" {
				data := getNestedResource(res, "data")
				manifestData, exists := data["manifest"]

				if !exists {
					continue
				}

				manifestDataStr, ok := manifestData.(string)

				if !ok {
					continue
				}

				dCopy := &DockerSecretsPostRenderer{
					Cluster:    d.Cluster,
					Repo:       d.Repo,
					Agent:      d.Agent,
					Namespace:  d.Namespace,
					DOAuth:     d.DOAuth,
					registries: d.registries,
					podSpecs:   make([]resource, 0),
					resources:  make([]resource, 0),
				}

				newData, err := dCopy.Run(bytes.NewBufferString(manifestDataStr))

				if err != nil {
					continue
				}

				data["manifest"] = string(newData.Bytes())

				d.resources[i] = res
			}
		}
	}

	// create the necessary secrets
	secrets, err := d.Agent.CreateImagePullSecrets(
		d.Repo,
		d.Namespace,
		linkedRegs,
		d.DOAuth,
	)

	if err != nil {
		return renderedManifests, nil
	}

	d.updatePodSpecs(secrets)

	modifiedManifests = bytes.NewBuffer([]byte{})
	encoder := yaml.NewEncoder(modifiedManifests)
	defer encoder.Close()

	for _, resource := range d.resources {
		// if the resource is empty, we skip encoding it to prevent errors. Helm/k8s expects empty resources to take the form "{}",
		// while this library writes an empty string, causing problems during installation.
		if len(resource) != 0 {
			err = encoder.Encode(resource)

			if err != nil {
				return nil, err
			}
		}
	}

	return modifiedManifests, nil
}

func (d *DockerSecretsPostRenderer) getRegistriesToLink(renderedManifests *bytes.Buffer) (map[string]*models.Registry, error) {
	// create a map of registry names to registries: these are the registries
	// that a secret will be generated for, if it does not exist
	linkedRegs := make(map[string]*models.Registry)

	var err error
	d.resources, err = decodeRenderedManifests(renderedManifests)

	if err != nil {
		return linkedRegs, err
	}

	// read the pod specs into the post-renderer object
	d.getPodSpecs(d.resources)

	for _, podSpec := range d.podSpecs {
		// get all images
		images := d.getImageList(podSpec)

		// read the image url
		for _, image := range images {
			regName, err := getRegNameFromImageRef(image)

			if err != nil {
				continue
			}

			// check if the integration is native to the cluster/registry combination
			isNative := d.isRegistryNative(regName)

			if isNative {
				continue
			}

			reg, exists := d.registries[regName]

			if !exists {
				continue
			}

			// if the registry exists, add it to the map
			linkedRegs[regName] = reg
		}
	}

	return linkedRegs, nil
}

func decodeRenderedManifests(
	renderedManifests *bytes.Buffer,
) ([]resource, error) {
	resArr := make([]resource, 0)

	// use the yaml decoder to parse the multi-document yaml.
	decoder := yaml.NewDecoder(renderedManifests)

	for {
		res := make(resource)
		err := decoder.Decode(&res)
		if err == io.EOF {
			break
		}

		if err != nil {
			return resArr, err
		}

		if len(res) != 0 {
			resArr = append(resArr, res)
		}
	}

	return resArr, nil
}

func (d *DockerSecretsPostRenderer) getPodSpecs(resources []resource) {
	for _, res := range resources {
		kindVal, hasKind := res["kind"]
		if !hasKind {
			continue
		}

		kind, ok := kindVal.(string)
		if !ok {
			continue
		}

		// manifests of list type will have an items field, items should
		// be recursively parsed
		if itemsVal, isList := res["items"]; isList {
			if items, ok := itemsVal.([]interface{}); ok {
				// convert items to resource
				resArr := make([]resource, 0)
				for _, item := range items {
					if arrVal, ok := item.(resource); ok {
						resArr = append(resArr, arrVal)
					}
				}

				d.getPodSpecs(resArr)
			}

			continue
		}

		// otherwise, get the pod spec based on the type of resource
		podSpec := getPodSpecFromResource(kind, res)

		if podSpec == nil {
			continue
		}

		d.podSpecs = append(d.podSpecs, podSpec)
	}

	return
}

func (d *DockerSecretsPostRenderer) updatePodSpecs(secrets map[string]string) {
	for _, podSpec := range d.podSpecs {
		containersVal, hasContainers := podSpec["containers"]

		if !hasContainers {
			continue
		}

		containers, ok := containersVal.([]interface{})

		if !ok {
			continue
		}

		imagePullSecrets := make([]map[string]interface{}, 0)

		if existingPullSecrets, ok := podSpec["imagePullSecrets"]; ok {
			if existing, ok := existingPullSecrets.([]map[string]interface{}); ok {
				imagePullSecrets = existing
			}
		}

		for _, container := range containers {
			_container, ok := container.(resource)

			if !ok {
				continue
			}

			image, ok := _container["image"].(string)

			if !ok {
				continue
			}

			regName, err := getRegNameFromImageRef(image)

			if err != nil {
				continue
			}

			if secretName, ok := secrets[regName]; ok && secretName != "" {
				imagePullSecrets = append(imagePullSecrets, map[string]interface{}{
					"name": secretName,
				})
			}
		}

		if len(imagePullSecrets) > 0 {
			podSpec["imagePullSecrets"] = imagePullSecrets
		}
	}
}

func (d *DockerSecretsPostRenderer) getImageList(podSpec resource) []string {
	images := make([]string, 0)

	containersVal, hasContainers := podSpec["containers"]

	if !hasContainers {
		return images
	}

	containers, ok := containersVal.([]interface{})

	if !ok {
		return images
	}

	for _, container := range containers {
		_container, ok := container.(resource)

		if !ok {
			continue
		}

		image, ok := _container["image"].(string)

		if !ok {
			continue
		}

		images = append(images, image)
	}

	return images
}

var ecrPattern = regexp.MustCompile(`(^[a-zA-Z0-9][a-zA-Z0-9-_]*)\.dkr\.ecr(\-fips)?\.([a-zA-Z0-9][a-zA-Z0-9-_]*)\.amazonaws\.com(\.cn)?`)

func (d *DockerSecretsPostRenderer) isRegistryNative(regName string) bool {
	isNative := false

	if strings.Contains(regName, "gcr") && d.Cluster.AuthMechanism == models.GCP {
		// TODO (POR-33): fix architecture for clusters and re-add the code below

		// // get the project id of the cluster
		// gcpInt, err := d.Repo.GCPIntegration().ReadGCPIntegration(d.Cluster.ProjectID, d.Cluster.GCPIntegrationID)

		// if err != nil {
		// 	return false
		// }

		// gkeProjectID, err := integrations.GCPProjectIDFromJSON(gcpInt.GCPKeyData)

		// if err != nil {
		// 	return false
		// }

		// // parse the project id of the gcr url
		// if regNameArr := strings.Split(regName, "/"); len(regNameArr) >= 2 {
		// 	gcrProjectID := regNameArr[1]

		// 	isNative = gcrProjectID == gkeProjectID
		// }
	} else if strings.Contains(regName, "ecr") && d.Cluster.AuthMechanism == models.AWS {
		matches := ecrPattern.FindStringSubmatch(regName)

		if len(matches) < 3 {
			return false
		}

		eksAccountID := matches[1]
		eksRegion := matches[3]

		awsInt, err := d.Repo.AWSIntegration().ReadAWSIntegration(d.Cluster.ProjectID, d.Cluster.AWSIntegrationID)

		if err != nil {
			return false
		}

		err = awsInt.PopulateAWSArn()

		if err != nil {
			return false
		}

		parsedARN, err := arn.Parse(awsInt.AWSArn)

		if err != nil {
			return false
		}

		isNative = parsedARN.AccountID == eksAccountID && parsedARN.Region == eksRegion
	}

	return isNative
}

// EnvironmentVariablePostrenderer removes duplicated environment variables, giving preference to synced
// env vars
type EnvironmentVariablePostrenderer struct {
	podSpecs  []resource
	resources []resource
}

func NewEnvironmentVariablePostrenderer() (*EnvironmentVariablePostrenderer, error) {
	return &EnvironmentVariablePostrenderer{
		podSpecs:  make([]resource, 0),
		resources: make([]resource, 0),
	}, nil
}

func (e *EnvironmentVariablePostrenderer) Run(
	renderedManifests *bytes.Buffer,
) (modifiedManifests *bytes.Buffer, err error) {
	e.resources, err = decodeRenderedManifests(renderedManifests)

	if err != nil {
		return nil, err
	}

	// Check to see if the resources loaded into the postrenderer contain a configmap
	// with a manifest that needs env var cleanup as well. If this is the case, create and
	// run another postrenderer for this specific manifest.
	for i, res := range e.resources {
		kindVal, hasKind := res["kind"]

		if !hasKind {
			continue
		}

		kind, ok := kindVal.(string)

		if !ok {
			continue
		}

		if kind == "ConfigMap" {
			labelVal := getNestedResource(res, "metadata", "labels")

			if labelVal == nil {
				continue
			}

			porterLabelVal, exists := labelVal["getporter.dev/manifest"]

			if !exists {
				continue
			}

			if labelValStr, ok := porterLabelVal.(string); ok && labelValStr == "true" {
				data := getNestedResource(res, "data")
				manifestData, exists := data["manifest"]

				if !exists {
					continue
				}

				manifestDataStr, ok := manifestData.(string)

				if !ok {
					continue
				}

				dCopy := &EnvironmentVariablePostrenderer{
					podSpecs:  make([]resource, 0),
					resources: make([]resource, 0),
				}

				newData, err := dCopy.Run(bytes.NewBufferString(manifestDataStr))

				if err != nil {
					continue
				}

				data["manifest"] = string(newData.Bytes())

				e.resources[i] = res
			}
		}
	}

	e.getPodSpecs(e.resources)
	e.updatePodSpecs()

	modifiedManifests = bytes.NewBuffer([]byte{})
	encoder := yaml.NewEncoder(modifiedManifests)
	defer encoder.Close()

	for _, resource := range e.resources {
		err = encoder.Encode(resource)

		if err != nil {
			return nil, err
		}
	}

	return modifiedManifests, nil
}

func (e *EnvironmentVariablePostrenderer) getPodSpecs(resources []resource) {
	for _, res := range resources {
		kindVal, hasKind := res["kind"]
		if !hasKind {
			continue
		}

		kind, ok := kindVal.(string)
		if !ok {
			continue
		}

		// manifests of list type will have an items field, items should
		// be recursively parsed
		if itemsVal, isList := res["items"]; isList {
			if items, ok := itemsVal.([]interface{}); ok {
				// convert items to resource
				resArr := make([]resource, 0)
				for _, item := range items {
					if arrVal, ok := item.(resource); ok {
						resArr = append(resArr, arrVal)
					}
				}

				e.getPodSpecs(resArr)
			}

			continue
		}

		// otherwise, get the pod spec based on the type of resource
		podSpec := getPodSpecFromResource(kind, res)

		if podSpec == nil {
			continue
		}

		e.podSpecs = append(e.podSpecs, podSpec)
	}

	return
}

func (e *EnvironmentVariablePostrenderer) updatePodSpecs() error {
	// for each pod spec, remove duplicate env variables
	for _, podSpec := range e.podSpecs {
		containersVal, hasContainers := podSpec["containers"]

		if !hasContainers {
			continue
		}

		containers, ok := containersVal.([]interface{})

		if !ok {
			continue
		}

		newContainers := make([]interface{}, 0)

		for _, container := range containers {
			envVars := make(map[string]interface{})

			_container, ok := container.(resource)

			if !ok {
				continue
			}

			// read container env variables
			envInter, ok := _container["env"]

			if !ok {
				newContainers = append(newContainers, _container)
				continue
			}

			env, ok := envInter.([]interface{})

			if !ok {
				newContainers = append(newContainers, _container)
				continue
			}

			for _, envVar := range env {
				envVarMap, ok := envVar.(resource)

				if !ok {
					continue
				}

				envVarName, ok := envVarMap["name"]

				if !ok {
					continue
				}

				envVarNameStr, ok := envVarName.(string)

				if !ok {
					continue
				}

				// check if the env var already exists, if it does perform reconciliation
				if currVal, exists := envVars[envVarNameStr]; exists {
					currValMap, ok := currVal.(resource)

					if !ok {
						continue
					}

					// if the current value has a valueFrom field, this should override the existing env var
					if _, currValFromFieldExists := currValMap["valueFrom"]; currValFromFieldExists {
						continue
					} else {
						envVars[envVarNameStr] = envVarMap
					}
				} else {
					envVars[envVarNameStr] = envVarMap
				}
			}

			// flatten env var map to array
			envVarArr := make([]interface{}, 0)

			for _, envVar := range envVars {
				envVarArr = append(envVarArr, envVar)
			}

			// Sort the slices according to a stable ordering. This is hacky and inefficient.
			sort.SliceStable(envVarArr, func(i, j int) bool {
				return fmt.Sprintf("%v", envVarArr[i]) > fmt.Sprintf("%v", envVarArr[j])
			})

			_container["env"] = envVarArr
			newContainers = append(newContainers, _container)
		}

		podSpec["containers"] = newContainers
	}

	return nil
}

// HELPERS
func getPodSpecFromResource(kind string, res resource) resource {
	switch kind {
	case "Pod":
		return getNestedResource(res, "spec")
	case "DaemonSet", "Deployment", "Job", "ReplicaSet", "ReplicationController", "StatefulSet":
		return getNestedResource(res, "spec", "template", "spec")
	case "PodTemplate":
		return getNestedResource(res, "template", "spec")
	case "CronJob":
		return getNestedResource(res, "spec", "jobTemplate", "spec", "template", "spec")
	}

	return nil
}

func getNestedResource(res resource, keys ...string) resource {
	curr := res

	var ok bool

	for _, key := range keys {
		curr, ok = curr[key].(resource)

		if !ok {
			return nil
		}
	}

	return curr
}

func getRegNameFromImageRef(image string) (string, error) {
	named, err := reference.ParseNormalizedNamed(image)

	if err != nil {
		return "", err
	}

	domain := reference.Domain(named)
	path := reference.Path(named)

	var regName string

	// if registry is dockerhub, leave the image name as-is
	if strings.Contains(domain, "docker.io") {
		regName = "index.docker.io/" + path
	} else if strings.Contains(domain, "pkg.dev") {
		regName = domain + "/" + strings.Split(path, "/")[0]
	} else {
		regName = domain

		if pathArr := strings.Split(path, "/"); len(pathArr) > 1 {
			regName += "/" + strings.Join(pathArr[:len(pathArr)-1], "/")
		}
	}

	return regName, nil
}

type DeprecatedAPIVersionMapper struct {
}

type APIVersionKind struct {
	oldAPIVersion, newAPIVersion, oldKind, newKind string
}

func (d *DeprecatedAPIVersionMapper) Run(
	oldRenderedManifests *bytes.Buffer,
	newRenderedManifests *bytes.Buffer,
) (modifiedManifests *bytes.Buffer, err error) {
	oldResources, err := decodeRenderedManifests(oldRenderedManifests)

	if err != nil {
		return nil, err
	}

	newResources, err := decodeRenderedManifests(newRenderedManifests)

	if err != nil {
		return nil, err
	}

	newNameResourceMap := make(map[string]resource)

	for _, newRes := range newResources {
		name, ok := getResourceName(newRes)

		if !ok {
			continue
		}

		newKind, _, ok := getKindAndAPIVersion(newRes)

		if !ok {
			continue
		}

		uniqueName := fmt.Sprintf("%s-%s", strings.ToLower(newKind), name)

		newNameResourceMap[uniqueName] = newRes
	}

	nameMap := make(map[string]APIVersionKind)

	for _, oldRes := range oldResources {
		oldName, ok := getResourceName(oldRes)

		if !ok {
			continue
		}

		oldKind, oldAPIVersion, ok := getKindAndAPIVersion(oldRes)

		if !ok {
			continue
		}

		uniqueName := fmt.Sprintf("%s-%s", strings.ToLower(oldKind), oldName)

		newRes, exists := newNameResourceMap[uniqueName]

		if !exists {
			continue
		}

		newKind, newAPIVersion, ok := getKindAndAPIVersion(newRes)

		if !ok {
			continue
		}

		nameMap[oldName] = APIVersionKind{
			oldAPIVersion: oldAPIVersion,
			newAPIVersion: newAPIVersion,
			oldKind:       oldKind,
			newKind:       newKind,
		}

		// if the API versions don't match, update the old api version to the new api version
		if oldAPIVersion != newAPIVersion {
			oldRes["apiVersion"] = newAPIVersion
		}
	}

	modifiedManifests = bytes.NewBuffer([]byte{})
	encoder := yaml.NewEncoder(modifiedManifests)
	defer encoder.Close()

	for _, resource := range oldResources {
		err = encoder.Encode(resource)

		if err != nil {
			return nil, err
		}
	}

	return modifiedManifests, nil
}

func getResourceName(res resource) (string, bool) {
	metadataVal, hasMetadataVal := res["metadata"]

	if !hasMetadataVal {
		return "", false
	}

	metadata, ok := metadataVal.(resource)

	if !ok {
		return "", false
	}

	nameVal, ok := metadata["name"]

	if !ok {
		return "", false
	}

	name, ok := nameVal.(string)

	return name, ok
}

func getKindAndAPIVersion(res resource) (kind string, apiVersion string, ok bool) {
	kindVal, hasKindVal := res["kind"]

	if !hasKindVal {
		return "", "", false
	}

	kind, ok = kindVal.(string)

	if !ok {
		return "", "", false
	}

	apiVersionVal, hasAPIVersionVal := res["apiVersion"]

	if !hasAPIVersionVal {
		return "", "", false
	}

	apiVersion, ok = apiVersionVal.(string)

	if !ok {
		return "", "", false
	}

	return kind, apiVersion, true
}

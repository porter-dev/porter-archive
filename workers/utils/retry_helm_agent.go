//go:build ee

package utils

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/pkg/logger"
	"helm.sh/helm/v3/pkg/release"
)

type RetryHelmAgent struct {
	form          *helm.Form
	l             *logger.Logger
	agent         *helm.Agent
	retryCount    uint
	retryInterval time.Duration
}

func NewRetryHelmAgent(
	form *helm.Form,
	l *logger.Logger,
	retryCount uint,
	retryInterval time.Duration,
) (*RetryHelmAgent, error) {
	if l == nil {
		l = logger.New(true, os.Stdout)
	}

	helmAgent, err := helm.GetAgentOutOfClusterConfig(form, l)

	if err != nil {
		return nil, err
	}

	return &RetryHelmAgent{
		form, l, helmAgent, retryCount, retryInterval,
	}, nil
}

func (a *RetryHelmAgent) ListReleases(
	namespace string,
	filter *types.ReleaseListFilter,
) ([]*release.Release, error) {
	for i := uint(0); i < a.retryCount; i++ {
		releases, err := a.agent.ListReleases(namespace, filter)

		if err == nil {
			return releases, nil
		} else if strings.Contains(err.Error(), "Unauthorized") {
			a.agent, err = helm.GetAgentOutOfClusterConfig(a.form, a.l)

			if err != nil {
				return nil, fmt.Errorf("error recreating helm agent for retrying ListReleases: %w", err)
			}
		} else {
			return nil, err
		}

		time.Sleep(a.retryInterval)
	}

	return nil, fmt.Errorf("maxiumum number of retries (%d) reached for ListReleases", a.retryCount)
}

func (a *RetryHelmAgent) GetReleaseHistory(
	name string,
) ([]*release.Release, error) {
	for i := uint(0); i < a.retryCount; i++ {
		releases, err := a.agent.GetReleaseHistory(name)

		if err == nil {
			return releases, nil
		} else if strings.Contains(err.Error(), "Unauthorized") {
			a.agent, err = helm.GetAgentOutOfClusterConfig(a.form, a.l)

			if err != nil {
				return nil, fmt.Errorf("error recreating helm agent for retrying GetReleaseHistory: %w", err)
			}
		} else {
			return nil, err
		}

		time.Sleep(a.retryInterval)
	}

	return nil, fmt.Errorf("maxiumum number of retries (%d) reached for GetReleaseHistory", a.retryCount)
}

func (a *RetryHelmAgent) DeleteReleaseRevision(
	name string,
	version int,
) error {
	for i := uint(0); i < a.retryCount; i++ {
		err := a.agent.DeleteReleaseRevision(name, version)

		if err == nil {
			return nil
		} else if strings.Contains(err.Error(), "Unauthorized") {
			a.agent, err = helm.GetAgentOutOfClusterConfig(a.form, a.l)

			if err != nil {
				return fmt.Errorf("error recreating helm agent for retrying DeleteReleaseRevision: %w", err)
			}
		} else {
			return err
		}

		time.Sleep(a.retryInterval)
	}

	return fmt.Errorf("maxiumum number of retries (%d) reached for DeleteReleaseRevision", a.retryCount)
}

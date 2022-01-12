import type {
  TrackConnectRegistryClickedProps,
  TrackConnectRegistryIntentProps,
  TrackProvisionAddCredentialsProps,
  TrackProvisionIntentProps,
  TrackProvisionResourcesClickedProps,
  TrackRedirectToGuideProps,
  TrackRegistryAddCredentialsProps,
} from "./types";
import {
  COMMON_TRACKS,
  CONNECT_REGISTRY_TRACKS,
  CONNECT_SOURCE_TRACKS,
  PROJECT_CREATION_TRACKS,
  PROVISION_RESOURCES_TRACKS,
} from "./events";

export function trackCreateNewProject() {
  window.analytics?.track(PROJECT_CREATION_TRACKS.NEW_PROJECT_EVENT);
}

export function trackRedirectToGuide(props: TrackRedirectToGuideProps) {
  window.analytics?.track(COMMON_TRACKS.REDIRECT_TO_GUIDE, props);
}

export const connectSourceTracks = {
  trackConnectGithubButtonClicked() {
    window.analytics?.track(
      CONNECT_SOURCE_TRACKS.CONNECT_GITHUB_BUTTON_CLICKED
    );
  },
  trackUseDockerRegistryClicked() {
    window.analytics?.track(CONNECT_SOURCE_TRACKS.USE_DOCKER_REGISTRY_CLICKED);
  },
  trackContinueAfterGithubConnect() {
    window.analytics?.track(
      CONNECT_SOURCE_TRACKS.CONTINUE_AFTER_GITHUB_CONNECT
    );
  },
  trackInstallOnMoreRepositoriesClicked() {
    window.analytics?.track(
      CONNECT_SOURCE_TRACKS.INSTALL_ON_MORE_REPOSITORIES_CLICKED
    );
  },
};

export const connectRegistryTracks = {
  trackSkipRegistryConnection() {
    window.analytics?.track(CONNECT_REGISTRY_TRACKS.SKIP_REGISTRY_CONNECTION);
  },
  trackConnectRegistryIntent(props: TrackConnectRegistryIntentProps) {
    window.analytics?.track(CONNECT_REGISTRY_TRACKS.INTENT, props);
  },
  trackRegistryAddCredentials(props: TrackRegistryAddCredentialsProps) {
    window.analytics?.track(CONNECT_REGISTRY_TRACKS.ADD_CREDENTIALS, props);
  },
  trackConnectRegistryClicked(props: TrackConnectRegistryClickedProps) {
    window.analytics?.track(
      CONNECT_REGISTRY_TRACKS.CONNECT_REGISTRY_CLICKED,
      props
    );
  },
};

export const provisionResourcesTracks = {
  trackConnectExternalClusterIntent() {
    window.analytics?.track(
      PROVISION_RESOURCES_TRACKS.CONNECT_EXTERNAL_CLUSTER_INTENT
    );
  },
  trackExternalClusterConnected() {
    window.analytics?.track(
      PROVISION_RESOURCES_TRACKS.CONNECTED_EXTERNAL_CLUSTER
    );
  },
  trackProvisionIntent(props: TrackProvisionIntentProps) {
    window.analytics?.track(PROVISION_RESOURCES_TRACKS.PROVISION_INTENT, props);
  },
  trackProvisionAddCredentials(props: TrackProvisionAddCredentialsProps) {
    window.analytics?.track(PROVISION_RESOURCES_TRACKS.ADD_CREDENTIALS, props);
  },
  trackProvisionResourcesClicked(props: TrackProvisionResourcesClickedProps) {
    window.analytics?.track(
      PROVISION_RESOURCES_TRACKS.PROVISION_RESOURCES_CLICKED,
      props
    );
  },
};

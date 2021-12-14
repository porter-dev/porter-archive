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

export function trackRedirectToGuide(props: RedirectToGuideProps) {
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
  trackConnectRegistryIntent() {
    window.analytics?.track(CONNECT_REGISTRY_TRACKS.INTENT);
  },
  trackAddCredentials() {
    window.analytics?.track(CONNECT_REGISTRY_TRACKS.ADD_CREDENTIALS);
  },
  trackConnectRegistryClicked() {
    window.analytics?.track(CONNECT_REGISTRY_TRACKS.CONNECT_REGISTRY_CLICKED);
  },
};

export const provisionResourcesTracks = {
  trackProvisionIntent() {
    window.analytics?.track(PROVISION_RESOURCES_TRACKS.PROVISION_INTENT);
  },
  trackAddCredentials() {
    window.analytics?.track(PROVISION_RESOURCES_TRACKS.ADD_CREDENTIALS);
  },
  trackProvisionResourcesClicked() {
    window.analytics?.track(
      PROVISION_RESOURCES_TRACKS.PROVISION_RESOURCES_CLICKED
    );
  },
};

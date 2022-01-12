export type TrackRedirectToGuideProps = {
  step: string;
  guide_url: string;
  provider?: string;
};

export type TrackConnectRegistryIntentProps = {
  provider: string;
};

export type TrackRegistryAddCredentialsProps = {
  step: string;
  provider: string;
};

export type TrackConnectRegistryClickedProps = {
  provider: string;
};

export type TrackProvisionIntentProps = {
  provider: string;
};

export type TrackProvisionAddCredentialsProps = {
  step: string;
  provider: string;
};

export type TrackProvisionResourcesClickedProps = {
  provider: string;
  cluster_name: string;
  machine_type?: string;
  subscription_tier?: string;
  region?: string;
};

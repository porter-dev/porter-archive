import github from "../assets/github.png";
import gitlab from "../assets/gitlab-icon.png";
import digitalocean from "../assets/digitalocean-icon.png";
import googlecloud from "../assets/googlecloud-icon.png";
import aws from "../assets/aws-icon.png";
import ecr from "../assets/ecr-icon.png";
import gcr from "../assets/gcr-icon.png";
import docker from "../assets/docker-icon.png";
import kube from "../assets/kubernetes-icon.png";
import eks from "../assets/amazoneks-icon.png";
import gke from "../assets/gke-icon.png";
import registry from "../assets/dockerregistry-icon.png";
import repo from "../assets/gitrepo-icon.png";

export const infraNames: any = {
  ecr: "Elastic Container Registry (ECR)",
  eks: "Elastic Kubernetes Service (EKS)",
  gcr: "Google Container Registry (GCR)",
  gke: "Google Kubernetes Engine (GKE)",
  docr: "Digital Ocean Container Registry",
  doks: "Digital Ocean Kubernetes Service",
};

export const integrationList: any = {
  kubernetes: {
    icon: kube,
    label: "Kubernetes",
    buttonText: "Add a Cluster",
  },
  repo: {
    icon: repo,
    label: "Git Repository",
    buttonText: "Link a Github Account",
  },
  registry: {
    icon: registry,
    label: "Docker Registry",
    buttonText: "Add a Registry",
  },
  gke: {
    icon: gke,
    label: "Google Kubernetes Engine (GKE)",
  },
  eks: {
    icon: eks,
    label: "Amazon Elastic Kubernetes Service (EKS)",
  },
  kube: {
    icon: kube,
    label: "Upload Kubeconfig",
  },
  docker: {
    icon: docker,
    label: "Docker Hub",
  },
  gcr: {
    icon: gcr,
    label: "Google Container Registry (GCR)",
  },
  ecr: {
    icon: ecr,
    label: "Elastic Container Registry (ECR)",
  },
  aws: {
    icon:
      "https://uxwing.com/wp-content/themes/uxwing/download/10-brands-and-social-media/aws.png",
    label: "AWS",
  },
  gcp: {
    icon: googlecloud,
    label: "GCP",
  },
  do: {
    icon: digitalocean,
    label: "DigitalOcean",
  },
  github: {
    icon:
      "https://uxwing.com/wp-content/themes/uxwing/download/10-brands-and-social-media/github.png",
    label: "GitHub",
  },
  gitlab: {
    icon: gitlab,
    label: "Gitlab",
  },
};

export const isAlphanumeric = (x: string | null) => {
  let re = /^[a-z0-9-]+$/;
  if (!x || x.length == 0 || x.search(re) === -1) {
    return false;
  }
  return true;
};

export const getIgnoreCase = (object: any, key: string) => {
  return object[
    Object.keys(object).find((k) => k.toLowerCase() === key.toLowerCase())
  ];
};

import aws from "assets/aws.png";
import azure from "assets/azure.png";
import infra from "assets/cluster.svg";
import gcp from "assets/gcp.png";

import {
  type ClientCloudProvider,
  type ClientRegion,
  type CloudProvider,
  type MachineType,
} from "./types";

export const CloudProviderAWS: ClientCloudProvider = {
  name: "AWS",
  displayName: "Amazon Web Services",
  icon: aws,
};
export const CloudProviderGCP: ClientCloudProvider = {
  name: "GCP",
  displayName: "Google Cloud Platform",
  icon: gcp,
};
export const CloudProviderAzure: ClientCloudProvider = {
  name: "Azure",
  displayName: "Microsoft Azure",
  icon: azure,
};
export const CloudProviderLocal: ClientCloudProvider = {
  name: "Local",
  displayName: "Local",
  icon: infra,
};
export const SUPPORTED_CLOUD_PROVIDERS = [
  CloudProviderAWS,
  CloudProviderGCP,
  CloudProviderAzure,
  CloudProviderLocal,
];

export const SUPPORTED_AWS_REGIONS: ClientRegion[] = [
  { name: "us-east-1", displayName: "US East (N. Virginia) us-east-1" },
  { name: "us-east-2", displayName: "US East (Ohio) us-east-2" },
  { name: "us-west-1", displayName: "US West (N. California) us-west-1" },
  { name: "us-west-2", displayName: "US West (Oregon) us-west-2" },
  { name: "af-south-1", displayName: "Africa (Cape Town) af-south-1" },
  { name: "ap-east-1", displayName: "Asia Pacific (Hong Kong) ap-east-1" },
  { name: "ap-south-1", displayName: "Asia Pacific (Mumbai) ap-south-1" },
  {
    name: "ap-northeast-2",
    displayName: "Asia Pacific (Seoul) ap-northeast-2",
  },
  {
    name: "ap-southeast-1",
    displayName: "Asia Pacific (Singapore) ap-southeast-1",
  },
  {
    name: "ap-southeast-2",
    displayName: "Asia Pacific (Sydney) ap-southeast-2",
  },
  {
    name: "ap-northeast-1",
    displayName: "Asia Pacific (Tokyo) ap-northeast-1",
  },
  { name: "ca-central-1", displayName: "Canada (Central) ca-central-1" },
  { name: "eu-central-1", displayName: "Europe (Frankfurt) eu-central-1" },
  { name: "eu-west-1", displayName: "Europe (Ireland) eu-west-1" },
  { name: "eu-west-2", displayName: "Europe (London) eu-west-2" },
  { name: "eu-south-1", displayName: "Europe (Milan) eu-south-1" },
  { name: "eu-west-3", displayName: "Europe (Paris) eu-west-3" },
  { name: "eu-north-1", displayName: "Europe (Stockholm) eu-north-1" },
  { name: "me-south-1", displayName: "Middle East (Bahrain) me-south-1" },
  { name: "sa-east-1", displayName: "South America (São Paulo) sa-east-1" },
];

export const SUPPORTED_GCP_REGIONS: ClientRegion[] = [
  { name: "us-east1", displayName: "us-east1 (South Carolina, USA)" },
  { name: "us-east4", displayName: "us-east4 (Virginia, USA)" },
  { name: "us-central1", displayName: "us-central1 (Iowa, USA)" },
  { name: "europe-north1", displayName: "europe-north1 (Hamina, Finland)" },
  { name: "europe-central2", displayName: "europe-central2 (Warsaw, Poland)" },
  { name: "europe-west1", displayName: "europe-west1 (St. Ghislain, Belgium)" },
  { name: "europe-west2", displayName: "europe-west2 (London, England)" },
  { name: "europe-west6", displayName: "europe-west6 (Zurich, Switzerland)" },
  { name: "asia-south1", displayName: "asia-south1 (Mumbia, India)" },
  { name: "us-west1", displayName: "us-west1 (Oregon, USA)" },
  { name: "us-west2", displayName: "us-west2 (Los Angeles, USA)" },
  { name: "us-west3", displayName: "us-west3 (Salt Lake City, USA)" },
  { name: "us-west4", displayName: "us-west4 (Las Vegas, USA)" },
];

export const SUPPORTED_AZURE_REGIONS: ClientRegion[] = [
  { name: "australiaeast", displayName: "Australia East" },
  { name: "brazilsouth", displayName: "Brazil South" },
  { name: "canadacentral", displayName: "Canada Central" },
  { name: "centralindia", displayName: "Central India" },
  { name: "centralus", displayName: "Central US" },
  { name: "eastasia", displayName: "East Asia" },
  { name: "eastus", displayName: "East US" },
  { name: "eastus2", displayName: "East US 2" },
  { name: "francecentral", displayName: "France Central" },
  { name: "northeurope", displayName: "North Europe" },
  { name: "norwayeast", displayName: "Norway East" },
  { name: "southafricanorth", displayName: "South Africa North" },
  { name: "southcentralus", displayName: "South Central US" },
  { name: "swedencentral", displayName: "Sweden Central" },
  { name: "switzerlandnorth", displayName: "Switzerland North" },
  { name: "uaenorth", displayName: "UAE North" },
  { name: "uksouth", displayName: "UK South" },
  { name: "westeurope", displayName: "West Europe" },
  { name: "westus2", displayName: "West US 2" },
  { name: "westus3", displayName: "West US 3" },
];

export const SUPPORTED_MACHINE_TYPES: Record<CloudProvider, MachineType[]> = {
  AWS: [{}],
  GCP: [],
  Azure: [],
  Local: [],
};

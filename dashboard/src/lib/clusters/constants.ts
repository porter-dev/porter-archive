import {
  AksSkuTier,
  Contract,
  EnumCloudProvider,
  EnumKubernetesKind,
  GKENetwork,
  LoadBalancerType,
} from "@porter-dev/api-contracts";

import aws from "assets/aws.png";
import azure from "assets/azure.png";
import infra from "assets/cluster.svg";
import gcp from "assets/gcp.png";

import {
  type ClientCloudProvider,
  type ClientRegion,
  type MachineType,
  type PreflightCheck,
} from "./types";

const SUPPORTED_AWS_REGIONS: ClientRegion[] = [
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

const SUPPORTED_GCP_REGIONS: ClientRegion[] = [
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

const SUPPORTED_AZURE_REGIONS: ClientRegion[] = [
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

const SUPPORTED_AWS_MACHINE_TYPES: MachineType[] = [
  {
    name: "t3.medium",
    displayName: "t3.medium",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t3.large",
    displayName: "t3.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t3.xlarge",
    displayName: "t3.xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t3.2xlarge",
    displayName: "t3.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t3a.medium",
    displayName: "t3a.medium",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t3a.large",
    displayName: "t3a.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t3a.xlarge",
    displayName: "t3a.xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t3a.2xlarge",
    displayName: "t3a.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t4g.medium",
    displayName: "t4g.medium",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t4g.large",
    displayName: "t4g.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t4g.xlarge",
    displayName: "t4g.xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "t4g.2xlarge",
    displayName: "t4g.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c6i.large",
    displayName: "c6i.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c6i.xlarge",
    displayName: "c6i.xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c6i.2xlarge",
    displayName: "c6i.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c6i.4xlarge",
    displayName: "c6i.4xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c6i.8xlarge",
    displayName: "c6i.8xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c6a.large",
    displayName: "c6a.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c6a.2xlarge",
    displayName: "c6a.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c6a.4xlarge",
    displayName: "c6a.4xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c6a.8xlarge",
    displayName: "c6a.8xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "r6i.large",
    displayName: "r6i.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "r6i.xlarge",
    displayName: "r6i.xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "r6i.2xlarge",
    displayName: "r6i.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "r6i.4xlarge",
    displayName: "r6i.4xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "r6i.8xlarge",
    displayName: "r6i.8xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "r6i.12xlarge",
    displayName: "r6i.12xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "r6i.16xlarge",
    displayName: "r6i.16xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "r6i.24xlarge",
    displayName: "r6i.24xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "r6i.32xlarge",
    displayName: "r6i.32xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m5n.large",
    displayName: "m5n.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m5n.xlarge",
    displayName: "m5n.xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m5n.2xlarge",
    displayName: "m5n.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m6a.large",
    displayName: "m6a.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m6a.xlarge",
    displayName: "m6a.xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m6a.2xlarge",
    displayName: "m6a.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m6a.4xlarge",
    displayName: "m6a.4xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m6a.8xlarge",
    displayName: "m6a.8xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m6a.12xlarge",
    displayName: "m6a.12xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7a.medium",
    displayName: "m7a.medium",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7a.large",
    displayName: "m7a.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7a.xlarge",
    displayName: "m7a.xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7a.2xlarge",
    displayName: "m7a.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7a.4xlarge",
    displayName: "m7a.4xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7a.8xlarge",
    displayName: "m7a.8xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7a.12xlarge",
    displayName: "m7a.12xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7a.16xlarge",
    displayName: "m7a.16xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7a.24xlarge",
    displayName: "m7a.24xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7i.large",
    displayName: "m7i.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7i.xlarge",
    displayName: "m7i.xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7i.2xlarge",
    displayName: "m7i.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7i.4xlarge",
    displayName: "m7i.4xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7i.8xlarge",
    displayName: "m7i.8xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "m7i.12xlarge",
    displayName: "m7i.12xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c7a.medium",
    displayName: "c7a.medium",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c7a.large",
    displayName: "c7a.large",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c7a.xlarge",
    displayName: "c7a.xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c7a.2xlarge",
    displayName: "c7a.2xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c7a.4xlarge",
    displayName: "c7a.4xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c7a.8xlarge",
    displayName: "c7a.8xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c7a.12xlarge",
    displayName: "c7a.12xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c7a.16xlarge",
    displayName: "c7a.16xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
  {
    name: "c7a.24xlarge",
    displayName: "c7a.24xlarge",
    supportedRegions: SUPPORTED_AWS_REGIONS.map((r) => r.name),
  },
];

const SUPPORTED_GCP_MACHINE_TYPES: MachineType[] = [
  {
    name: "e2-standard-2",
    displayName: "e2-standard-2",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "e2-standard-4",
    displayName: "e2-standard-4",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "e2-standard-8",
    displayName: "e2-standard-8",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "e2-standard-16",
    displayName: "e2-standard-16",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "e2-standard-32",
    displayName: "e2-standard-32",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-standard-4",
    displayName: "c3-standard-4",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-standard-8",
    displayName: "c3-standard-8",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-standard-22",
    displayName: "c3-standard-22",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-standard-44",
    displayName: "c3-standard-44",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-highcpu-4",
    displayName: "c3-highcpu-4",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-highcpu-8",
    displayName: "c3-highcpu-8",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-highcpu-22",
    displayName: "c3-highcpu-22",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-highcpu-44",
    displayName: "c3-highcpu-44",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-highmem-4",
    displayName: "c3-highmem-4",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-highmem-8",
    displayName: "c3-highmem-8",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-highmem-22",
    displayName: "c3-highmem-22",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "c3-highmem-44",
    displayName: "c3-highmem-44",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-standard-1",
    displayName: "n1-standard-1",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-standard-2",
    displayName: "n1-standard-2",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-standard-4",
    displayName: "n1-standard-4",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-standard-8",
    displayName: "n1-standard-8",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-standard-16",
    displayName: "n1-standard-16",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-standard-32",
    displayName: "n1-standard-32",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-highmem-2",
    displayName: "n1-highmem-2",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-highmem-4",
    displayName: "n1-highmem-4",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-highmem-8",
    displayName: "n1-highmem-8",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-highmem-16",
    displayName: "n1-highmem-16",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-highmem-32",
    displayName: "n1-highmem-32",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-highcpu-8",
    displayName: "n1-highcpu-8",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-highcpu-16",
    displayName: "n1-highcpu-16",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
  {
    name: "n1-highcpu-32",
    displayName: "n1-highcpu-32",
    supportedRegions: SUPPORTED_GCP_REGIONS.map((r) => r.name),
  },
];

const SUPPORTED_AZURE_MACHINE_TYPES: MachineType[] = [
  {
    name: "Standard_B2als_v2",
    displayName: "Standard_B2als_v2",
    supportedRegions: [
      "australiaeast",
      "brazilsouth",
      "canadacentral",
      "centralindia",
      "centralus",
      "eastasia",
      "eastus",
      "eastus2",
      "francecentral",
      "northeurope",
      "norwayeast",
      "southafricanorth",
      "southcentralus",
      "swedencentral",
      "switzerlandnorth",
      "uaenorth",
      "uksouth",
      "westeurope",
      "westus2",
      "westus3",
    ],
  },
  {
    name: "Standard_B2as_v2",
    displayName: "Standard_B2as_v2",
    supportedRegions: [
      "australiaeast",
      "brazilsouth",
      "canadacentral",
      "centralindia",
      "centralus",
      "eastasia",
      "eastus",
      "eastus2",
      "francecentral",
      "northeurope",
      "norwayeast",
      "southafricanorth",
      "southcentralus",
      "swedencentral",
      "switzerlandnorth",
      "uaenorth",
      "uksouth",
      "westeurope",
      "westus2",
      "westus3",
    ],
  },
  {
    name: "Standard_A2_v2",
    displayName: "Standard_A2_v2",
    supportedRegions: [
      "australiaeast",
      "canadacentral",
      "centralindia",
      "eastasia",
      "eastus",
      "eastus2",
      "francecentral",
      "northeurope",
      "norwayeast",
      "southafricanorth",
      "swedencentral",
      "switzerlandnorth",
      "uaenorth",
      "uksouth",
    ],
  },
  {
    name: "Standard_A4_v2",
    displayName: "Standard_A4_v2",
    supportedRegions: [
      "australiaeast",
      "canadacentral",
      "centralindia",
      "eastasia",
      "eastus",
      "eastus2",
      "francecentral",
      "northeurope",
      "norwayeast",
      "southafricanorth",
      "swedencentral",
      "switzerlandnorth",
      "uaenorth",
      "uksouth",
    ],
  },
  {
    name: "Standard_DS1_v2",
    displayName: "Standard_DS1_v2",
    supportedRegions: [
      "australiaeast",
      "canadacentral",
      "centralindia",
      "eastasia",
      "eastus",
      "eastus2",
      "francecentral",
      "northeurope",
      "norwayeast",
      "southafricanorth",
      "swedencentral",
      "switzerlandnorth",
      "uaenorth",
      "uksouth",
    ],
  },
  {
    name: "Standard_DS2_v2",
    displayName: "Standard_DS2_v2",
    supportedRegions: [
      "australiaeast",
      "canadacentral",
      "centralindia",
      "eastasia",
      "eastus",
      "eastus2",
      "francecentral",
      "northeurope",
      "norwayeast",
      "southafricanorth",
      "swedencentral",
      "switzerlandnorth",
      "uaenorth",
      "uksouth",
      "swedencentral",
      "switzerlandnorth",
      "westus3",
    ],
  },
  {
    name: "Standard_D2ads_v5",
    displayName: "Standard_D2ads_v5",
    supportedRegions: [
      "australiaeast",
      "canadacentral",
      "centralindia",
      "eastasia",
      "eastus",
      "northeurope",
      "norwayeast",
      "southafricanorth",
      "swedencentral",
      "uaenorth",
      "uksouth",
      "westus3",
    ],
  },
  {
    name: "Standard_B4als_v2",
    displayName: "Standard_B4als_v2",
    supportedRegions: [
      "australiaeast",
      "brazilsouth",
      "canadacentral",
      "centralindia",
      "centralus",
      "eastasia",
      "eastus",
      "eastus2",
      "francecentral",
      "northeurope",
      "norwayeast",
      "southafricanorth",
      "southcentralus",
      "swedencentral",
      "switzerlandnorth",
      "uaenorth",
      "uksouth",
      "westeurope",
      "westus2",
      "westus3",
    ],
  },
  {
    name: "Standard_NC4as_T4_v3",
    displayName: "Standard_NC4as_T4_v3",
    supportedRegions: [
      "australiaeast",
      "centralindia",
      "eastus",
      "eastus2",
      "northeurope",
      "southcentralus",
      "uksouth",
      "westeurope",
      "westus2",
    ],
  },
  {
    name: "Standard_NC8as_T4_v3",
    displayName: "Standard_NC8as_T4_v3",
    supportedRegions: [
      "australiaeast",
      "centralindia",
      "eastus",
      "eastus2",
      "northeurope",
      "southcentralus",
      "uksouth",
      "westeurope",
      "westus2",
    ],
  },
  {
    name: "Standard_NC16as_T4_v3",
    displayName: "Standard_NC16as_T4_v3",
    supportedRegions: [
      "australiaeast",
      "centralindia",
      "eastus",
      "eastus2",
      "northeurope",
      "southcentralus",
      "uksouth",
      "westeurope",
      "westus2",
    ],
  },
  {
    name: "Standard_NC64as_T4_v3",
    displayName: "Standard_NC64as_T4_v3",
    supportedRegions: [
      "australiaeast",
      "centralindia",
      "eastus",
      "eastus2",
      "northeurope",
      "southcentralus",
      "uksouth",
      "westeurope",
      "westus2",
    ],
  },
  {
    name: "Standard_D8s_v3",
    displayName: "Standard_D8s_v3",
    supportedRegions: [
      "australiaeast",
      "canadacentral",
      "centralindia",
      "eastasia",
      "eastus",
      "eastus2",
      "francecentral",
      "northeurope",
      "norwayeast",
      "southafricanorth",
      "swedencentral",
      "switzerlandnorth",
      "uaenorth",
      "uksouth",
    ],
  },
];
const SUPPORTED_AZURE_SKU_TIERS = [
  {
    name: "FREE",
    displayName: "Free",
  },
  {
    name: "STANDARD",
    displayName: "Standard (for production workloads, +$73/month)",
  },
];

const SUPPORTED_AWS_PREFLIGHT_CHECKS: PreflightCheck[] = [
  {
    name: "eip",
    displayName: "Elastic IP availability",
  },
  {
    name: "natGateway",
    displayName: "NAT Gateway availability",
  },
  {
    name: "vpc",
    displayName: "VPC availability",
  },
  {
    name: "vcpu",
    displayName: "vCPU availability",
  },
];

const SUPPORTED_GCP_PREFLIGHT_CHECKS: PreflightCheck[] = [
  {
    name: "apiEnabled",
    displayName: "APIs enabled on service account",
  },
  {
    name: "cidrAvailability",
    displayName: "CIDR availability",
  },
  {
    name: "iamPermissions",
    displayName: "IAM permissions",
  },
];

const DEFAULT_EKS_CONTRACT = new Contract({
  cluster: {
    kind: EnumKubernetesKind.EKS,
    cloudProvider: EnumCloudProvider.AWS,
    kindValues: {
      case: "eksKind",
      value: {
        clusterVersion: "v1.27.0",
        loadBalancer: {
          loadBalancerType: LoadBalancerType.NLB,
        },
        network: {
          serviceCidr: "172.20.0.0/16",
          vpcCidr: "10.78.0.0/16",
        },
      },
    },
  },
});

const DEFAULT_AKS_CONTRACT = new Contract({
  cluster: {
    kind: EnumKubernetesKind.AKS,
    cloudProvider: EnumCloudProvider.AZURE,
    kindValues: {
      case: "aksKind",
      value: {
        clusterVersion: "v1.27.3",
        cidrRange: "10.78.0.0/16",
        skuTier: AksSkuTier.FREE,
      },
    },
  },
});

const DEFAULT_GKE_CONTRACT = new Contract({
  cluster: {
    kind: EnumKubernetesKind.GKE,
    cloudProvider: EnumCloudProvider.GCP,
    kindValues: {
      case: "gkeKind",
      value: {
        clusterVersion: "v1.27.0",
        network: new GKENetwork({
          cidrRange: "10.78.0.0/16",
          controlPlaneCidr: "10.77.0.0/28",
          podCidr: "10.76.0.0/16",
          serviceCidr: "10.75.0.0/16",
        }),
      },
    },
  },
});

export const CloudProviderAWS: ClientCloudProvider = {
  name: "AWS",
  displayName: "Amazon Web Services",
  icon: aws,
  regions: SUPPORTED_AWS_REGIONS,
  machineTypes: SUPPORTED_AWS_MACHINE_TYPES,
  baseCost: 224.58,
  newClusterDefaultContract: DEFAULT_EKS_CONTRACT,
  preflightChecks: SUPPORTED_AWS_PREFLIGHT_CHECKS,
  config: {
    kind: "AWS",
  },
};
export const CloudProviderGCP: ClientCloudProvider = {
  name: "GCP",
  displayName: "Google Cloud Platform",
  icon: gcp,
  regions: SUPPORTED_GCP_REGIONS,
  machineTypes: SUPPORTED_GCP_MACHINE_TYPES,
  baseCost: 253.0,
  newClusterDefaultContract: DEFAULT_GKE_CONTRACT,
  preflightChecks: SUPPORTED_GCP_PREFLIGHT_CHECKS,
  config: {
    kind: "GCP",
  },
};
export const CloudProviderAzure: ClientCloudProvider & {
  config: { kind: "Azure" };
} = {
  name: "Azure",
  displayName: "Microsoft Azure",
  icon: azure,
  regions: SUPPORTED_AZURE_REGIONS,
  machineTypes: SUPPORTED_AZURE_MACHINE_TYPES,
  baseCost: 164.69,
  newClusterDefaultContract: DEFAULT_AKS_CONTRACT,
  preflightChecks: [],
  config: {
    kind: "Azure",
    skuTiers: SUPPORTED_AZURE_SKU_TIERS,
  },
};
export const CloudProviderLocal: ClientCloudProvider = {
  name: "Local",
  displayName: "Local",
  icon: infra,
  regions: [],
  machineTypes: [],
  baseCost: 0,
  newClusterDefaultContract: new Contract({}),
  preflightChecks: [],
  config: {
    kind: "Local",
  },
};
export const SUPPORTED_CLOUD_PROVIDERS = [
  CloudProviderAWS,
  CloudProviderGCP,
  CloudProviderAzure,
  CloudProviderLocal,
];

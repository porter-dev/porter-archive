import aws from '../assets/aws.png';
import digitalOcean from '../assets/do.png';
import gcp from '../assets/gcp.png';
import { InfraType } from '../shared/types';

export const infraNames: any = {
  'ecr': 'Elastic Container Registry (ECR)',
  'eks': 'Elastic Kubernetes Service (EKS)',
  'gcr': 'Google Container Registry (GCR)',
  'gke': 'Google Kubernetes Engine (GKE)',
  'docr': 'Digital Ocean Container Registry',
  'doks': 'Digital Ocean Kubernetes Service'
};

export const integrationList: any = {
  'kubernetes': {
    icon: 'https://uxwing.com/wp-content/themes/uxwing/download/10-brands-and-social-media/kubernetes.png',
    label: 'Kubernetes',
    buttonText: 'Add a Cluster',
  },
  'repo': {
    icon: 'https://3.bp.blogspot.com/-xhNpNJJyQhk/XIe4GY78RQI/AAAAAAAAItc/ouueFUj2Hqo5dntmnKqEaBJR4KQ4Q2K3ACK4BGAYYCw/s1600/logo%2Bgit%2Bicon.png',
    label: 'Git Repository',
    buttonText: 'Add a Repository',
  },
  'registry': {
    icon: 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png',
    label: 'Docker Registry',
    buttonText: 'Add a Registry',
  },
  'gke': {
    icon: 'https://sysdig.com/wp-content/uploads/2016/08/GKE_color.png',
    label: 'Google Kubernetes Engine (GKE)',
  },
  'eks': {
    icon: 'https://img.stackshare.io/service/7991/amazon-eks.png',
    label: 'Amazon Elastic Kubernetes Service (EKS)',
  },
  'kube': {
    icon: 'https://uxwing.com/wp-content/themes/uxwing/download/10-brands-and-social-media/kubernetes.png',
    label: 'Upload Kubeconfig'
  },
  'docker': {
    icon: 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png',
    label: 'Docker Hub',
  },
  'gcr': {
    icon: 'https://carlossanchez.files.wordpress.com/2019/06/21046548.png?w=640',
    label: 'Google Container Registry (GCR)',
  },
  'ecr': {
    icon: 'https://avatars2.githubusercontent.com/u/52505464?s=400&u=da920f994c67665c7ad6c606a5286557d4f8555f&v=4',
    label: 'Elastic Container Registry (ECR)',
  },
  'aws': {
    icon: aws,
    label: 'AWS',
  },
  'gcp': {
    icon: gcp,
    label: 'GCP',
  },
  'do': {
    icon: digitalOcean,
    label: 'DigitalOcean',
  }
};

export const isAlphanumeric = (x: string | null) => {
  let re = /^[a-z0-9-]+$/;
  if (!x || x.length == 0 || x.search(re) === -1) {
    return false;
  }
  return true;
}

export const getIgnoreCase = (object: any, key: string) => {
  return object[Object.keys(object)
    .find(k => k.toLowerCase() === key.toLowerCase())
  ];
}

const infraSets = [
  ['ecr', 'eks'],
  ['gcr', 'gke'],
  ['docr', 'doks']
];

export const includesCompletedInfraSet = (infras: InfraType[]): boolean => {
  if (infras.length === 0) {
    return false;
  }

  let completed = [] as string[];
  infras.forEach((infra: InfraType, i: number) => {
    if (infra.status === 'created') {
      completed.push(infra.kind);
    }
  });

  completed.forEach((kind: string, i: number) => {
    infraSets.forEach((infraSet: string[], i: number) => {
      infraSet.includes(kind) && infraSet.splice(infraSet.indexOf(kind), 1);
    });
  });

  let anyCompleted = false;
  infraSets.forEach((infraSet: string[], i: number) => {
    if (infraSet.length === 0) {
      anyCompleted = true;
    }
  })
  return anyCompleted;
}

export const filterOldInfras = (infras: InfraType[]): InfraType[] => {
  let newestInstances = {} as any;
  let newestId = -1;
  let whitelistedInfras = [] as string[];
  infras.forEach((infra: InfraType, i: number) => {

    // Determine the most recent set for which provisioning was attempted
    if (infra.id > newestId) {
      newestId = infra.id;
      infraSets.forEach((infraSet: string[]) => {
        infraSet.includes(infra.kind) ? whitelistedInfras = infraSet : null;
      });
    }

    if (!newestInstances[infra.kind]) {
      newestInstances[infra.kind] = infra;
    } else {
      let existingId = newestInstances[infra.kind].id;
      if (infra.id > existingId) {
        newestInstances[infra.kind] = infra;
      }
    }
  });

  let newestInfras = Object.values(newestInstances) as InfraType[];
  let result = newestInfras.filter((x: InfraType) => {
    return whitelistedInfras.includes(x.kind)
  });
  return result;
}
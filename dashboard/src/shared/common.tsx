export const getIntegrationIcon = (kind: string) => {
  switch (kind) {
    case 'gke':
      return 'https://sysdig.com/wp-content/uploads/2016/08/GKE_color.png';
    case 'eks':
      return 'https://img.stackshare.io/service/7991/amazon-eks.png';
    case 'kubeconfig':
      return 'https://uxwing.com/wp-content/themes/uxwing/download/10-brands-and-social-media/kubernetes.png';
    case 'docker-hub':
      return 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png';
    case 'gcr':
      return 'https://carlossanchez.files.wordpress.com/2019/06/21046548.png?w=640';
    case 'ecr':
      return 'https://avatars2.githubusercontent.com/u/52505464?s=400&u=da920f994c67665c7ad6c606a5286557d4f8555f&v=4';
    case 'kubernetes':
      return 'https://uxwing.com/wp-content/themes/uxwing/download/10-brands-and-social-media/kubernetes.png';
    case 'repo':
      return 'https://3.bp.blogspot.com/-xhNpNJJyQhk/XIe4GY78RQI/AAAAAAAAItc/ouueFUj2Hqo5dntmnKqEaBJR4KQ4Q2K3ACK4BGAYYCw/s1600/logo%2Bgit%2Bicon.png';
    case 'registry':
      return 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png';
    default:
      return null
  }
}

export const getIgnoreCase = (object: any, key: string) => {
  return object[Object.keys(object)
    .find(k => k.toLowerCase() === key.toLowerCase())
  ];
}
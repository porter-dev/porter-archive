export const getRegistryIcon = (kind: string) => {
  switch (kind) {
    case 'docker-hub':
      return 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png';
    case 'gcr':
      return 'https://carlossanchez.files.wordpress.com/2019/06/21046548.png?w=640';
    case 'ecr':
      return 'https://avatars2.githubusercontent.com/u/52505464?s=400&u=da920f994c67665c7ad6c606a5286557d4f8555f&v=4';
    default:
      return null
  }
}
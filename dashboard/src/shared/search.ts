import Fuse from "fuse.js";

export const search = <T>(
  items: T[],
  searchTerm: string,
  options?: Fuse.IFuseOptions<T>
) => {
  if (!searchTerm) {
    return items;
  }
  const fuse = new Fuse<T>(items, options);
  return fuse.search(searchTerm).map((result) => result.item);
};

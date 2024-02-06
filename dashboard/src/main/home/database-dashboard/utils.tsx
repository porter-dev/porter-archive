import { type SerializedDatastore } from "lib/databases/types";

export const datastoreField = (
  datastore: SerializedDatastore,
  field: string
): string => {
  if (datastore.metadata?.length === 0) {
    return "";
  }

  const properties = datastore.metadata?.filter(
    (metadata) => metadata.name === field
  );
  if (properties === undefined || properties.length === 0) {
    return "";
  }

  if (properties.length === 0) {
    return "";
  }

  return properties[0].value;
};

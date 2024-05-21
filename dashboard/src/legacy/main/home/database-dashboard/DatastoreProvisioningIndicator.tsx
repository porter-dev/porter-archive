import React, { useMemo } from "react";
import StatusBar from "legacy/components/porter/StatusBar";

import {
  DATASTORE_TEMPLATE_NEON,
  DATASTORE_TEMPLATE_UPSTASH,
} from "./constants";
import { useDatastoreContext } from "./DatabaseContextProvider";

const DatastoreProvisioningIndicator: React.FC = () => {
  const { datastore } = useDatastoreContext();

  const { percentCompleted, title, titleDescriptor, isCreating } =
    useMemo(() => {
      const creationSteps = datastore.template.creationStateProgression.map(
        (s) => s.state
      );
      const deletionSteps = datastore.template.deletionStateProgression.map(
        (s) => s.state
      );
      const isCreating =
        creationSteps.find((s) => s === datastore.status) != null;
      const steps = isCreating ? creationSteps : deletionSteps;
      const stateMatch = isCreating
        ? datastore.template.creationStateProgression.find(
            (s) => s.state === datastore.status
          )
        : datastore.template.deletionStateProgression.find(
            (s) => s.state === datastore.status
          );

      const stepsCompleted = steps.indexOf(datastore.status) + 1;
      const percentCompleted =
        stepsCompleted === -1 ? 0 : (stepsCompleted / steps.length) * 100.0;
      const title = `${datastore.template.type.displayName} ${
        isCreating ? "provisioning" : "deletion"
      } status`;

      const titleDescriptor = stateMatch
        ? `${stateMatch.displayName}...`
        : undefined;
      return { percentCompleted, title, titleDescriptor, isCreating };
    }, [datastore]);

  // TODO: refactor this so the template has the setup/deletion time
  const subtitle = useMemo(() => {
    return `${isCreating ? "Setup" : "Deletion"} can take up to ${
      datastore.template === DATASTORE_TEMPLATE_NEON ||
      datastore.template === DATASTORE_TEMPLATE_UPSTASH
        ? 5
        : 20
    } minutes. You can close this window and come back later.`;
  }, [datastore]);

  return (
    <StatusBar
      icon={datastore.template.icon}
      title={title}
      titleDescriptor={titleDescriptor}
      subtitle={subtitle}
      percentCompleted={percentCompleted}
    />
  );
};

export default DatastoreProvisioningIndicator;

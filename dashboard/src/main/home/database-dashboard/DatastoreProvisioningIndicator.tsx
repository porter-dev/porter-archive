import React, { useMemo } from "react";
import { match } from "ts-pattern";

import StatusBar from "components/porter/StatusBar";
import {
  DATABASE_TYPE_ELASTICACHE,
  DATABASE_TYPE_RDS,
} from "lib/databases/types";

import { useDatabaseContext } from "./DatabaseContextProvider";

const DatastoreProvisioningIndicator: React.FC = () => {
  const { datastore } = useDatabaseContext();

  const { percentCompleted, title, titleDescriptor } = useMemo(() => {
    const creationSteps = datastore.template.creationStateProgression.map(
      (s) => s.state
    );
    const stepsCompleted = creationSteps.indexOf(datastore.status) + 1;
    const percentCompleted =
      stepsCompleted === -1
        ? 0
        : (stepsCompleted / creationSteps.length) * 100.0;
    const title = match(datastore.template)
      .with({ type: DATABASE_TYPE_RDS }, () => "RDS provisioning status")
      .with(
        { type: DATABASE_TYPE_ELASTICACHE },
        () => "Elasticache provisioning status"
      )
      .exhaustive();
    const stateMatch = datastore.template.creationStateProgression.find(
      (s) => s.state === datastore.status
    );
    const titleDescriptor = stateMatch
      ? `${stateMatch.displayName}...`
      : undefined;
    return { percentCompleted, title, titleDescriptor };
  }, [datastore]);

  return (
    <StatusBar
      icon={datastore.template.icon}
      title={title}
      titleDescriptor={titleDescriptor}
      subtitle={
        "Setup can take up to 10 minutes. You can close this window and come back later."
      }
      percentCompleted={percentCompleted}
    />
  );
};

export default DatastoreProvisioningIndicator;

import React, { useContext } from "react";
import Loading from "legacy/components/Loading";
import { match } from "ts-pattern";

import { Context } from "shared/Context";

import DatastoreFormContextProvider from "../DatastoreFormContextProvider";
import DatastoreForm from "./DatastoreForm";
import SandboxDatastoreForm from "./SandboxDatastoreForm";

const CreateDatastore: React.FC = () => {
  const { currentProject } = useContext(Context);

  if (!currentProject) {
    return <Loading />;
  }
  return (
    <DatastoreFormContextProvider>
      {match(currentProject)
        .with({ sandbox_enabled: true }, () => <SandboxDatastoreForm />)
        .with({ sandbox_enabled: false }, () => <DatastoreForm />)
        .exhaustive()}
    </DatastoreFormContextProvider>
  );
};

export default CreateDatastore;
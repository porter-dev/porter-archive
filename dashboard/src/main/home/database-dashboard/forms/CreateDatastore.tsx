import React from "react";

import DatastoreFormContextProvider from "../DatastoreFormContextProvider";
import DatastoreForm from "./DatastoreForm";

const CreateDatastore: React.FC = () => {
  return (
    <DatastoreFormContextProvider>
      <DatastoreForm />
    </DatastoreFormContextProvider>
  );
};

export default CreateDatastore;

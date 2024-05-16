import React, { createContext, useContext, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useHistory } from "react-router";
import styled from "styled-components";

import Loading from "components/Loading";
import { Error as ErrorComponent } from "components/porter/Error";
import { dbFormValidator, type DbFormData } from "lib/databases/types";
import { getErrorMessageFromNetworkCall } from "lib/hooks/useCluster";
import { useDatastoreList } from "lib/hooks/useDatabaseList";
import { useDatastore } from "lib/hooks/useDatastore";
import { useIntercom } from "lib/hooks/useIntercom";
import { useNeon } from "lib/hooks/useNeon";
import { useUpstash } from "lib/hooks/useUpstash";

import { Context } from "shared/Context";

import {
  NeonIntegrationModal,
  UpstashIntegrationModal,
} from "./shared/NeonIntegrationModal";

// todo(ianedwards): refactor button to use more predictable state
export type UpdateDatastoreButtonProps = {
  status: "" | "loading" | JSX.Element | "success";
  isDisabled: boolean;
  loadingText?: string;
};

type DatastoreFormContextType = {
  updateDatastoreButtonProps: UpdateDatastoreButtonProps;
  projectId: number;
};

const DatastoreFormContext = createContext<DatastoreFormContextType | null>(
  null
);

export const useDatastoreFormContext = (): DatastoreFormContextType => {
  const ctx = React.useContext(DatastoreFormContext);
  if (!ctx) {
    throw new Error(
      "useDatastoreFormContext must be used within a DatastoreFormContextProvider"
    );
  }
  return ctx;
};

type DatastoreFormContextProviderProps = {
  children: JSX.Element;
};
const DatastoreFormContextProvider: React.FC<
  DatastoreFormContextProviderProps
> = ({ children }) => {
  const { currentProject } = useContext(Context);

  const [updateDatastoreError, setUpdateDatastoreError] = useState<string>("");
  const { getNeonIntegrations } = useNeon();
  const { getUpstashIntegrations } = useUpstash();
  const [showNeonIntegrationModal, setShowNeonIntegrationModal] =
    useState(false);
  const [showUpstashIntegrationModal, setShowUpstashIntegrationModal] =
    useState(false);

  const { showIntercomWithMessage } = useIntercom();

  const { datastores: existingDatastores } = useDatastoreList();
  const { create: createDatastore } = useDatastore();
  const history = useHistory();

  const datastoreForm = useForm<DbFormData>({
    resolver: zodResolver(dbFormValidator),
    reValidateMode: "onSubmit",
  });
  const {
    handleSubmit,
    formState: { isSubmitting, errors },
  } = datastoreForm;

  const updateDatastoreButtonProps = useMemo(() => {
    const props: UpdateDatastoreButtonProps = {
      status: "",
      isDisabled: false,
      loadingText: "",
    };
    if (isSubmitting) {
      props.status = "loading";
      props.isDisabled = true;
      props.loadingText = "Creating datastore...";
    }

    if (updateDatastoreError) {
      props.status = (
        <ErrorComponent message={updateDatastoreError} maxWidth="600px" />
      );
    }
    if (Object.keys(errors).length > 0) {
      // TODO: remove this and properly handle form validation errors
      console.log("errors", errors);
    }

    return props;
  }, [isSubmitting, updateDatastoreError, errors]);

  const onSubmit = handleSubmit(async (data) => {
    if (!currentProject) {
      return;
    }
    setUpdateDatastoreError("");
    if (existingDatastores.some((db) => db.name === data.name)) {
      setUpdateDatastoreError(
        "A datastore with this name already exists. Please choose a different name."
      );
      return;
    }
    try {
      if (data.config.type === "neon") {
        const integrations = await getNeonIntegrations({
          projectId: currentProject.id,
        });
        if (integrations.length === 0) {
          setShowNeonIntegrationModal(true);
          return;
        }
      }
      if (data.config.type === "upstash") {
        const integrations = await getUpstashIntegrations({
          projectId: currentProject.id,
        });
        if (integrations.length === 0) {
          setShowUpstashIntegrationModal(true);
          return;
        }
      }

      await createDatastore(data);
      history.push(`/datastores/${data.name}`);
    } catch (err) {
      const errorMessage = getErrorMessageFromNetworkCall(
        err,
        "Datastore creation"
      );
      setUpdateDatastoreError(errorMessage);
      showIntercomWithMessage({
        message: "I am having trouble creating a datastore.",
      });
    }
  });

  if (!currentProject) {
    return <Loading />;
  }

  return (
    <DatastoreFormContext.Provider
      value={{
        updateDatastoreButtonProps,
        projectId: currentProject.id,
      }}
    >
      <Wrapper>
        <FormProvider {...datastoreForm}>
          <form onSubmit={onSubmit}>{children}</form>
        </FormProvider>
      </Wrapper>
      {showNeonIntegrationModal && (
        <NeonIntegrationModal
          onClose={() => {
            setShowNeonIntegrationModal(false);
          }}
        />
      )}
      {showUpstashIntegrationModal && (
        <UpstashIntegrationModal
          onClose={() => {
            setShowUpstashIntegrationModal(false);
          }}
        />
      )}
    </DatastoreFormContext.Provider>
  );
};

export default DatastoreFormContextProvider;

const Wrapper = styled.div`
  height: fit-content;
  margin-bottom: 10px;
  width: 100%;
`;

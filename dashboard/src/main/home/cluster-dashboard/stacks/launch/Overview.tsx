import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { StacksLaunchContext } from "./Store";
import InputRow from "components/form-components/InputRow";
import Selector from "components/Selector";
import api from "shared/api";
import { Context } from "shared/Context";
import useAuth from "shared/auth/useAuth";
import { useRouting } from "shared/routing";
import { CardGrid, SubmitButton } from "./components/styles";
import { AppCard } from "./components/AppCard";
import { AddResourceButton } from "./components/AddResourceButton";

const Overview = () => {
  const {
    newStack,
    namespace,
    setStackName,
    setStackNamespace,
    submit,
  } = useContext(StacksLaunchContext);
  const { currentProject, currentCluster } = useContext(Context);
  const [isAuthorized] = useAuth();

  const [namespaceOptions, setNamespaceOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [submitButtonStatus, setSubmitButtonStatus] = useState("");

  const { pushFiltered } = useRouting();

  const updateNamespaces = (cluster_id: number) => {
    api
      .getNamespaces(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id,
        }
      )
      .then((res) => {
        if (res.data) {
          const availableNamespaces = res.data.items.filter(
            (namespace: any) => {
              return namespace.status.phase !== "Terminating";
            }
          );
          const namespaceOptions = availableNamespaces.map(
            (x: { metadata: { name: string } }) => {
              return { label: x.metadata.name, value: x.metadata.name };
            }
          );
          if (availableNamespaces.length > 0) {
            setNamespaceOptions(namespaceOptions);
          }
        }
      })
      .catch(console.log);
  };

  const handleSubmit = () => {
    setSubmitButtonStatus("loading");

    submit().then(() => {
      console.log("submit");
      setTimeout(() => {
        setSubmitButtonStatus("");
        pushFiltered("/stacks", []);
      }, 1000);
    });
  };

  useEffect(() => {
    updateNamespaces(currentCluster.id);
  }, [currentCluster]);

  const isValid = useMemo(() => {
    if (namespace === "") {
      return false;
    }

    if (newStack.name === "") {
      return false;
    }

    if (newStack.source_configs.length === 0) {
      return false;
    }

    if (newStack.app_resources.length === 0) {
      return false;
    }

    return true;
  }, [namespace, newStack.name]);

  return (
    <div style={{ position: "relative" }}>
      <InputRow
        type="string"
        value={newStack.name}
        setValue={(newName: string) => setStackName(newName)}
      />

      <Selector
        key={"namespace"}
        refreshOptions={() => {
          updateNamespaces(currentCluster.id);
        }}
        addButton={isAuthorized("namespace", "", ["get", "create"])}
        activeValue={namespace}
        setActiveValue={(val) => setStackNamespace(val)}
        options={namespaceOptions}
        width="250px"
        dropdownWidth="335px"
        closeOverlay={true}
      />

      <br />
      <CardGrid>
        {newStack.app_resources.map((app) => (
          <AppCard key={app.name} app={app} />
        ))}

        <AddResourceButton />
      </CardGrid>

      <SubmitButton
        disabled={!isValid || submitButtonStatus !== ""}
        text="Create Stack"
        onClick={handleSubmit}
        clearPosition
        statusPosition="left"
        status={submitButtonStatus}
      >
        Create stack
      </SubmitButton>
    </div>
  );
};

export default Overview;

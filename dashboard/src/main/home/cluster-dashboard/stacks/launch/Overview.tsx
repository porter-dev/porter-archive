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
import styled from "styled-components";

import Helper from "components/form-components/Helper";
import Heading from "components/form-components/Heading";
import TitleSection from "components/TitleSection";

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
          const availableNamespaces = res.data.filter((namespace: any) => {
            return namespace.status !== "Terminating";
          });
          const namespaceOptions = availableNamespaces.map(
            (x: { name: string }) => {
              return { label: x.name, value: x.name };
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
    <StyledLaunchFlow style={{ position: "relative" }}>
      <TitleSection handleNavBack={() => window.open("/stacks", "_self")}>
        <Polymer>
          <i className="material-icons">lan</i>
        </Polymer>
        New Application Stack
      </TitleSection>

      <Heading>Stack Name</Heading>
      <Helper>
        Give this application stack a unique name:
        <Required>*</Required>
      </Helper>
      <InputRow
        type="string"
        placeholder="ex: perspective-vortices"
        width="470px"
        value={newStack.name}
        setValue={(newName: string) => setStackName(newName)}
      />

      <Heading>Destination</Heading>
      <Helper>
        Specify the namespace you would like to deploy this stack to.
      </Helper>
      <ClusterSection>
        <NamespaceLabel>
          <i className="material-icons">view_list</i> Namespace
        </NamespaceLabel>
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
      </ClusterSection>

      <Heading>Applications</Heading>
      <Helper>
        At least one application is required:
        <Required>*</Required>
      </Helper>
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
        Create Stack
      </SubmitButton>
    </StyledLaunchFlow>
  );
};

export default Overview;

const NamespaceLabel = styled.div`
  margin-right: 10px;
  display: flex;
  align-items: center;
  > i {
    font-size: 16px;
    margin-right: 6px;
  }
`;

const ClusterSection = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff;
  font-family: "Work Sans", sans-serif;
  font-size: 14px;
  margin-top: 20px;
  font-weight: 500;
  margin-bottom: 32px;

  > i {
    font-size: 25px;
    color: #ffffff44;
    margin-right: 13px;
  }
`;

const Br = styled.div<{ height?: string }>`
  width: 100%;
  height: ${(props) => props.height || "1px"};
`;

const Required = styled.div`
  margin-left: 8px;
  color: #fc4976;
  display: inline-block;
`;

const Polymer = styled.div`
  margin-bottom: -6px;

  > i {
    color: #ffffff;
    font-size: 24px;
    margin-left: 5px;
    margin-right: 18px;
  }
`;

const StyledLaunchFlow = styled.div`
  min-width: 300px;
  width: calc(100% - 100px);
  margin-left: 50px;
  margin-top: ${(props: { disableMarginTop?: boolean }) =>
    props.disableMarginTop ? "inherit" : "calc(50vh - 380px)"};
  padding-bottom: 150px;
`;

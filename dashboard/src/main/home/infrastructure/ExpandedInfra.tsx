import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import { Context } from "shared/Context";
import api from "shared/api";
import { integrationList } from "shared/common";
import yaml from "js-yaml";

import DeployList from "./components/DeployList";
import InfraResourceList from "./components/InfraResourceList";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import { readableDate } from "shared/string_utils";
import Placeholder from "components/Placeholder";
import Header from "components/expanded-object/Header";
import { Infrastructure, KindMap } from "shared/types";
import { useWebsockets } from "shared/hooks/useWebsockets";

type Props = {
  infra_id: number;
};

type InfraTabOptions = "deploys" | "resources" | "settings";

const ExpandedInfra: React.FunctionComponent<Props> = ({ infra_id }) => {
  const [infra, setInfra] = useState<Infrastructure>(null);
  const [hasError, setHasError] = useState(false);

  const { currentProject, setCurrentError } = useContext(Context);

  const {
    newWebsocket,
    openWebsocket,
    closeWebsocket,
    closeAllWebsockets,
  } = useWebsockets();

  const setupOperationWebsocket = (websocketID: string) => {
    let apiPath = `/api/projects/${currentProject.id}/infras/${infra.id}/operations/${infra.latest_operation.id}/state`;

    const wsConfig = {
      onopen: () => {
        console.log(`connected to websocket:`, websocketID);
      },
      onmessage: (evt: MessageEvent) => {
        console.log(evt);
      },

      onclose: () => {
        console.log(`closing websocket:`, websocketID);
      },

      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(websocketID);
      },
    };

    newWebsocket(websocketID, apiPath, wsConfig);
    openWebsocket(websocketID);
  };

  useEffect(() => {
    if (!currentProject) {
      return;
    }

    let isSubscribed = true;

    api
      .getInfraByID(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra_id,
        }
      )
      .then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        setInfra(data);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
      });
  }, [currentProject, infra_id]);

  useEffect(() => {
    if (!currentProject || !infra || !infra.latest_operation) {
      return;
    }

    const websocketID = infra.latest_operation.id;

    setupOperationWebsocket(websocketID);

    return () => {
      closeWebsocket(websocketID);
    };
  }, [currentProject, infra]);

  if (hasError) {
    return <Placeholder>Error loading infra</Placeholder>;
  }

  if (!infra) {
    return <Loading />;
  }

  const renderTabContents = (newTab: InfraTabOptions) => {
    switch (newTab) {
      case "deploys":
        return <DeployList infra_id={infra_id} />;
      case "resources":
        return <InfraResourceList infra_id={infra_id} />;
      case "settings":
        return <div>Settings</div>;
    }
  };

  const formData = yaml.load(initYaml);

  return (
    <StyledExpandedInfra>
      <Header
        last_updated={readableDate(infra.latest_operation?.last_updated)}
        back_link={"/infrastructure"}
        name={integrationList[infra.kind].label}
        icon={integrationList[infra.kind].icon}
        inline_title_items={[
          <ResourceLink
            to={KindMap[infra.kind].resource_link}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
          >
            {KindMap[infra.kind].resource_name}
            <i className="material-icons">open_in_new</i>
          </ResourceLink>,
        ]}
      />
      <PorterFormWrapper
        showStateDebugger={false}
        formData={formData}
        valuesToOverride={{}}
        isReadOnly={false}
        onSubmit={(vars) => {
          console.log(vars);
        }}
        leftTabOptions={[
          {
            value: "deploys",
            label: "Deploys",
          },
          {
            value: "resources",
            label: "Resources",
          },
        ]}
        rightTabOptions={[
          {
            value: "settings",
            label: "Settings",
          },
        ]}
        renderTabContents={renderTabContents}
        saveButtonText={"Test Submit"}
      />
    </StyledExpandedInfra>
  );
};

export default ExpandedInfra;

const StyledExpandedInfra = styled.div`
  width: 100%;
  z-index: 0;
  animation: fadeIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  display: flex;
  flex-direction: column;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ResourceLink = styled(DynamicLink)`
  font-size: 13px;
  font-weight: 400;
  margin-left: 20px;
  color: #aaaabb;
  display: flex;
  align-items: center;

  :hover {
    text-decoration: underline;
    color: white;
  }

  > i {
    margin-left: 7px;
    font-size: 17px;
  }
`;

const initYaml = `name: Web
hasSource: true
includeHiddenFields: true
tabs:
- name: main
  label: Configuration
  sections:
  - name: section_one
    contents: 
    - type: heading
      label: String to echo
    - type: string-input
      variable: echo
      value: 
      - "hello"
`;

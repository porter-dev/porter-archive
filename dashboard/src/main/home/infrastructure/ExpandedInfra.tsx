import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import { Context } from "shared/Context";
import api from "shared/api";
import { integrationList } from "shared/common";

import DeployList from "./components/DeployList";
import InfraResourceList from "./components/InfraResourceList";
import PorterFormWrapper from "components/porter-form/PorterFormWrapper";
import { readableDate } from "shared/string_utils";
import Placeholder from "components/OldPlaceholder";
import Header from "components/expanded-object/Header";
import { Infrastructure, KindMap, Operation } from "shared/types";
import InfraSettings from "./components/InfraSettings";
import { useParams } from "react-router";

type InfraTabOptions = "deploys" | "resources" | "settings";

type ExpandedInfraParams = {
  infra_id_str: string;
};

const ExpandedInfra: React.FunctionComponent = () => {
  const { infra_id_str } = useParams<ExpandedInfraParams>();
  const infra_id = parseInt(infra_id_str);
  const [infra, setInfra] = useState<Infrastructure>(null);
  const [infraForm, setInfraForm] = useState<any>(null);
  const [saveValuesStatus, setSaveValueStatus] = useState<string>(null);
  const [hasError, setHasError] = useState(false);

  const { currentProject, setCurrentError } = useContext(Context);

  useEffect(() => {
    if (!currentProject) {
      return;
    }

    refreshInfra();
  }, [currentProject, infra_id]);

  const refreshInfra = () => {
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
        setInfra(data);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
      });
  };

  useEffect(() => {
    if (!currentProject || !infra) {
      return;
    }

    api
      .getOperation(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra_id,
          operation_id: infra.latest_operation.id,
        }
      )
      .then(({ data }) => {
        setInfraForm(data.form);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
      });
  }, [currentProject, infra, infra?.latest_operation?.id]);

  const update = (values: any, cb: () => void) => {
    setSaveValueStatus("loading");

    api
      .updateInfra(
        "<token>",
        {
          values: values,
        },
        {
          project_id: currentProject.id,
          infra_id: infra.id,
        }
      )
      .then(({ data }) => {
        // the resulting data is now the latest operation
        let newInfra = infra;
        newInfra.latest_operation = data;
        setInfra(newInfra);
        setSaveValueStatus("successful");
        cb();
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const setLatestOperation = (operation: Operation) => {
    let newInfra = infra;
    newInfra.latest_operation = operation;
    setInfra(newInfra);
  };

  if (hasError) {
    return <Placeholder>Error loading infra</Placeholder>;
  }

  if (!infra || !infraForm) {
    return <Loading />;
  }

  const renderTabContents = (newTab: InfraTabOptions) => {
    switch (newTab) {
      case "deploys":
        return (
          <DeployList
            infra={infra}
            setLatestOperation={setLatestOperation}
            refreshInfra={refreshInfra}
          />
        );
      case "resources":
        return <InfraResourceList infra_id={infra_id} />;
      case "settings":
        return <InfraSettings infra_id={infra_id} onDelete={refreshInfra} />;
    }
  };

  return (
    <StyledExpandedInfra>
      <Header
        last_updated={readableDate(infra.latest_operation?.last_updated)}
        back_link={"/infrastructure"}
        name={integrationList[infra.kind]?.label}
        icon={integrationList[infra.kind]?.icon}
        inline_title_items={[
          <ResourceLink
            key="resource_link"
            to={KindMap[infra.kind].resource_link}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
          >
            {KindMap[infra.kind].resource_name}
            <i className="material-icons">open_in_new</i>
          </ResourceLink>,
        ]}
      />
      <PorterFormContainer>
        <PorterFormWrapper
          showStateDebugger={false}
          formData={infraForm}
          valuesToOverride={{}}
          isReadOnly={false}
          onSubmit={update}
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
          isInModal={false}
          hideBottomSpacer={false}
          saveButtonText={"Update"}
          saveValuesStatus={saveValuesStatus}
          redirectTabAfterSave={"deploys"}
        />
      </PorterFormContainer>
    </StyledExpandedInfra>
  );
};

export default ExpandedInfra;

const PorterFormContainer = styled.div`
  position: relative;
  min-width: 300px;
`;

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

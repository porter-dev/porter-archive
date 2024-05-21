import React, { Component, useContext, useEffect } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import ResourceTab from "./ResourceTab";
import SaveButton from "./SaveButton";
import { baseApi } from "shared/baseApi";
import { readableDate } from "shared/string_utils";

type Props = {
  resource: any;
  button: any;
  handleClick?: () => void;
  selected?: boolean;
  isLast?: boolean;
  roundAllCorners?: boolean;
};

const ExpandableResource: React.FC<Props> = (props) => {
  const { resource, button } = props;
  const { currentCluster, currentProject } = useContext(Context);

  const onSave = () => {
    let projID = currentProject.id;
    let clusterID = currentCluster.id;
    let config = button.actions[0].delete.context.config;

    // TODO: construct the endpoint scope, right now we're just using release scope
    let uri = `/api/projects/${projID}/clusters/${clusterID}/namespaces/${resource.metadata.namespace}${button.actions[0].delete.relative_uri}`;

    // compute the endpoint using button and target context
    baseApi<
      {
        name: string;
        namespace: string;
        group: string;
        version: string;
        resource: string;
      },
      {}
    >("DELETE", uri)(
      "<token>",
      {
        name: resource.metadata.name,
        namespace: resource.metadata.namespace,
        group: config.group,
        version: config.version,
        resource: config.resource,
      },
      {}
    )
      .then((res) => {})
      .catch((err) => console.log(err));
  };

  return (
    <ResourceTab
      label={resource.label}
      name={resource.name}
      status={{ label: resource.status }}
    >
      <ExpandedWrapper>
        <StatusSection>
          <StatusHeader>
            <Status>
              <Key>Status:</Key> {resource.status}
            </Status>
            <Timestamp>Updated {readableDate(resource.timestamp)}</Timestamp>
          </StatusHeader>
          {resource.message}
        </StatusSection>
        {Object.keys(resource.data).map((key: string, i: number) => {
          return (
            <Pair key={i}>
              <Key>{key}:</Key>
              {resource.data[key]}
            </Pair>
          );
        })}
        {button && (
          <StyledSaveButton
            onClick={onSave}
            clearPosition={true}
            text={button.name}
            helper={button.description}
            statusPosition={"right"}
            className="expanded-save-button"
          />
        )}
      </ExpandedWrapper>
    </ResourceTab>
  );
};

export default ExpandableResource;

const Timestamp = styled.div`
  font-size: 12px;
  color: #ffffff44;
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const Status = styled.div`
  display: flex;
  align-items: center;
  color: #aaaabb;
`;

const StatusSection = styled.div`
  border-radius: 8px;
  background: #ffffff11;
  font-size: 13px;
  padding: 20px 20px 25px;
`;

const ExpandedWrapper = styled.div`
  padding: 20px 20px 25px;
`;

const Pair = styled.div`
  margin-top: 20px;
  font-size: 13px;
  padding: 0 5px;
  color: #aaaabb;
  display: flex;
  align-items: center;
`;

const Key = styled.div`
  font-weight: bold;
  color: #ffffff;
  margin-right: 8px;
`;

const StyledSaveButton = styled(SaveButton)`
  margin-top: 20px;
`;

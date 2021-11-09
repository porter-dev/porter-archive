import React, { useEffect, useContext } from "react";
import { ResourceListField } from "../types";
import { Context } from "shared/Context";
import { useWebsockets } from "shared/hooks/useWebsockets";
import ExpandableResource from "../../ExpandableResource";
import styled from "styled-components";

const ResourceList: React.FC<ResourceListField> = (props) => {
  const { currentCluster, currentProject } = useContext(Context);

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    closeWebsocket,
  } = useWebsockets();

  useEffect(() => {
    let apiEndpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/cert-manager/releases/cert-manager/0/form_stream?`;
    apiEndpoint += "resource=certificates&group=cert-manager.io&version=v1";

    const wsConfig = {
      onmessage(evt: MessageEvent) {
        console.log("EVENT IS", evt);
      },
      onerror() {
        closeWebsocket("testing");
      },
    };

    newWebsocket("testing", apiEndpoint, wsConfig);
    openWebsocket("testing");

    return () => {
      closeAllWebsockets();
    };
  }, []);

  return (
    <ResourceListWrapper>
      {props.value?.map((resource: any, i: number) => {
        if (resource.data) {
          return (
            <ExpandableResource
              key={i}
              button={props?.settings?.options["resource-button"]}
              resource={resource}
              isLast={i === props.value.length - 1}
              roundAllCorners={true}
            />
          );
        }
      })}
    </ResourceListWrapper>
  );
};

export default ResourceList;

const ResourceListWrapper = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
`;

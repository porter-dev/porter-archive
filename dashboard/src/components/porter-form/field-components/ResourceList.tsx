import React, { useEffect, useContext, useState } from "react";
import { ResourceListField } from "../types";
import { Context } from "shared/Context";
import { useWebsockets } from "shared/hooks/useWebsockets";
import ExpandableResource from "../../ExpandableResource";
import { PorterFormContext } from "components/porter-form/PorterFormContextProvider";
import styled from "styled-components";

const ResourceList: React.FC<ResourceListField> = (props) => {
  const { currentCluster, currentProject } = useContext(Context);
  const { formState } = useContext(PorterFormContext);
  const [resourceList, updateResourceList] = useState<any[]>(props.value);

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    closeWebsocket,
  } = useWebsockets();

  const sortAndUpdateResources = (list: any[]) => {
    list.sort((a, b) => {
      return b.timestamp.localeCompare(a.timestamp);
    });

    updateResourceList(list);
  };

  useEffect(() => {
    if (
      !formState?.variables?.currentChart?.name ||
      !formState?.variables?.namespace
    ) {
      return () => {};
    }

    let { group, version, resource } = props.context.config;
    let apiEndpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/namespaces/${formState?.variables?.namespace}/releases/${formState?.variables?.currentChart?.name}/0/form_stream?`;
    apiEndpoint += `resource=${resource}&group=${group}&version=${version}`;

    const wsConfig = {
      onmessage(evt: MessageEvent) {
        let { data, kind } = JSON.parse(evt.data);

        // parse for name and label, which uniquely identify a resource
        for (let [key] of Object.entries(data)) {
          // check the name and label in the value
          let { name, label } = data[key][0];

          // attempt to find a corresponding name and label in the current array
          let foundMatch = false;

          resourceList.forEach((resource, index) => {
            if (resource.name == name && resource.label == label) {
              foundMatch = true;

              switch (kind) {
                case "update":
                case "create":
                  // replace this resource in the list
                  resourceList[index] = data[key][0];
                  break;
                case "delete":
                  // remove this resource from the list
                  resourceList.splice(index, 1);
                  break;
                default:
              }
            }
          });

          if (!foundMatch && kind != "delete") {
            // add this resource to the list
            resourceList.push(data[key][0]);
          }
        }

        sortAndUpdateResources([...resourceList]);
      },
      onerror() {
        closeWebsocket("stream");
      },
    };

    newWebsocket("stream", apiEndpoint, wsConfig);
    openWebsocket("stream");

    return () => {
      closeAllWebsockets();
    };
  }, [formState?.variables?.currentChart, formState?.variables?.namespace]);

  return (
    <ResourceListWrapper>
      {resourceList?.map((resource: any, i: number) => {
        if (resource.data) {
          return (
            <ExpandableResource
              key={i}
              button={
                props?.settings?.options &&
                props?.settings?.options["resource-button"]
              }
              resource={resource}
              isLast={i === resourceList.length - 1}
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

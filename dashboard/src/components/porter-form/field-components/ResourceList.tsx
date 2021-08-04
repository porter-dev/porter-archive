import React from "react";
import { ResourceListField } from "../types";
import ExpandableResource from "../../ExpandableResource";
import styled from "styled-components";

const ResourceList: React.FC<ResourceListField> = (props) => {
  return (
    <ResourceListWrapper>
      {props.value?.map((resource: any, i: number) => {
        if (resource.data) {
          return (
            <ExpandableResource
              key={i}
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
  border-radius: 5px;
  overflow: hidden;
`;

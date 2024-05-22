import React from "react";
import styled from "styled-components";

import { type ServiceIPListField } from "../types";
import ServiceRow from "./ServiceRow";

const ServiceIPList: React.FC<ServiceIPListField> = (props) => {
  return (
    <ResourceList>
      {props.value?.map((service: any, i: number) => {
        return <ServiceRow service={service} key={i} />;
      })}
    </ResourceList>
  );
};

export default ServiceIPList;

const ResourceList = styled.div`
  margin-bottom: 15px;
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
`;

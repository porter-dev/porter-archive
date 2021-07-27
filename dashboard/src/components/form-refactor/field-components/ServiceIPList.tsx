import React from "react";
import { ServiceIPListField } from "../types";
import ServiceRow from "../../values-form/ServiceRow";
import styled from "styled-components";

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
  border-radius: 5px;
  overflow: hidden;
`;

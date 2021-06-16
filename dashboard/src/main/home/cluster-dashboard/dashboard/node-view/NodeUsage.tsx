import React from "react";
import styled from "styled-components";

type NodeUsageProps = {
  node: any;
};

const NodeUsage: React.FunctionComponent<NodeUsageProps> = ({ node }) => {
  return (
    <Wrapper>
      <span>
        <Bolded>Cpu Usage:</Bolded> {node?.cpu_reqs || "Loading..."}
      </span>
      <span>
        <Bolded>Memory Usage:</Bolded> {node?.memory_reqs || "Loading..."}
      </span>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  margin: 16px 0px;
  font-size: 14px;
  flex-direction: column;
  line-height: 24px;
`;

const Bolded = styled.span`
  font-weight: 500;
  color: #ffffff44;
  margin-right: 6px;
`;

export default NodeUsage;

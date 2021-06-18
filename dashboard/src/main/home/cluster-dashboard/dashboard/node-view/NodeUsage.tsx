import React from "react";
import styled from "styled-components";

type NodeUsageProps = {
  node: any;
};

const NodeUsage: React.FunctionComponent<NodeUsageProps> = ({ node }) => {
  const percentFormatter = (number: number) => `${Number(number).toFixed(2)}%`;

  return (
    <NodeUsageWrapper>
      <Help
        href="https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#meaning-of-cpu"
        target="_blank"
      >
        <span>How to read memory and cpu units</span>
        <i className="material-icons">help_outline</i>
      </Help>
      <Wrapper>
        <UsageWrapper>
          <span>
            <Bolded>Cpu Requested:</Bolded> {node?.cpu_reqs || "Loading..."}
          </span>
          <span>
            <Bolded>Memory Requested:</Bolded>{" "}
            {node?.memory_reqs || "Loading..."}
          </span>
        </UsageWrapper>
        <AllocatableWrapper>
          <span>
            <Bolded>Cpu Allocatable:</Bolded>
            {node?.allocatable_cpu || "Loading..."}
          </span>
          <span>
            <Bolded>Memory Allocatable:</Bolded>
            {node?.allocatable_memory || "Loading..."}
          </span>
        </AllocatableWrapper>
        <FractionUsageWrapper>
          <span>
            <Bolded>Cpu Usage:</Bolded>
            {node?.fraction_cpu_reqs
              ? percentFormatter(node?.fraction_cpu_reqs)
              : "Loading..."}
          </span>
          <span>
            <Bolded>Memory Usage:</Bolded>
            {node?.fraction_memory_reqs
              ? percentFormatter(node?.fraction_memory_reqs)
              : "Loading..."}
          </span>
        </FractionUsageWrapper>
      </Wrapper>
    </NodeUsageWrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
`;

const UsageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  font-size: 14px;
  line-height: 24px;
  :not(last-child) {
    margin-right: 20px;
  }
`;

const AllocatableWrapper = styled(UsageWrapper)``;

const FractionUsageWrapper = styled(UsageWrapper)``;

const Bolded = styled.span`
  font-weight: 500;
  color: #ffffff44;
  margin-right: 6px;
`;

const Help = styled.a`
  display: flex;
  align-items: center;
  font-size: 13px;
  margin-bottom: 5px;
  width: fit-content;
  :hover {
    color: #ffffff;
  }

  > i {
    margin-left: 5px;
    font-size: 16px;
  }
`;

const NodeUsageWrapper = styled.div`
  margin: 16px 0px;
`;

export default NodeUsage;

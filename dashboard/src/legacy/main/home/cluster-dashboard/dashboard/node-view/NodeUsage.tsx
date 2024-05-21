import React from "react";
import styled from "styled-components";

type NodeUsageProps = {
  node: any;
};

const NodeUsage: React.FunctionComponent<NodeUsageProps> = ({ node }) => {
  const percentFormatter = (number: number) => `${Number(number).toFixed(2)}%`;

  const formatMemoryUnitToMi = (memory: string) => {
    if (memory.includes("Mi")) {
      return memory;
    }

    if (memory.includes("Gi")) {
      const [value] = memory.split("Gi");
      const numValue = Number(value);
      const giToMiValue = numValue * 1024;
      return `${giToMiValue.toFixed()}Mi`;
    }

    if (memory.includes("Ki")) {
      const [value] = memory.split("Ki");
      const numValue = Number(value);
      const kiToMiValue = numValue / 1024;
      return `${kiToMiValue.toFixed()}Mi`;
    }

    const value = memory.replace(/[^0-9]/g, "");
    const numValue = Number(value);
    const unknownToMiValue = numValue * 1024 * 1024;
    return `${unknownToMiValue.toFixed()}Mi`;
  };

  return (
    <NodeUsageWrapper>
      <Wrapper>
        <UsageWrapper>
          <span>
            <Bolded>CPU:</Bolded>{" "}
            {!node?.cpu_reqs && !node?.allocatable_cpu
              ? "Loading..."
              : `${percentFormatter(node?.fraction_cpu_reqs)} (${
                  node?.cpu_reqs
                }/${node?.allocatable_cpu}m)`}
          </span>
          <Buffer />
          <span>
            <Bolded>RAM:</Bolded>{" "}
            {!node?.memory_reqs && !node?.allocatable_memory
              ? "Loading..."
              : `${percentFormatter(
                  node?.fraction_memory_reqs
                )} (${formatMemoryUnitToMi(
                  node?.memory_reqs
                )}/${formatMemoryUnitToMi(node?.allocatable_memory)})`}
          </span>
          <I
            onClick={() =>
              window.open(
                "https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/#node-allocatable"
              )
            }
            className="material-icons"
          >
            help_outline
          </I>
        </UsageWrapper>
      </Wrapper>
    </NodeUsageWrapper>
  );
};

const I = styled.i`
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 17px;
  margin-left: 12px;
  color: #858faaaa;
  :hover {
    color: #aaaabb;
  }
`;

const Buffer = styled.div`
  width: 17px;
  height: 20px;
`;

const Wrapper = styled.div`
  display: flex;
`;

const UsageWrapper = styled.div`
  display: flex;
  flex-direction: row;
  font-size: 14px;
  color: #aaaabb;
  line-height: 24px;
  user-select: text;
  :not(last-child) {
    margin-right: 20px;
  }
`;

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
  margin: 14px 0px 10px;
`;

export default NodeUsage;

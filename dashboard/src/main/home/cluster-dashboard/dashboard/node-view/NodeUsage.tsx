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
      return `${giToMiValue}Mi`;
    }

    if (memory.includes("Ki")) {
      const [value] = memory.split("Ki");
      const numValue = Number(value);
      const kiToMiValue = numValue / 1024;
      return `${kiToMiValue}Mi`;
    }

    const value = memory.replace(/[^0-9]/g, "");
    const numValue = Number(value);
    const unknownToMiValue = numValue * 1024 * 1024;
    return `${unknownToMiValue}Mi`;
  };

  return (
    <NodeUsageWrapper>
      <Help
        href="https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#meaning-of-cpu"
        target="_blank"
      >
        <span>How to read memory and cpu units</span>
        <i className="material-icons">help_outline</i>
      </Help>

      <Help
        href="https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/#node-allocatable"
        target="_blank"
      >
        <span>
          The memory value corresponds to the allocatable total on node, for
          more info click here
        </span>
        <i className="material-icons">help_outline</i>
      </Help>
      <Wrapper>
        <UsageWrapper>
          <span>
            <Bolded>CPU:</Bolded>{" "}
            {!node?.cpu_reqs && !node?.allocatable_cpu
              ? "Loading..."
              : `${node?.cpu_reqs} / ${
                  node?.allocatable_cpu
                }m - ${percentFormatter(node?.fraction_cpu_reqs)}`}
          </span>
          <span>
            <Bolded>RAM:</Bolded>{" "}
            {!node?.memory_reqs && !node?.allocatable_memory
              ? "Loading..."
              : `${formatMemoryUnitToMi(
                  node?.memory_reqs
                )} / ${formatMemoryUnitToMi(
                  node?.allocatable_memory
                )} - ${percentFormatter(node?.fraction_memory_reqs)}`}
          </span>
        </UsageWrapper>
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
  margin: 16px 0px;
`;

export default NodeUsage;

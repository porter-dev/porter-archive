import React, { useMemo } from "react";
import pluralize from "pluralize";
import styled from "styled-components";

import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import Tooltip from "components/porter/Tooltip";
import {
  statusColor,
  type ServiceStatusDescriptor,
} from "lib/hooks/useAppStatus";

import { Status, StatusColor } from "./ServiceStatus";

type StatusType = {
  status: ServiceStatusDescriptor;
};

type Props<T extends StatusType[]> = {
  statusList: T;
};
const StatusTags: React.FC<Props<StatusType[]>> = ({ statusList }) => {
  const statusSummary = useMemo(() => {
    return [
      statusList.filter((i) => i.status === "running").length,
      statusList.filter((i) => i.status === "pending").length,
      statusList.filter((i) => i.status === "failing").length,
    ];
  }, [JSON.stringify(statusList)]);

  return (
    <Status>
      <Tooltip
        content={
          <div>
            {`${statusSummary[0]} ${pluralize(
              "instance",
              statusSummary[0]
            )} ${pluralize("is", statusSummary[0])} currently running`}
          </div>
        }
        backgroundColor=""
      >
        <Tag
          hoverable={false}
          backgroundColor={
            statusSummary[0] ? statusColor("running") : undefined
          }
        >
          <InnerTag>
            <Text color={statusSummary[0] ? "white" : "helper"}>
              {statusSummary[0]}
            </Text>
            <StatusColor color={statusSummary[0] ? "white" : "#ffffff22"} />
          </InnerTag>
        </Tag>
      </Tooltip>
      <Spacer inline x={0.5} />
      <Tooltip
        content={
          <div>{`${statusSummary[1]} ${pluralize(
            "instance",
            statusSummary[1]
          )} ${pluralize("is", statusSummary[1])} currently pending`}</div>
        }
        backgroundColor=""
      >
        <Tag
          hoverable={false}
          backgroundColor={
            statusSummary[1] ? statusColor("pending") : undefined
          }
        >
          <InnerTag>
            <Text color={statusSummary[1] ? "white" : "helper"}>
              {statusSummary[1]}
            </Text>
            <StatusColor color={statusSummary[1] ? "white" : "#ffffff22"} />
          </InnerTag>
        </Tag>
      </Tooltip>
      <Spacer inline x={0.5} />
      <Tooltip
        content={
          <div>{`${statusSummary[2]} ${pluralize(
            "instance",
            statusSummary[2]
          )} ${pluralize("is", statusSummary[2])} currently failing`}</div>
        }
        backgroundColor=""
      >
        <Tag
          hoverable={false}
          backgroundColor={
            statusSummary[2] ? statusColor("failing") : undefined
          }
        >
          <InnerTag>
            <Text color={statusSummary[2] ? "white" : "helper"}>
              {statusSummary[2]}
            </Text>
            <StatusColor color={statusSummary[2] ? "white" : "#ffffff22"} />
          </InnerTag>
        </Tag>
      </Tooltip>
    </Status>
  );
};

export default StatusTags;

const InnerTag = styled.div`
  display: flex;
  align-items: center;
  width: 25px;
`;

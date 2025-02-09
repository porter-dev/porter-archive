import React from "react";
import last_run from "legacy/assets/last-run.svg";
import RadioFilter from "legacy/components/RadioFilter";
import { JobStatusType } from "legacy/shared/types";
import styled from "styled-components";

type PropsType = {
  lastRunStatus: JobStatusType;
  setLastRunStatus: (lastRunStatus: JobStatusType) => void;
};

const LastRunStatusSelector = (props: PropsType) => {
  const options = [
    {
      label: "All",
      value: "all",
    },
  ].concat(
    Object.entries(JobStatusType).map((status) => ({
      label: status[0],
      value: status[1],
    }))
  );

  return (
    <RadioFilter
      selected={props.lastRunStatus}
      setSelected={props.setLastRunStatus}
      options={options}
      name="Last run status"
      icon={last_run}
    />
  );
};

export default LastRunStatusSelector;

const Label = styled.div`
  display: flex;
  align-items: center;
  min-width: 130px;
  margin-right: 12px;

  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;

const StyledLastRunStatusSelector = styled.div`
  display: flex;
  align-items: center;
  margin-right: -3px;
  font-size: 13px;
`;

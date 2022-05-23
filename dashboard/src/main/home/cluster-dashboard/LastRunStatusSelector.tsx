import React from "react";
import styled from "styled-components";

import Selector from "components/Selector";
import { JobStatusType } from "shared/types";

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
    <StyledLastRunStatusSelector>
      <Label>
        <i className="material-icons">filter_alt</i>
        Last Run Status
      </Label>
      <Selector
        activeValue={props.lastRunStatus}
        setActiveValue={props.setLastRunStatus}
        options={options}
        dropdownLabel="Last Run Status"
        width="150px"
        dropdownWidth="230px"
        closeOverlay={true}
      />
    </StyledLastRunStatusSelector>
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

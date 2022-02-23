import React, { useContext, useState } from "react";
import styled from "styled-components";

import { PorterFormContext } from "components/porter-form/PorterFormContextProvider";
import JobList from "./JobList";
import SaveButton from "components/SaveButton";
import CommandLineIcon from "assets/command-line-icon";
import ConnectToJobInstructionsModal from "./ConnectToJobInstructionsModal";

interface Props {
  isAuthorized: any;
  saveValuesStatus: string;
  setJobs: any;
  jobs: any;
  handleSaveValues: any;
  expandJob: any;
  chartName: string;
}

/**
 * Temporary functional component for allowing job rerun button to consume
 * form context (until ExpandedJobChart is migrated to FC)
 */
const TempJobList: React.FC<Props> = (props) => {
  const { getSubmitValues } = useContext(PorterFormContext);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  let saveButton = (
    <ButtonWrapper>
      <SaveButton
        onClick={() => {
          props.handleSaveValues(getSubmitValues(), true);
        }}
        status={props.saveValuesStatus}
        makeFlush={true}
        clearPosition={true}
        rounded={true}
        statusPosition="right"
      >
        <i className="material-icons">play_arrow</i> Run Job
      </SaveButton>
      <CLIModalIconWrapper
        onClick={(e) => {
          e.preventDefault();
          setShowConnectionModal(true);
        }}
      >
        <CLIModalIcon />
        Shell Access
      </CLIModalIconWrapper>
    </ButtonWrapper>
  );

  if (!props.isAuthorized("job", "", ["get", "update", "create"])) {
    saveButton = null;
  }

  return (
    <>
      {saveButton}
      <JobList
        jobs={props.jobs}
        setJobs={props.setJobs}
        expandJob={props.expandJob}
      />
      <ConnectToJobInstructionsModal
        show={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        chartName={props.chartName}
      />
    </>
  );
};

export default TempJobList;

const ButtonWrapper = styled.div`
  display: flex;
  margin: 5px 0 35px;
  justify-content: space-between;
`;

const CLIModalIconWrapper = styled.div`
  height: 35px;
  font-size: 13px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 20px 6px 10px;
  text-align: left;
  border: 1px solid #ffffff55;
  border-radius: 8px;
  background: #ffffff11;
  color: #ffffffdd;
  cursor: pointer;

  :hover {
    cursor: pointer;
    background: #ffffff22;
    > path {
      fill: #ffffff77;
    }
  }

  > path {
    fill: #ffffff99;
  }
`;

const CLIModalIcon = styled(CommandLineIcon)`
  width: 32px;
  height: 32px;
  padding: 8px;

  > path {
    fill: #ffffff99;
  }
`;

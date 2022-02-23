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
      <CLIModalIcon
        onClick={(e) => {
          e.preventDefault();
          setShowConnectionModal(true);
        }}
      />
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
`;

const CLIModalIcon = styled(CommandLineIcon)`
  width: 35px;
  height: 35px;
  padding: 8px;
  margin: 0 5px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;
  color: white;
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

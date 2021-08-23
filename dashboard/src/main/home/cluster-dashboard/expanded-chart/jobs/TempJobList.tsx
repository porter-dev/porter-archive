import React, { useContext, useState } from "react";
import styled from "styled-components";

import { PorterFormContext } from "components/porter-form/PorterFormContextProvider";
import JobList from "./JobList";
import SaveButton from "components/SaveButton";

interface Props {
  isAuthorized: any;
  saveValuesStatus: string;
  setJobs: any;
  jobs: any;
  handleSaveValues: any;
}

/**
 * Temporary functional component for allowing job rerun button to consume
 * form context (until ExpandedJobChart is migrated to FC)
 */
const TempJobList: React.FC<Props> = (props) => {
  const { getSubmitValues } = useContext(PorterFormContext);
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
    </ButtonWrapper>
  );

  if (!props.isAuthorized("job", "", ["get", "update", "create"])) {
    saveButton = null;
  }

  return (
    <>
      {saveButton}
      <JobList jobs={props.jobs} setJobs={props.setJobs} />
    </>
  );
};

export default TempJobList;

const ButtonWrapper = styled.div`
  margin: 5px 0 35px;
`;

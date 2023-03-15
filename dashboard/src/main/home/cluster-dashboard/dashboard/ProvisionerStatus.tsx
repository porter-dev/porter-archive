import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import aws from "assets/aws.png";
import api from "shared/api";
import loading from "assets/loading.gif";

import { Context } from "shared/Context";
import ExpandableSection from "components/ExpandableSection";

type Props = {};

const ProvisionerStatus: React.FC<Props> = ({}) => {
  const { currentProject, setCurrentCluster } = useContext(Context);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StyledProvisionerStatus>
      <ExpandableSection
        isInitiallyExpanded={true}
        Header={(
          <>
            <Icon src={aws} />
            AWS provisioning status
          </>
        )}
        ExpandedSection={(
          <DummyLogs>[Logs unimplemented]</DummyLogs>
        )}
      />
    </StyledProvisionerStatus>
  );
};

export default ProvisionerStatus;

const DummyLogs = styled.div`
  height: 150px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  background: #101420;
  font-family: monospace;
`;

const Icon = styled.img`
  height: 16px;
  margin-right: 10px;
  margin-bottom: -1px;
`;

const Img = styled.img`
  height: 15px;
  margin-right: 7px;
`;

const Status = styled.div`
  color: #aaaabb;
  display: flex;
  align-items: center;
  margin-left: 15px;
`;

const StyledProvisionerStatus = styled.div`
  margin-bottom: 22px;
`;
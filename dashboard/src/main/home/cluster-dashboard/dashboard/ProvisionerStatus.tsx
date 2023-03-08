import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import api from "shared/api";
import loading from "assets/loading.gif";

import { Context } from "shared/Context";

type Props = {};

const ProvisionerStatus: React.FC<Props> = ({}) => {
  const { currentProject, setCurrentCluster } = useContext(Context);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <StyledProvisionerStatus>
      <Flex>
        <Icon src="https://img.stackshare.io/service/7991/amazon-eks.png" />
        Elastic Kubernetes Service
        <Status>
          <Img src={loading} /> Updating
        </Status>
      </Flex>
    </StyledProvisionerStatus>
  );
};

export default ProvisionerStatus;

const Icon = styled.img`
  height: 20px;
  margin-right: 10px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
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
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  height: 40px;
  margin-bottom: 22px;
  font-size: 14px;
  padding-left: 12px;
  display: flex;
  align-items: center;
`;
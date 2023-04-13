import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";
import { pushFiltered } from "shared/routing";

import loading from "assets/loading.gif";

import { Context } from "shared/Context";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import Text from "./porter/Text";
import Spacer from "./porter/Spacer";

type Props = {};

const NoClusterPlaceholder: React.FC<RouteComponentProps> = (props) => {
  const { currentCluster } = useContext(Context);

  return (
    <ClusterPlaceholder>
      <Text size={16}>No Cluster Provisioned</Text>
      <Spacer height="15px" />
      <Text color="helper">Finish provisioning a cluster to continue</Text>
    </ClusterPlaceholder>
  );
};

export default withRouter(NoClusterPlaceholder);

const Link = styled.a`
  text-decoration: underline;
  position: relative;
  cursor: pointer;
  > i {
    color: #aaaabb;
    font-size: 15px;
    position: absolute;
    right: -17px;
    top: 1px;
  }
`;

const Img = styled.img`
  height: 15px;
  margin-right: 15px;
`;

const ClusterPlaceholder = styled.div`
  padding: 25px;
  border-radius: 5px;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  padding-bottom: 35px;
`;

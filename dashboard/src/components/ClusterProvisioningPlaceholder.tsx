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

const ClusterProvisioningPlaceholder: React.FC<RouteComponentProps> = (props) => {
  const { currentCluster } = useContext(Context);

  return (
    <ClusterPlaceholder>
      <Text size={16}>
        <Img src={loading} /> Your cluster is being created
      </Text>
      <Spacer height="15px" />
      <Text color="helper">
        You can view the status of your cluster creation
        <Spacer inline width="5px" />
        <Link onClick={() => {
          pushFiltered(props, "/cluster-dashboard", ["project_id"], {
            cluster: currentCluster.name,
          });
        }}>
          here
          <i className="material-icons">arrow_forward</i> 
        </Link>
      </Text>
    </ClusterPlaceholder>
  );
};

export default withRouter(ClusterProvisioningPlaceholder);

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
  background: ${props => props.theme.fg};
  border: 1px solid #494b4f;
  padding-bottom: 35px;
`;

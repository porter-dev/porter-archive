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
import DashboardPlaceholder from "./porter/DashboardPlaceholder";
import PorterLink from "components/porter/Link";
import Button from "./porter/Button";

type Props = {};

const ClusterProvisioningPlaceholder: React.FC<RouteComponentProps> = (props) => {
  const { currentCluster } = useContext(Context);

  return (
    <DashboardPlaceholder>
      <Text size={16}>
        <Img src={loading} /> Your cluster is being created
      </Text>
      <Spacer y={.5} />
      <Text color="helper">
        You can proceed as soon as your cluster is ready.
      </Text>
      <Spacer y={1} />
      <PorterLink onClick={() => {
        pushFiltered(props, "/cluster-dashboard", ["project_id"], {
          cluster: currentCluster?.name,
        });
      }}>
        <Button alt height="35px">
          View status <Spacer inline x={1} /> <i className="material-icons" style={{ fontSize: '18px' }}>east</i>
        </Button>
      </PorterLink>
    </DashboardPlaceholder>
  );
};

export default withRouter(ClusterProvisioningPlaceholder);

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

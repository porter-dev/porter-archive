import React, { useContext, useEffect, useState } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";

import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";
import PorterLink from "components/porter/Link";

import { Context } from "shared/Context";
import { pushFiltered } from "shared/routing";
import loading from "assets/loading.gif";

import Button from "./porter/Button";
import DashboardPlaceholder from "./porter/DashboardPlaceholder";
import Spacer from "./porter/Spacer";
import Text from "./porter/Text";

type Props = {};

const ClusterProvisioningPlaceholder: React.FC<RouteComponentProps> = (
  props
) => {
  const { currentCluster, currentProject } = useContext(Context);

  return (
    <DashboardPlaceholder>
      <Text size={16}>
        <Img src={loading} /> Your cluster is being created
      </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        You can proceed as soon as your cluster is ready.
      </Text>
      <Spacer y={1} />
      <PorterLink
        onClick={() => {
          if (
            currentProject?.capi_provisioner_enabled &&
            currentProject?.simplified_view_enabled &&
            currentProject?.beta_features_enabled
          ) {
            pushFiltered(
              props,
              currentCluster?.id
                ? `/infrastructure/${currentCluster.id}`
                : "/infrastructure",
              []
            );
          } else {
            pushFiltered(props, "/cluster-dashboard", ["project_id"], {
              cluster: currentCluster?.name,
            });
          }
        }}
      >
        <Button alt height="35px">
          View status <Spacer inline x={1} />{" "}
          <i className="material-icons" style={{ fontSize: "18px" }}>
            east
          </i>
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
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  padding-bottom: 35px;
`;

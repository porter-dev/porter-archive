import React, { useContext, useEffect, useState } from "react";
import loading from "legacy/assets/loading.gif";
import Heading from "legacy/components/form-components/Heading";
import Helper from "legacy/components/form-components/Helper";
import PorterLink from "legacy/components/porter/Link";
import { pushFiltered } from "legacy/shared/routing";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";

import { Context } from "shared/Context";

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
            currentProject?.simplified_view_enabled
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

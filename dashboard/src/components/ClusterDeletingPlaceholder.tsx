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

const ClusterDeletingPlaceholder: React.FC<RouteComponentProps> = (props) => {
  const { currentCluster } = useContext(Context);

  return (
    <DashboardPlaceholder>
      <Text size={16}>
        <Img src={loading} /> Your resources are being cleaned up
      </Text>
      <Spacer y={.5} />
      <Text color="helper">
        You can proceed as soon as your resources are deleted. It may take a few minutes.
      </Text>
      <Spacer y={1} />

    </DashboardPlaceholder>
  );
};

export default withRouter(ClusterDeletingPlaceholder);

const Img = styled.img`
  height: 15px;
  margin-right: 15px;
`;

import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";
import { RouteComponentProps, withRouter } from "react-router";
import { pushFiltered } from "shared/routing";

import loading from "assets/loading.gif";

import { Context } from "shared/Context";
import Heading from "components/form-components/Heading";
import Helper from "components/form-components/Helper";

type Props = {};

const ClusterProvisioningPlaceholder: React.FC<RouteComponentProps> = (props) => {
  const { currentCluster } = useContext(Context);

  return (
    <ClusterPlaceholder>
      <Heading isAtTop>
        <Img src={loading} /> Your cluster is being created
      </Heading>
      <Helper>
        You can view the status of your cluster creation{" "}
        <Link onClick={() => {
          pushFiltered(props, "/cluster-dashboard", ["project_id"], {
            cluster: currentCluster.name,
          });
        }}>
          here
          <i className="material-icons">arrow_forward</i> 
        </Link>
      </Helper>
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
  background: #26292e;
  border: 1px solid #494b4f;
  padding-bottom: 10px;
`;

import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import web from "assets/web.png";

import { Context } from "shared/Context";
import api from "shared/api";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import Container from "components/porter/Container";
import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";

type Props = {
};

const AppDashboard: React.FC<Props> = ({
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getApps = async () => {
    
    // TODO: Currently using namespaces as placeholder (replace with apps)
    try {
      const res = await api.getNamespaces(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      setApps(res.data);
    }
    catch (err) {}
  };

  useEffect(() => {
    getApps();
  }, []);

  return (
    <StyledAppDashboard>
      <DashboardHeader
        image={web}
        title="Applications"
        description="Continuously running web services, workers, and add-ons."
        disableLineBreak
      />
      <Container row spaced>
        <Button onClick={() => console.log("cool")} height="30px">
          <I className="material-icons">add</I> Add application
        </Button>
        <div>x/o</div>
      </Container>
      <Spacer y={1} />
      {apps.map((app: any) => {
        return (
          <div>{app.name}</div>
        );
      })}
    </StyledAppDashboard>
  );
};

export default AppDashboard;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const StyledAppDashboard = styled.div`
  width: 100%;
  height: 100%;
`;
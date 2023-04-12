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
      <GridList>
        {apps.map((app: any) => {
          return (
            <Block></Block>
          );
        })}
      </GridList>
    </StyledAppDashboard>
  );
};

export default AppDashboard;

const Block = styled.div`
  align-items: center;
  user-select: none;
  display: flex;
  font-size: 13px;
  padding: 3px 0px 5px;
  flex-direction: column;
  align-item: center;
  justify-content: space-between;
  height: 170px;
  cursor: pointer;
  color: ${props => props.theme.text.primary};
  position: relative;
  border-radius: 5px;
  background: ${props => props.theme.clickable.bg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const GridList = styled.div`
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

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
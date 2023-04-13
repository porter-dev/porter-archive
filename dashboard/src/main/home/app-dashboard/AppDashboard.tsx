import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import web from "assets/web.png";
import github from "assets/github.png";
import time from "assets/time.png";
import healthy from "assets/status-healthy.png";

import { Context } from "shared/Context";
import api from "shared/api";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import Container from "components/porter/Container";
import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import SearchBar from "components/porter/SearchBar";

type Props = {
};

const icons = [
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-plain.svg",
  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
  web,
];

const namespaceBlacklist = [
  "cert-manager",
  "default",
  "ingress-nginx",
  "kube-node-lease",
  "kube-public",
  "kube-system",
  "monitoring",
];

const AppDashboard: React.FC<Props> = ({
}) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [apps, setApps] = useState([]);
  const [searchValue, setSearchValue] = useState("");
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
        <SearchBar 
          value={searchValue}
          setValue={setSearchValue}
          placeholder="Search applications . . ."
          width="100%"
        />
        <Spacer inline x={2} />
        <Button onClick={() => console.log("cool")} height="30px" width="150px">
          <I className="material-icons">add</I> Add application
        </Button>
      </Container>
      <Spacer y={1} />
      <GridList>
        {apps.map((app: any, i: number) => {
          if (!namespaceBlacklist.includes(app.name)) {
            return (
              <Block>
                <Text size={14}>
                  <Icon src={icons[i % icons.length]} />
                  {app.name}
                </Text>
                <StatusIcon src={healthy} />
                <Text size={13} color="#ffffff44">
                  <SmallIcon opacity="0.6" src={github} />
                  porter-dev/porter
                </Text>
                <Text size={13} color="#ffffff44">
                  <SmallIcon opacity="0.4" src={time} />
                  Updated 6:35 PM on 4/23/2023
                </Text>
              </Block>
            );
          }
        })}
      </GridList>
      <Spacer y={5} />
    </StyledAppDashboard>
  );
};

export default AppDashboard;

const StatusIcon = styled.img`
  position: absolute;
  top: 20px;
  right: 20px;
  height: 18px;
`;

const Icon = styled.img`
  height: 18px;
  margin-right: 15px;
`;

const SmallIcon = styled.img<{ opacity?: string }>`
  margin-left: 2px;
  height: 14px;
  opacity: ${props => props.opacity || 1};
  margin-right: 10px;
`;

const Block = styled.div`
  height: 150px;
  flex-direction: column;
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  padding: 20px;
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
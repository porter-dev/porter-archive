import React, { useState } from "react";
import styled from "styled-components";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";

import logo from "assets/logo.png";

const InfoPanel: React.FC = () => {
  // ret2 set to cloud.porter.run
  if (window.location.hostname === "cloud.porter.run") {
    return (
      <Wrapper>
        <Container row>
          <a href="https://porter.run">
            <Logo src={logo} />
          </a>
          <Badge>Cloud</Badge>
        </Container>
        <Spacer y={2} />
        <Jumbotron>
          Deploy and scale <Shiny>effortlessly</Shiny> with Porter
        </Jumbotron>
        <Spacer y={2} />
        <CheckRow>
          <i className="material-icons">done</i> $5 in free credits on sign-up
        </CheckRow>
        <Spacer y={0.5} />
        <CheckRow>
          <i className="material-icons">done</i> Instantly deploy from any Git
          repo
        </CheckRow>
        <Spacer y={0.5} />
        <CheckRow>
          <i className="material-icons">done</i> Eject at any time to your own
          AWS/Azure/GCP account
        </CheckRow>
      </Wrapper>
    );
  }
  return (
    <Wrapper>
      <a href="https://porter.run">
        <Logo src={logo} />
      </a>
      <Spacer y={2} />
      <Jumbotron>
        Deploy and scale <Shiny>effortlessly</Shiny> with Porter
      </Jumbotron>
      <Spacer y={2} />
      <CheckRow>
        <i className="material-icons">done</i> 14 day free trial
      </CheckRow>
      <Spacer y={0.5} />
      <CheckRow>
        <i className="material-icons">done</i> Generous startup program for
        seed-stage companies
      </CheckRow>
      <Spacer y={0.5} />
      <CheckRow>
        <i className="material-icons">done</i> Bring your own cloud and use your
        credits
      </CheckRow>
    </Wrapper>
  );
};

export default InfoPanel;

const Badge = styled.div`
  margin-left: 17px;
  margin-top: -6px;
  background: ${(props) => props.theme.clickable};
  padding: 5px 10px;
  border: 1px solid #aaaabb;
  border-radius: 5px;
`;

const CheckRow = styled.div`
  font-size: 14px;
  display: flex;
  align-items: center;
  color: #aaaabb;
  > i {
    font-size: 18px;
    margin-right: 10px;
    float: left;
    color: #4797ff;
  }
`;

const Shiny = styled.span`
  background-image: linear-gradient(225deg, #fff, #7980ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Jumbotron = styled.div`
  font-size: 32px;
  font-weight: 500;
  line-height: 1.5;
`;

const Logo = styled.img`
  height: 24px;
  user-select: none;
`;

const Wrapper = styled.div`
  width: 500px;
  margin-top: -20px;
  position: relative;
  padding: 25px;
  border-radius: 5px;
  font-size: 13px;
`;

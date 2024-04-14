import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import DynamicLink from "components/DynamicLink";
import Heading from "components/form-components/Heading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import api from "shared/api";
import { Context } from "shared/Context";
import { emailRegex } from "shared/regex";
import blog from "assets/blog.png";
import community from "assets/community.png";
import docs from "assets/docs.png";
import github from "assets/github-icon.png";
import GoogleIcon from "assets/GoogleIcon";
import logo from "assets/logo.png";
import Login from "./Login";
import OryLogin from "./OryLogin";
import Helper from "../../components/form-components/Helper";
import ToggleRow from "../../components/porter/ToggleRow";

type Props = {
  authenticate: () => void;
};

const getWindowDimensions = () => {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
};

const LoginWrapper: React.FC<Props> = ({ authenticate }) => {
  const [legacyLogin, setLegacyLogin] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState(
      getWindowDimensions()
  );

  const handleResize = () => {
    setWindowDimensions(getWindowDimensions());
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <StyledLogin>
      {windowDimensions.width > windowDimensions.height && (
        <Wrapper>
          <Container row>
            <a href="https://porter.run">
              <Logo src={logo} />
            </a>
            {window.location.hostname === "cloud.porter.run" && (
              <Badge>Cloud</Badge>
            )}
          </Container>
          <Spacer y={2} />
          <Jumbotron>
            <Shiny>Welcome back to Porter</Shiny>
          </Jumbotron>
          <Spacer y={1} />
          <ToggleRow
              isToggled={legacyLogin}
              onToggle={() => {setLegacyLogin(!legacyLogin)}}
          >
            <Helper>Legacy log-in flow</Helper>
          </ToggleRow>
          <Spacer y={1} />
          <LinkRow to="https://porter.run/docs" target="_blank">
            <img src={docs} /> Read the Porter docs
          </LinkRow>
          <Spacer y={0.5} />
          <LinkRow to="https://porter.run/blog" target="_blank">
            <img src={blog} /> See what's new with Porter
          </LinkRow>
        </Wrapper>
      )}
      <Wrapper>
        {windowDimensions.width <= windowDimensions.height && (
          <Flex>
            <a href="https://porter.run">
              <Logo src={logo} />
            </a>
            <Spacer y={2} />
          </Flex>
        )}
        <Spacer y={2} />
        {legacyLogin ? (
          <Login authenticate={authenticate} />
        ) : (
            <OryLogin />
        )}
      </Wrapper>
    </StyledLogin>
  );
};

export default LoginWrapper;

const Badge = styled.div`
  margin-left: 17px;
  margin-top: -6px;
  background: ${(props) => props.theme.clickable};
  padding: 5px 10px;
  border: 1px solid #aaaabb;
  border-radius: 5px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const LinkRow = styled(DynamicLink)`
  font-size: 14px;
  display: flex;
  align-items: center;
  width: 220px;
  color: #aaaabb;
  > i {
    font-size: 18px;
    margin-right: 10px;
    float: left;
    color: #4797ff;
  }

  > img {
    height: 18px;
    margin-right: 10px;
  }

  :hover {
    filter: brightness(2);
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

const StyledLogin = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  background: #111114;
`;

import React, { useEffect, useState } from "react";
import styled from "styled-components";

import github from "assets/github-icon.png";
import logo from "assets/logo.png";
import GoogleIcon from "assets/GoogleIcon";

import api from "shared/api";
import { emailRegex } from "shared/regex";
import { Context } from "shared/Context";

import Heading from "components/form-components/Heading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Link from "components/porter/Link";

type Props = {
  authenticate: () => void;
};

const getWindowDimensions = () => {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
}

const Register: React.FC<Props> = ({
  authenticate,
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [hasBasic, setHasBasic] = useState(true);
  const [hasGithub, setHasGithub] = useState(true);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  const handleRegister = (): void => {
    if (!emailRegex.test(email)) {
      this.setState({ emailError: true });
    }

    if (confirmPassword !== password) {
      this.setState({ confirmPasswordError: true });
    }

    // Check for valid input
    if (emailRegex.test(email) && confirmPassword === password) {
      // Attempt user registration
      api
        .registerUser(
          "",
          {
            email: email,
            password: password,
          },
          {}
        )
        .then((res: any) => {
          if (res?.data?.redirect) {
            window.location.href = res.data.redirect;
          } else {
            setUser(res?.data?.id, res?.data?.email);
            authenticate();
          }
        })
        .catch((err) => setCurrentError(err.response.data.error));
    }
  };

  const handleResize = () => {
    setWindowDimensions(getWindowDimensions());
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") {
      handleLogin();
    };
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const githubRedirect = () => {
    let redirectUrl = `/api/oauth/login/github`;
    window.location.href = redirectUrl;
  };

  const renderOAuthSection = () => {
    if (hasGithub || hasGoogle) {
      return (
        <>
          <Container row>
            {hasGithub && (
              <OAuthButton onClick={githubRedirect}>
                <Icon src={github} />
                Sign up with GitHub
              </OAuthButton>
            )}
            {hasGithub && hasGoogle && (
              <Spacer inline x={2} />
            )}
            {hasGoogle && (
              <OAuthButton onClick={githubRedirect}>
                <StyledGoogleIcon />
                Sign up with Google
              </OAuthButton>
            )}
          </Container>
          <OrWrapper>
            <Line />
            <Or>or</Or>
          </OrWrapper>
        </>
      );
    }
  };

  return (
    <StyledRegister>
      {windowDimensions.width > windowDimensions.height && (
        <Wrapper>
          <Logo src={logo} />
          <Spacer y={2} />
          <Jumbotron>
            Deploy and scale <Shiny>effortlessly</Shiny> with Porter
          </Jumbotron>
          <Spacer y={2} />
          <CheckRow>
            <i className="material-icons">done</i> Generous free tier for small teams
          </CheckRow>
          <Spacer y={0.5} />
          <CheckRow>
            <i className="material-icons">done</i> Bring your own cloud (and cloud credits)
          </CheckRow>
          <Spacer y={0.5} />
          <CheckRow>
            <i className="material-icons">done</i> Fully automated setup and deployment
          </CheckRow>
        </Wrapper>
      )}
      <Wrapper>
        {windowDimensions.width <= windowDimensions.height && (
          <Flex>
            <Logo src={logo} />
            <Spacer y={2} />
          </Flex>
        )}
        <Heading isAtTop>
          Create your Porter account
        </Heading>
        <Spacer y={1} />
        {renderOAuthSection()}
        <Container row>
          <Input
            placeholder="First name"
            label="First name"
            value={firstName}
            setValue={setFirstName}
            width="100%"
            height="40px"
          />
          <Spacer inline x={2} />
          <Input
            placeholder="Last name"
            label="Last name"
            value={lastName}
            setValue={setLastName}
            width="100%"
            height="40px"
          />
        </Container>
        <Spacer y={1} />
        <Input
          placeholder="Email"
          label="Email"
          value={email}
          setValue={setEmail}
          width="100%"
          height="40px"
        />
        <Spacer y={1} />
        <Input
          placeholder="Password"
          label="Password"
          value={password}
          setValue={setPassword}
          width="100%"
          height="40px"
          type="password"
        />
        <Spacer height="30px" />
        <Button onClick={authenticate} width="100%" height="40px">
          Continue
        </Button>
        <Spacer y={1} />
        <Text 
          size={13}
          color="helper"
        >
          Already have an account? <Link to="/login">Log in</Link>
        </Text>
      </Wrapper>
    </StyledRegister>
  );
};

export default Register;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
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

const StyledGoogleIcon = styled(GoogleIcon)`
  width: 38px;
  height: 38px;
`;

const Line = styled.div`
  height: 2px;
  width: 100%;
  background: #ffffff22;
  margin: 35px 0px 30px;
`;

const Or = styled.div`
  position: absolute;
  width: 50px;
  text-align: center;
  background: #111114;
  z-index: 999;
  left: calc(50% - 25px);
  margin-top: -1px;
`;

const OrWrapper = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;
  position: relative;
`;

const Icon = styled.img`
  height: 18px;
  margin: 14px;
`;

const OAuthButton = styled.div`
  width: 100%;
  height: 40px;
  display: flex;
  background: #ffffff;
  align-items: center;
  border-radius: 5px;
  color: #000000;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  font-size: 13px;
  :hover {
    background: #ffffffdd;
  }
`;

const Wrapper = styled.div`
  width: 500px;
  margin-top: -20px;
  position: relative;
  padding: 25px;
  border-radius: 5px;
  font-size: 13px;
`;

const StyledRegister = styled.div`
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
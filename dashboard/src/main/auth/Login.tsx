import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import github from "assets/github-icon.png";
import logo from "assets/logo.png";
import docs from "assets/docs.png";
import blog from "assets/blog.png";
import community from "assets/community.png";
import GoogleIcon from "assets/GoogleIcon";

import api from "shared/api";
import { emailRegex } from "shared/regex";
import { Context } from "shared/Context";

import DynamicLink from "components/DynamicLink";
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

const Login: React.FC<Props> = ({
  authenticate,
}) => {
  const { setUser, setCurrentError } = useContext(Context);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [credentialError, setCredentialError] = useState(false);
  const [hasBasic, setHasBasic] = useState(true);
  const [hasGithub, setHasGithub] = useState(true);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [hasResetPassword, setHasResetPassword] = useState(true);
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  const handleLogin = (): void => {
    if (!emailRegex.test(email)) {
      setEmailError(true);
    } else {
      api.logInUser(
        "",
        { email: email, password: password },
        {}
      )
        .then((res) => {
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

  // Manually re-register event listener on email/password change
  useEffect(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [email, password]);

  useEffect(() => {

    // Get capabilities to case on login methods
    api.getMetadata("", {}, {})
      .then((res) => {
        setHasBasic(res.data?.basic_login);
        setHasGithub(res.data?.github_login);
        setHasGoogle(res.data?.google_login);
        setHasResetPassword(res.data?.email);
      })
      .catch((err) => console.log(err));

    const urlParams = new URLSearchParams(window.location.search);
    const emailFromCLI = urlParams.get("email");
    emailFromCLI && setEmail(emailFromCLI);

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const githubRedirect = () => {
    let redirectUrl = `/api/oauth/login/github`;
    window.location.href = redirectUrl;
  };

  const googleRedirect = () => {
    let redirectUrl = `/api/oauth/login/google`;
    window.location.href = redirectUrl;
  };

  return (
    <StyledLogin>
      {windowDimensions.width > windowDimensions.height && (
        <Wrapper>
          <Logo src={logo} />
          <Spacer y={2} />
          <Jumbotron>
            <Shiny>Welcome back to Porter</Shiny>
          </Jumbotron>
          <Spacer y={2} />
          <LinkRow to="https://docs.porter.run" target="_blank">
            <img src={docs} /> Read the Porter docs
          </LinkRow>
          <Spacer y={0.5} />
          <LinkRow to="https://blog.porter.run" target="_blank">
            <img src={blog} /> See what's new with Porter
          </LinkRow>
          <Spacer y={0.5} />
          <LinkRow to="https://discord.com/invite/34n7NN7FJ7" target="_blank">
            <img src={community} /> Join the community
          </LinkRow>
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
          Log in to your Porter account
        </Heading>
        <Spacer y={1} />
        {(hasGithub || hasGoogle) && (
          <>
            <Container row>
              {hasGithub && (
                <OAuthButton onClick={githubRedirect}>
                  <Icon src={github} />
                  Log in with GitHub
                </OAuthButton>
              )}
              {hasGithub && hasGoogle && (
                <Spacer inline x={2} />
              )}
              {hasGoogle && (
                <OAuthButton onClick={googleRedirect}>
                  <StyledGoogleIcon />
                  Log in with Google
                </OAuthButton>
              )}
            </Container>
            {hasBasic && (
              <OrWrapper>
                <Line />
                <Or>or</Or>
              </OrWrapper>
            )}
          </>
        )}
        {hasBasic && (
          <>
            <Input
              type="email"
              placeholder="Email"
              label="Email"
              value={email}
              setValue={(x) => {
                setEmail(x);
                setEmailError(false);
                setCredentialError(false);
              }}
              width="100%"
              height="40px"
              error={(emailError && "Please enter a valid email") || (credentialError && "")}
            />
            <Spacer y={1} />
            <Input
              type="password"
              placeholder="Password"
              label="Password"
              value={password}
              setValue={(x) => {
                setPassword(x);
                setCredentialError(false);
              }}
              width="100%"
              height="40px"
              error={credentialError && "Incorrect email or password"}
            >
              {hasResetPassword && (
                <ForgotPassword>
                  <Link to="/password/reset">Forgot your password?</Link>
                </ForgotPassword>
              )}
            </Input>
            <Spacer height="30px" />
            <Button onClick={handleLogin} width="100%" height="40px">
              Continue
            </Button>
          </>
        )}
        <Spacer y={1} />
        <Text 
          size={13}
          color="helper"
        >
          Don't have an account? <Link to="/register">Sign up</Link>
        </Text>
      </Wrapper>
    </StyledLogin>
  );
};

export default Login;

const ForgotPassword = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  font-size: 13px;
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
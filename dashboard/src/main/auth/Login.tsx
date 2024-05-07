import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import Heading from "components/form-components/Heading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";

import api from "shared/api";
import { Context } from "shared/Context";
import { emailRegex } from "shared/regex";
import github from "assets/github-icon.png";
import GoogleIcon from "assets/GoogleIcon";

type Props = {
  authenticate: () => Promise<void>;
};

const Login: React.FC<Props> = ({ authenticate }) => {
  const { setUser, setCurrentError } = useContext(Context);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [credentialError, setCredentialError] = useState(false);
  const [hasBasic, setHasBasic] = useState(true);
  const [hasGithub, setHasGithub] = useState(true);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [hasResetPassword, setHasResetPassword] = useState(true);

  const handleLogin = (): void => {
    if (!emailRegex.test(email)) {
      setEmailError(true);
    } else if (password === "") {
      setCredentialError(true);
    } else {
      api
        .logInUser("", { email, password }, {})
        .then((res) => {
          if (res?.data?.redirect) {
            window.location.href = res.data.redirect;
          } else {
            setUser(res?.data?.id, res?.data?.email);
            authenticate().catch(() => {});
          }
        })
        .catch((err) => {
          setCurrentError(err.response.data.error);
        });
    }
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") {
      handleLogin();
    }
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
    api
      .getMetadata("", {}, {})
      .then((res) => {
        setHasBasic(res.data?.basic_login);
        setHasGithub(res.data?.github_login);
        setHasGoogle(res.data?.google_login);
        setHasResetPassword(res.data?.email);
      })
      .catch((err) => {
        console.log(err);
      });

    const urlParams = new URLSearchParams(window.location.search);
    const emailFromCLI = urlParams.get("email");
    emailFromCLI && setEmail(emailFromCLI);
  }, []);

  const githubRedirect = () => {
    const redirectUrl = `/api/oauth/login/github`;
    window.location.href = redirectUrl;
  };

  const googleRedirect = () => {
    const redirectUrl = `/api/oauth/login/google`;
    window.location.href = redirectUrl;
  };

  return (
    <Container>
      <Heading isAtTop>Log in to your Porter account</Heading>
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
            {hasGithub && hasGoogle && <Spacer inline x={2} />}
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
            autoFocus={true}
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
            error={emailError && "Please enter a valid email"}
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
            error={credentialError && ""}
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
    </Container>
  );
};

export default Login;

const ForgotPassword = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  font-size: 13px;
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

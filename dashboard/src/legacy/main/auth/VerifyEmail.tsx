import React, { useContext, useEffect, useState } from "react";
import github from "legacy/assets/github-icon.png";
import GoogleIcon from "legacy/assets/GoogleIcon";
import logo from "legacy/assets/logo.png";
import Heading from "legacy/components/form-components/Heading";
import Button from "legacy/components/porter/Button";
import Container from "legacy/components/porter/Container";
import Input from "legacy/components/porter/Input";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import api from "legacy/shared/api";
import styled from "styled-components";

import { Context } from "shared/Context";

import InfoPanel from "./InfoPanel";

type Props = {
  handleLogOut: () => void;
};

const getWindowDimensions = () => {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
};

const Register: React.FC<Props> = ({ handleLogOut }) => {
  const { user, setCurrentError } = useContext(Context);
  const [submitted, setSubmitted] = useState(false);
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

  const handleSendEmail = (): void => {
    api
      .createEmailVerification("", {}, {})
      .then((res) => {
        setSubmitted(true);
      })
      .catch((err) => {
        setCurrentError(err.response.data.error);
      });
  };

  return (
    <StyledRegister>
      {windowDimensions.width > windowDimensions.height && <InfoPanel />}
      <Wrapper>
        {windowDimensions.width <= windowDimensions.height && (
          <Flex>
            <Logo src={logo} />
            <Spacer y={2} />
          </Flex>
        )}
        <Heading isAtTop>Verify your email</Heading>
        <Spacer y={1} />
        {submitted ? (
          <>
            <Text color="helper" size={13}>
              A new verification email was sent to:
            </Text>
            <Spacer y={1} />
            <Email>{user?.email}</Email>
            <Spacer y={1} />
            <Text color="helper" size={13}>
              Don't forget to check your spam folder.
            </Text>
            <Spacer y={1} />
            <Text color="helper" size={13}>
              If you still need help, please contact support@porter.run.
            </Text>
          </>
        ) : (
          <>
            <Text color="helper" size={13}>
              We've sent a verification link to the following email address:
            </Text>
            <Spacer y={1} />
            <Email>{user?.email}</Email>
            <Spacer y={1} />
            <Text color="helper" size={13}>
              Please click the link in your inbox to verify your email.
            </Text>
            <Spacer y={1} />
            <Text color="helper" size={13}>
              Didn't receive anything?
            </Text>
            <Spacer height="30px" />
            <Button onClick={handleSendEmail} width="100%" height="40px">
              Resend verification email
            </Button>
          </>
        )}
        <Spacer y={1} />
        <Text size={13} color="helper">
          Want to use a different email?
          <Spacer inline width="5px" />
          <Link onClick={handleLogOut}>Log out</Link>
        </Text>
      </Wrapper>
    </StyledRegister>
  );
};

export default Register;

const Email = styled.div`
  width: 100%;
  height: 40px;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  font-size: 14px;
  display: flex;
  align-items: center;
  padding: 15px;
  color: #aaaabb;
`;

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

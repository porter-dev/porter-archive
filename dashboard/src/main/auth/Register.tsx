import React, { useEffect, useState, useContext } from "react";
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
  const { setUser, setCurrentError } = useContext(Context);
  const [firstName, setFirstName] = useState("");
  const [firstNameError, setFirstNameError] = useState(false);
  const [lastName, setLastName] = useState("");
  const [lastNameError, setLastNameError] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyNameError, setCompanyNameError] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [hasBasic, setHasBasic] = useState(true);
  const [hasGithub, setHasGithub] = useState(true);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  const handleRegister = (): void => {
    if (!emailRegex.test(email)) {
      setEmailError(true);
    }

    if (firstName === "") {
      setFirstNameError(true);
    }

    if (lastName === "") {
      setLastNameError(true);
    }

    if (password === "") {
      setPasswordError(true);
    }

    if (companyName === "") {
      setCompanyNameError(true);
    }

    // Check for valid input
    if (
      emailRegex.test(email) && 
      firstName !== "" &&
      lastName !== "" &&
      password !== "" &&
      companyName !== ""
    ) {
      // Attempt user registration
      api
        .registerUser(
          "",
          { 
            email: email,
            password: password,
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
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
      handleRegister();
    };
  };

  // Manually re-register event listener on email/password change
  useEffect(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [email, password, firstName, lastName]);

  useEffect(() => {

    // Get capabilities to case on login methods
    api.getMetadata("", {}, {})
      .then((res) => {
        setHasBasic(res.data?.basic_login);
        setHasGithub(res.data?.github_login);
        setHasGoogle(res.data?.google_login);
      })
      .catch((err) => console.log(err));

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
            <i className="material-icons">done</i>  Generous startup program for seed-stage companies
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
        {(hasGithub || hasGoogle) && (
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
                <OAuthButton onClick={googleRedirect}>
                  <StyledGoogleIcon />
                  Sign up with Google
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
            <Container row>
              <RowWrapper>
                <Input
                  placeholder="First name"
                  label="First name"
                  value={firstName}
                  setValue={(x) => {
                    setFirstName(x);
                    setFirstNameError(false);
                  }}
                  width="100%"
                  height="40px"
                  error={(firstNameError && "First name cannot be blank")}
                />
                {!firstNameError && lastNameError && (
                  <Spacer height="27px" />
                )}
              </RowWrapper>
              <Spacer inline x={2} />
              <RowWrapper>
                <Input
                  placeholder="Last name"
                  label="Last name"
                  value={lastName}
                  setValue={(x) => {
                    setLastName(x);
                    setLastNameError(false);
                  }}
                  width="100%"
                  height="40px"
                  error={(lastNameError && "Last name cannot be blank")}
                />
                {!lastNameError && firstNameError && (
                  <Spacer height="27px" />
                )}
              </RowWrapper>
            </Container>
            <Spacer y={1} />
            <Input
              placeholder="Company name"
              label="Company name"
              value={companyName}
              setValue={(x) => {
                setCompanyName(x);
                setCompanyNameError(false);
              }}
              width="100%"
              height="40px"
              error={(companyNameError && "")}
            />
            <Spacer y={1} />
            <Input
              type="email"
              placeholder="Email"
              label="Email"
              value={email}
              setValue={(x) => {
                setEmail(x);
                setEmailError(false);
              }}
              width="100%"
              height="40px"
              error={(emailError && "Please enter a valid email")}
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
              error={(passwordError && "")}
            />
            <Spacer height="30px" />
            <Button onClick={handleRegister} width="100%" height="40px">
              Continue
            </Button>
          </>
        )}
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

const RowWrapper = styled.div`
  width: 100%;
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
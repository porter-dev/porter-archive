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
  handleLogOut: () => void;
};

const getWindowDimensions = () => {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
}

const SetInfo: React.FC<Props> = ({
  authenticate,
  handleLogOut,
}) => {
  const { user, setCurrentError } = useContext(Context);
  const [firstName, setFirstName] = useState("");
  const [firstNameError, setFirstNameError] = useState(false);
  const [lastName, setLastName] = useState("");
  const [lastNameError, setLastNameError] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyNameError, setCompanyNameError] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  const handleResize = () => {
    setWindowDimensions(getWindowDimensions());
  };

  const finishAccountSetup = async () => {
    if (firstName === "") {
      setFirstNameError(true);
    }

    if (lastName === "") {
      setLastNameError(true);
    }

    if (companyName === "") {
      setCompanyNameError(true);
    }

    if (
      firstName !== "" &&
      lastName !== "" &&
      companyName !== ""
    ) {
      api.updateUserInfo(
        "",
        { 
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
        },
        { id: user.id }
      )
        .then((res: any) => {
          authenticate();
        })
        .catch((err) => setCurrentError(err));
    }
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") {
      finishAccountSetup();
    };
  };

  // Manually re-register event listener on email/password change
  useEffect(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [firstName, lastName, companyName]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            <i className="material-icons">done</i> Generous startup program for seed-stage companies
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
          Finish setting up your account
        </Heading>
        <Spacer y={1} />
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
        <Spacer height="30px" />
        <Button onClick={finishAccountSetup} width="100%" height="40px">
          Continue
        </Button>
        <Spacer y={1} />
        <Text 
          size={13}
          color="helper"
        >
          Want to use a different login method? <Link onClick={handleLogOut}>Log out</Link>
        </Text>
      </Wrapper>
    </StyledRegister>
  );
};

export default SetInfo;

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
import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import Heading from "components/form-components/Heading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Link from "components/porter/Link";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import api from "shared/api";
import { Context } from "shared/Context";
import { emailRegex } from "shared/regex";
import github from "assets/github-icon.png";
import GoogleIcon from "assets/GoogleIcon";
import logo from "assets/logo.png";

import InfoPanel from "./InfoPanel";

type Props = {
  authenticate: () => void;
};

const getWindowDimensions = () => {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
};

const Register: React.FC<Props> = ({ authenticate }) => {
  const { setUser, setCurrentError } = useContext(Context);
  const [firstName, setFirstName] = useState("");
  const [firstNameError, setFirstNameError] = useState(false);
  const [lastName, setLastName] = useState("");
  const [lastNameError, setLastNameError] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyNameError, setCompanyNameError] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [hasBasic, setHasBasic] = useState(true);
  const [hasGithub, setHasGithub] = useState(true);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions()
  );
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const [chosenReferralOption, setChosenReferralOption] =
    useState<string>("(None provided)");
  const [referralOtherText, setReferralOtherText] = useState<string>("");

  const referralOptions = [
    { value: "(None provided)", label: "Please select an option:" },
    { value: "Email", label: "Email" },
    {
      value: "Word of mouth",
      label: "Word of mouth (friend, colleague, etc.)",
    },
    { value: "YC", label: "YC" },
    { value: "YC Startup School", label: "YC Startup School" },
    { value: "Facebook", label: "Facebook" },
    { value: "Instagram", label: "Instagram" },
    { value: "Twitter", label: "Twitter" },
    { value: "Search engine", label: "Search engine (Google, Bing, etc.)" },
    { value: "LinkedIn", label: "LinkedIn" },
    { value: "Porter blog", label: "Porter blog" },
    { value: "Other", label: "Other" },
  ];

  const handleRegister = (): void => {
    const isHosted = window.location.hostname === "cloud.porter.run";
    if (!emailRegex.test(email)) {
      setEmailError(true);
    }

    if (firstName === "" && !isHosted) {
      setFirstNameError(true);
    }

    if (lastName === "" && !isHosted) {
      setLastNameError(true);
    }

    if (password === "") {
      setPasswordError(true);
    }

    if (companyName === "" && !isHosted) {
      setCompanyNameError(true);
    }

    // Check for valid input
    if (
      !isHosted &&
      emailRegex.test(email) &&
      firstName !== "" &&
      lastName !== "" &&
      password !== "" &&
      companyName !== ""
    ) {
      setButtonDisabled(true);

      // Attempt user registration
      api
        .registerUser(
          "",
          {
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
            referral_method:
              chosenReferralOption === "Other"
                ? `Other: ${referralOtherText}`
                : chosenReferralOption,
          },
          {}
        )
        .then((res: any) => {
          if (res?.data?.redirect) {
            window.location.href = res.data.redirect;
          } else {
            setUser(res?.data?.id, res?.data?.email);
            authenticate();

            try {
              window.dataLayer?.push({
                event: "sign-up",
                data: {
                  method: "email",
                  email: res?.data?.email,
                },
              });
            } catch (err) {
              console.log(err);
            }
          }

          // Temp
          location.reload();
          setButtonDisabled(false);
        })
        .catch((err) => {
          console.log("registration:", err);
          if (err.response?.data?.error) {
            setCurrentError(err.response.data.error);
          } else {
            location.reload();
          }
          setButtonDisabled(false);
        });
    } else if (isHosted && emailRegex.test(email) && password !== "") {
      setButtonDisabled(true);

      // Attempt user registration
      api
        .registerUser(
          "",
          {
            email,
            password,
            first_name: email,
            last_name: email,
            company_name: email,
            referral_method:
              chosenReferralOption === "Other"
                ? `Other: ${referralOtherText}`
                : chosenReferralOption,
          },
          {}
        )
        .then((res: any) => {
          if (res?.data?.redirect) {
            window.location.href = res.data.redirect;
          } else {
            setUser(res?.data?.id, res?.data?.email);
            authenticate();

            try {
              window.dataLayer?.push({
                event: "sign-up",
                data: {
                  method: "email",
                  email: res?.data?.email,
                },
              });
            } catch (err) {
              console.log(err);
            }
          }

          // Temp
          location.reload();
          setButtonDisabled(false);
        })
        .catch((err) => {
          console.log("registration:", err);
          if (err.response?.data?.error) {
            setCurrentError(err.response.data.error);
          } else {
            location.reload();
          }
          setButtonDisabled(false);
        });
    }
  };

  const handleResize = () => {
    setWindowDimensions(getWindowDimensions());
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") {
      handleRegister();
    }
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
    const qs = window.location.search;
    const urlParams = new URLSearchParams(qs);
    const email = urlParams.get("email");

    if (email) {
      setEmail(email);
      setDisabled(true);
    }
  }, []);

  useEffect(() => {
    // Get capabilities to case on login methods
    api
      .getMetadata("", {}, {})
      .then((res) => {
        setHasBasic(res.data?.basic_login);
        setHasGithub(res.data?.github_login);
        setHasGoogle(res.data?.google_login);
      })
      .catch((err) => {
        console.log(err);
      });

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
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
    <StyledRegister>
      {windowDimensions.width > windowDimensions.height && <InfoPanel />}
      <Wrapper>
        {windowDimensions.width <= windowDimensions.height && (
          <Flex>
            <a href="https://porter.run">
              <Logo src={logo} />
            </a>
            <Spacer y={2} />
          </Flex>
        )}
        <Heading isAtTop>Create your Porter account</Heading>
        <Spacer y={1} />
        {(hasGithub || hasGoogle) && !disabled && (
          <>
            <Container row>
              {hasGithub && (
                <OAuthButton onClick={githubRedirect}>
                  <Icon src={github} />
                  Sign up with GitHub
                </OAuthButton>
              )}
              {hasGithub && hasGoogle && <Spacer inline x={2} />}
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
            {window.location.hostname !== "cloud.porter.run" && (
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
                      error={firstNameError && "First name cannot be blank"}
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
                      error={lastNameError && "Last name cannot be blank"}
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
                  error={companyNameError && ""}
                />
                <Spacer y={1} />
              </>
            )}
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
              error={emailError && "Please enter a valid email"}
              disabled={disabled}
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
              error={passwordError && ""}
            />
            <Spacer y={1} />
            <Text color="helper">(Optional) How did you hear about us?</Text>
            <Spacer y={0.5} />
            <Select
              width="100%"
              height="40px"
              options={referralOptions}
              setValue={setChosenReferralOption}
              value={chosenReferralOption}
            />
            {chosenReferralOption === "Other" && (
              <>
                <Spacer y={0.5} />
                <FeedbackInput
                  autoFocus={true}
                  value={referralOtherText}
                  onChange={(e) => {
                    setReferralOtherText(e.target.value);
                  }}
                  placeholder="Tell us more..."
                />
              </>
            )}
            <Spacer y={1} />
            <Button
              disabled={buttonDisabled}
              onClick={handleRegister}
              width="100%"
              height="40px"
            >
              Continue
            </Button>
          </>
        )}
        {!disabled && (
          <>
            <Spacer y={1} />
            <Text size={13} color="helper">
              Already have an account?
              <Spacer width="5px" inline />
              <Link to="/login">Log in</Link>
            </Text>
          </>
        )}
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

const FeedbackInput = styled.textarea`
  resize: none;
  width: 100%;
  height: 80px;
  outline: 0;
  padding: 14px;
  color: white;
  border: 0;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  background: #aaaabb11;
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

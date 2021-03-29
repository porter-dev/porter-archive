import React, { ChangeEvent, Component } from "react";
import styled from "styled-components";
import logo from "assets/logo.png";

import api from "shared/api";
import { emailRegex } from "shared/regex";
import { Context } from "shared/Context";

type PropsType = {};

type StateType = {
  email: string;
  emailError: boolean;
  submitted: boolean;
};

export default class ResetPasswordInit extends Component<PropsType, StateType> {
  state = {
    email: "",
    emailError: false,
    submitted: false,
  };

  handleKeyDown = (e: any) => {
    e.key === "Enter" ? this.handleResetPasswordInit() : null;
  };

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  renderEmailError = () => {
    let { emailError } = this.state;
    if (emailError) {
      return (
        <ErrorHelper>
          <div />
          Please enter a valid email
        </ErrorHelper>
      );
    }
  };

  handleResetPasswordInit = (): void => {
    let { email } = this.state;

    // Check for valid input
    if (!emailRegex.test(email)) {
      this.setState({ emailError: true });
    } else {
      // Call reset password
      api
        .createPasswordReset(
          "",
          {
            email: email,
          },
          {}
        )
        .then((res) => {
          this.setState({ submitted: true });
        })
        .catch((err) =>
          this.context.setCurrentError(err.response.data.errors[0])
        );
    }
  };

  render() {
    let { email, emailError, submitted } = this.state;

    let formSection = (
      <div>
        <InputWrapper>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              this.setState({
                email: e.target.value,
                emailError: false,
              })
            }
            valid={!emailError}
          />
          {this.renderEmailError()}
        </InputWrapper>
        <Button onClick={this.handleResetPasswordInit}>Continue</Button>
      </div>
    );

    if (submitted) {
      formSection = (
        <StatusText>
          If we found an account matching {email}, we've sent you password reset
          instructions. Remember to check your spam folder.
        </StatusText>
      );
    }

    return (
      <StyledLogin>
        <LoginPanel>
          <OverflowWrapper>
            <GradientBg />
          </OverflowWrapper>
          <FormWrapper>
            <Logo src={logo} />
            <Prompt>Reset Password</Prompt>
            <DarkMatter />
            {formSection}
            <Helper>
              Don't have an account?
              <Link href="/register">Sign up</Link>
            </Helper>
          </FormWrapper>
        </LoginPanel>

        <Footer>
          © 2021 Porter Technologies Inc. •
          <Link
            href="https://docs.getporter.dev/docs/terms-of-service"
            target="_blank"
          >
            Terms & Privacy
          </Link>
        </Footer>
      </StyledLogin>
    );
  }
}

ResetPasswordInit.contextType = Context;

const Footer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  margin-bottom: 30px;
  width: 100vw;
  text-align: center;
  color: #aaaabb;
  font-size: 13px;
  padding-right: 8px;
  font: Work Sans, sans-serif;
`;

const DarkMatter = styled.div`
  margin-top: -10px;
`;

const Or = styled.div`
  position: absolute;
  width: 30px;
  text-align: center;
  background: #111114;
  z-index: 999;
  left: calc(50% - 15px);
  margin-top: -1px;
`;

const OrWrapper = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff44;
  font-size: 14px;
  position: relative;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  height: 100%;
`;

const Icon = styled.img`
  height: 18px;
  margin-right: 20px;
`;

const OAuthButton = styled.div`
  width: 200px;
  height: 30px;
  display: flex;
  background: #ffffff;
  align-items: center;
  border-radius: 3px;
  color: #000000;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  font-size: 13px;
  :hover {
    background: #ffffffdd;
  }
`;

const Link = styled.a`
  margin-left: 5px;
  color: #819bfd;
`;

const Helper = styled.div`
  position: absolute;
  bottom: 30px;
  width: 100%;
  text-align: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  color: #ffffff44;
`;

const OverflowWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 10px;
`;

const ErrorHelper = styled.div`
  position: absolute;
  right: -185px;
  top: 8px;
  height: 30px;
  width: 170px;
  user-select: none;
  background: #272731;
  font-family: "Work Sans", sans-serif;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff3b62;
  border-radius: 3px;

  > div {
    background: #272731;
    height: 15px;
    width: 15px;
    position: absolute;
    left: -3px;
    top: 7px;
    transform: rotate(45deg);
    z-index: -1;
  }
`;

const Line = styled.div`
  min-height: 3px;
  width: 100px;
  z-index: 999;
  background: #ffffff22;
  margin: 30px 0px 30px;
`;

const Button = styled.button`
  width: 200px;
  min-height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  cursor: pointer;
  margin-top: 9px;
  border-radius: 2px;
  border: 0;
  background: #819bfd;
  color: white;
  font-weight: 500;
  font-size: 14px;
`;

const InputWrapper = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 200px;
  font-family: "Work Sans", sans-serif;
  margin: 8px 0px;
  height: 30px;
  padding: 8px;
  background: #ffffff12;
  color: #ffffff;
  border: ${(props: { valid?: boolean }) =>
    props.valid ? "0" : "1px solid #ff3b62"};
  border-radius: 2px;
  font-size: 14px;
`;

const Prompt = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  font-size: 15px;
  margin-bottom: 18px;
`;

const Logo = styled.img`
  width: 140px;
  margin-top: 50px;
  margin-bottom: 75px;
  user-select: none;
`;

const StatusText = styled.div`
  padding: 18px 30px;
  font-family: "Work Sans", sans-serif;
  font-size: 14px;
  line-height: 160%;
`;

const FormWrapper = styled.div`
  width: calc(100% - 8px);
  height: calc(100% - 8px);
  background: #111114;
  z-index: 1;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const GradientBg = styled.div`
  background: linear-gradient(#8ce1ff, #a59eff, #fba8ff);
  width: 180%;
  height: 180%;
  position: absolute;
  top: -40%;
  left: -40%;
  animation: flip 6s infinite linear;
  @keyframes flip {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoginPanel = styled.div`
  width: 330px;
  height: 470px;
  background: white;
  margin-top: -20px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  position: relative;
  align-items: center;
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

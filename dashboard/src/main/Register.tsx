import React, { ChangeEvent, Component, useContext } from 'react';
import styled from 'styled-components';
import logo from 'assets/logo.png';

import api from 'shared/api';
import { emailRegex } from 'shared/regex';
import { Context } from 'shared/Context';

type PropsType = {
  authenticate: () => void
};

type StateType = {
  email: string,
  password: string,
  confirmPassword: string,
  emailError: boolean,
  confirmPasswordError: boolean
};

export default class Register extends Component<PropsType, StateType> {
  state = {
    email: '',
    password: '',
    confirmPassword: '',
    emailError: false,
    confirmPasswordError: false
  }

  handleKeyDown = (e: any) => {
    e.key === 'Enter' ? this.handleRegister() : null;
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  handleRegister = (): void => {
    let { email, password, confirmPassword } = this.state;
    let { authenticate } = this.props;
    let { setCurrentError, setUser } = this.context;

    if (!emailRegex.test(email)) {
      this.setState({ emailError: true });
    }

    if (confirmPassword !== password) {
      this.setState({ confirmPasswordError: true });
    }
    
    // Check for valid input
    if (emailRegex.test(email) && confirmPassword === password) {

      // Attempt user registration
      api.registerUser('', {
        email: email,
        password: password
      }, {}, (err: any, res: any) => {
        if (res?.data?.redirect) {
          window.location.href = res.data.redirect;
        } else {
          setUser(res?.data?.id, res?.data?.email)
          err ? setCurrentError(err.response.data.errors[0]) : authenticate();
        }
      });
    } 
  };

  renderEmailError = () => {
    let { emailError } = this.state;
    if (emailError) {
      return (
        <ErrorHelper><div />Please enter a valid email</ErrorHelper>
      );
    }
  }

  renderConfirmPasswordError = () => {
    let { confirmPasswordError } = this.state;
    if (confirmPasswordError) {
      return (
        <ErrorHelper><div />Passwords do not match</ErrorHelper>
      );
    }
  }

  render() {
    let { 
      email,
      password, 
      confirmPassword, 
      emailError,
      confirmPasswordError
    } = this.state;

    return (
      <StyledRegister>
        <LoginPanel>
          <OverflowWrapper>
            <GradientBg />
          </OverflowWrapper>
          <FormWrapper>
            <Logo src={logo} />
            <Line />
            <Prompt>Create Account</Prompt>
            <InputWrapper>
              <Input 
                type='email'
                placeholder='Email'
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => 
                  this.setState({ email: e.target.value, emailError: false })
                }
                valid={!emailError}
              />
              {this.renderEmailError()}
            </InputWrapper>
            <Input 
              type='password' 
              placeholder='Password'
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => 
                this.setState({ 
                  password: e.target.value,
                  confirmPasswordError: false
                })
              }
              valid={true}
            />
            <InputWrapper>
              <Input 
                type='password' 
                placeholder='Confirm Password'
                value={confirmPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => 
                  this.setState({ 
                    confirmPassword: e.target.value, 
                    confirmPasswordError: false 
                  })
                }
                valid={!confirmPasswordError}
              />
              {this.renderConfirmPasswordError()}
            </InputWrapper>
            <Button onClick={this.handleRegister}>Continue</Button>

            <Helper>Have an account?
              <Link href='/login'>Sign in</Link>
            </Helper>
          </FormWrapper>
        </LoginPanel>
      </StyledRegister>
    );
  }
}

Register.contextType = Context;

const Link = styled.a`
  margin-left: 5px;
  color: #819BFD;
`;

const Helper = styled.div`
  margin: 30px 0px 20px;
  font-size: 14px;
  font-family: 'Work Sans', sans-serif;
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

const InputWrapper = styled.div`
  position: relative;
`;

const ErrorHelper = styled.div`
  position: absolute;
  right: -185px;
  top: 8px;
  height: 30px;
  width: 170px;
  user-select: none;
  background: #272731;
  font-family: 'Work Sans', sans-serif;
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
  height: 3px;
  width: 100px;
  background: #ffffff22;
  margin: 35px 0px 30px;
`;

const Button = styled.button`
  width: 200px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Work Sans', sans-serif;
  cursor: pointer;
  margin-top: 25px;
  border-radius: 2px;
  border: 0;
  background: #819BFD;
  color: white;
  font-weight: 500;
  font-size: 14px;
`;

const Input = styled.input`
  width: 200px;
  font-family: 'Work Sans', sans-serif;
  margin: 8px 0px;
  height: 30px;
  padding: 8px;
  background: #ffffff12;
  color: #ffffff;
  border: ${(props: { valid?: boolean }) => props.valid ? '0' : '1px solid #ff3b62'};
  border-radius: 2px;
  font-size: 14px
`;

const Prompt = styled.div`
  font-family: 'Work Sans', sans-serif;
  font-weight: 500;
  font-size: 15px;
  margin-bottom: 18px;
`;

const Logo = styled.img`
  width: 150px;
  margin-top: 40px;
  user-select: none;
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
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const LoginPanel = styled.div`
  width: 330px;
  height: 450px;
  background: white;
  margin-top: -20px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  position: relative;
  align-items: center;
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

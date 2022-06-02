import React, { useContext, useState } from "react";
import styled from "styled-components";
import { CSSTransition } from "react-transition-group";
import api from "shared/api";

import { Context } from "shared/Context";

type Props = {
  closeForm: () => void;
};

type StateType = {
  active: boolean;
};

const WelcomeForm: React.FunctionComponent<Props> = ({}) => {
  const context = useContext(Context);
  const [active, setActive] = useState(true);
  const [isCompany, setIsCompany] = useState(false);
  const [role, setRole] = useState("unspecified");
  const [company, setCompany] = useState("");

  const submitForm = () => {
    api
      .postWelcome(
        "<token>",
        {
          email: context.user && context.user.email,
          isCompany,
          company,
          role,
        },
        {}
      )
      .then(() => {
        localStorage.setItem("welcomed", "true");
        setActive(false);
      })
      .catch((err) => console.log(err));
  };

  const renderContents = () => {
    if (isCompany) {
      return (
        <FadeWrapper>
          <Title>Welcome to Porter</Title>
          <Subtitle>Just two things before getting started.</Subtitle>
          <SubtitleAlt>
            <Num>1</Num> What is your company website? *
          </SubtitleAlt>
          <Input
            placeholder="ex: https://porter.run"
            value={company}
            onChange={(e: any) => setCompany(e.target.value)}
          />
          <SubtitleAlt>
            <Num>2</Num> What is your role? *
          </SubtitleAlt>
          <RadioButton
            onClick={() => setRole("founder")}
            selected={role === "founder"}
          >
            <i className="material-icons-round">
              {role === "founder" ? "check_box" : "check_box_outline_blank"}
            </i>{" "}
            Founder
          </RadioButton>
          <RadioButton
            onClick={() => setRole("developer")}
            selected={role === "developer"}
          >
            <i className="material-icons-round">
              {role === "developer" ? "check_box" : "check_box_outline_blank"}
            </i>{" "}
            Developer
          </RadioButton>
          <RadioButton
            onClick={() => setRole("devops")}
            selected={role === "devops"}
          >
            <i className="material-icons-round">
              {role === "devops" ? "check_box" : "check_box_outline_blank"}
            </i>{" "}
            DevOps
          </RadioButton>

          <Submit
            isDisabled={!company || role === "unspecified"}
            onClick={() => company && role !== "unspecified" && submitForm()}
          >
            <i className="material-icons-round">check</i> Done
          </Submit>
        </FadeWrapper>
      );
    }
    return (
      <>
        <Title>Welcome to Porter</Title>
        <Subtitle delay="0.7s">I am interested in using Porter as:</Subtitle>
        <Option onClick={() => setIsCompany(true)}>
          <i className="material-icons-round">people</i> A Company
        </Option>
        <Option onClick={() => submitForm()}>
          <i className="material-icons-round">person</i> An Individual
        </Option>
      </>
    );
  };

  return (
    <CSSTransition
      in={active}
      timeout={500}
      classNames="alert"
      unmountOnExit
      onEnter={() => setActive(true)}
      onExited={() => setActive(false)}
    >
      <StyledWelcomeForm>
        <div>
          {renderContents()}
          <br />
          <br />
        </div>
      </StyledWelcomeForm>
    </CSSTransition>
  );
};

export default WelcomeForm;

const Circle = styled.div`
  width: 13px;
  height: 13px;
  border-radius: 20px;
  background: #ffffff11;
  margin-right: 12px;
  border: 1px solid #aaaabb;
`;

const FadeWrapper = styled.div`
  background: #202227;
  opacity: 0;
  animation: fadeIn 0.7s 0s;
  animation-fill-mode: forwards;
`;

const Num = styled.div`
  display: flex;
  align-items: center;
  margin-right: 15px;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #ffffff;
`;

const Option = styled.div`
  width: 500px;
  max-width: 80vw;
  height: 50px;
  background: #ffffff22;
  display: flex;
  align-items: center;
  margin-top: 15px;
  border: 1px solid #aaaabb;
  border-radius: 5px;
  padding-left: 15px;
  cursor: pointer;
  :hover {
    background: #ffffff44;
  }

  > i {
    font-size: 20px;
    margin-right: 12px;
    color: #aaaabb;
  }

  opacity: 0;
  animation: slideIn 0.7s 1.3s;
  animation-fill-mode: forwards;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const Submit = styled(Option)<{ isDisabled: boolean }>`
  border: 0;
  opacity: 0;
  animation: fadeIn 0.7s 0.5s;
  animation-fill-mode: forwards;
  margin-top: 35px;
  cursor: ${(props) => (props.isDisabled ? "not-allowed" : "pointer")};
  background: ${(props) => (props.isDisabled ? "#aaaabb" : "#616FEEcc")};
  :hover {
    filter: ${(props) => (props.isDisabled ? "" : "brightness(130%)")};
    background: ${(props) => (props.isDisabled ? "#aaaabb" : "#616FEEcc")};
  }

  > i {
    color: #ffffff;
  }
`;

const RadioButton = styled(Option)<{ selected: boolean }>`
  opacity: 0;
  background: ${(props) => (props.selected ? "#ffffff44" : "#ffffff22")};
  animation: fadeIn 0.5s 0.2s;
  animation-fill-mode: forwards;

  > div {
    background: ${(props) => (props.selected ? "#ffffff44" : "")};
  }
`;

const Input = styled.input`
  width: 500px;
  max-width: 80vw;
  height: 50px;
  background: #ffffff22;
  font-size: 18px;
  display: flex;
  align-items: center;
  margin-top: 0px;
  color: #ffffff;
  border: 1px solid #aaaabb;
  border-radius: 5px;
  padding-left: 15px;
  margin-bottom: 40px;

  opacity: 0;
  animation: fadeIn 0.5s 0.2s;
  animation-fill-mode: forwards;
`;

const Subtitle = styled.div<{ delay?: string }>`
  margin: 20px 0 30px;
  color: #aaaabb;

  opacity: 0;
  animation: fadeIn 0.5s ${(props) => props.delay || "0.2s"};
  animation-fill-mode: forwards;
`;

const SubtitleAlt = styled(Subtitle)`
  margin: -5px 0 30px;
  color: white;
  display: flex;
  align-items: center;
  animation: fadeIn 0.5s 0.2s;
  animation-fill-mode: forwards;
`;

const Title = styled.div`
  color: white;

  font-size: 26px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;

  opacity: 0;
  animation: fadeIn 0.5s 0.2s;
  animation-fill-mode: forwards;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StyledWelcomeForm = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  background: #202227;

  &.alert-exit {
    opacity: 1;
  }
  &.alert-exit-active {
    opacity: 0;
    transform: translateY(-100px);
    transition: opacity 500ms, transform 1000ms;
  }
`;

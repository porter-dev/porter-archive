import React, { useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { CSSTransition } from "react-transition-group";

const WelcomeForm = (props: any) => {
  const queryParams = new URLSearchParams(window.location.search);
  const initEmail = queryParams.get("email");
  const [active, setActive] = useState(true);
  const [company, setCompany] = useState("");
  const [companySite, setCompanySite] = useState("");
  const [email, setEmail] = useState(initEmail || "");
  const [isDone, setIsDone] = useState(false);

  const encode = (data: any) => {
    return Object.keys(data)
      .map(
        (key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
      )
      .join("&");
  };

  const submitForm = (e: any) => {
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode({
        "form-name": "demo",
        email,
        company,
        website: companySite,
      }),
    })
      .then(() => {
        setIsDone(true);
        axios.post(
          process.env.DISCORD_WEBHOOK_URL,
          {
            username: "Demo Request",
            content: `**${email}** from **${company}** (website: ${companySite})`,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        axios.get(process.env.ZAPIER_WEBHOOK_URL, {
          params: {
            email,
            isCompany: true,
            company: `${company} - ${companySite}`,
            role: "**Requesting Demo**",
          },
        });
      })
      .catch((error) => alert(error));

    e.preventDefault();
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
        {isDone ? (
          <div>
            <Title>Your response has been recorded.</Title>
            <Subtitle>We'll be in touch shortly!</Subtitle>
          </div>
        ) : (
          <form name="demo" onSubmit={submitForm}>
            <Title>Book a Demo</Title>
            <Subtitle>
              Talk to an expert to determine if Porter is a right fit for you.
            </Subtitle>
            <SubtitleAlt>
              <Num>1</Num> What is your work email? *
            </SubtitleAlt>
            <Input
              type="email"
              placeholder="ex: sophon@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <SubtitleAlt>
              <Num>2</Num> What is your company name? *
            </SubtitleAlt>
            <Input
              type="text"
              placeholder="ex: Acme"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <SubtitleAlt>
              <Num>3</Num> What is your company website? *
            </SubtitleAlt>
            <Input
              type="text"
              name="website"
              placeholder="ex: https://acme.com"
              value={companySite}
              onChange={(e) => setCompanySite(e.target.value)}
            />
            <Submit
              type="submit"
              value="Done"
              disabled={!company || !email || !companySite}
            />
          </form>
        )}
      </StyledWelcomeForm>
    </CSSTransition>
  );
};

export default WelcomeForm;

const Hamburger = styled.div`
  width: 45px;
  margin-right: -5px;
  position: fixed;
  cursor: pointer;
  top: 30px;
  right: 30px;
  z-index: 999;
  height: 45px;
  border-radius: 100px;
  border: 2px solid #aaaabb;
  background: #ffffff33;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    background: #ffffff44;
    width: 45px;
    height: 45px;
  }
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

const Option = styled.input`
  width: 500px;
  max-width: 80vw;
  height: 50px;
  background: #ffffff22;
  display: flex;
  align-items: center;
  margin-top: 15px;
  color: #ffffff;
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

const Submit = styled(Option)`
  border: 0;
  opacity: 0;
  user-select: none;
  animation: fadeIn 0.7s 0.3s;
  animation-fill-mode: forwards;
  margin-top: 35px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  background: ${(props) => (props.disabled ? "#aaaabb" : "#616FEEcc")};
  :hover {
    filter: ${(props) => (props.disabled ? "" : "brightness(130%)")};
    background: ${(props) => (props.disabled ? "#aaaabb" : "#616FEEcc")};
  }

  > i {
    color: #ffffff;
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

const Subtitle = styled.div`
  margin: 20px 0 30px;
  color: #aaaabb;

  opacity: 0;
  animation: fadeIn 0.5s 0.2s;
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
  margin-top: -10px;

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
  font-family: "Work Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;

  &.alert-exit {
    opacity: 1;
  }
  &.alert-exit-active {
    opacity: 0;
    transform: translateY(-100px);
    transition: opacity 500ms, transform 1000ms;
  }
`;

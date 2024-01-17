import React, { useState } from "react";
import { emailRegex } from "shared/regex";
import { type Soc2Data } from "shared/types";
import styled from "styled-components";
import Button from "./porter/Button";
import Input from "./porter/Input";
import Spacer from "./porter/Spacer";
import Text from "./porter/Text";

type Props = {
  enabled: boolean;
  emails: string[];
  setSoc2Data: (x: Soc2Data) => void;
  soc2CheckKey: string;
};

const SOC2EmailComponent: React.FC<Props> = ({ emails, setSoc2Data, soc2CheckKey }) => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);

  const addEmail = (): void => {
    if (emailRegex.test(email)) {
      const updatedEmails = [...emails, email];

      setSoc2Data((prev) => ({
        ...prev,
        soc2_checks: {
          ...prev.soc2_checks,
          [soc2CheckKey]: {
            ...prev.soc2_checks[soc2CheckKey],
            email: updatedEmails,
          },
        },
      }));
      setEmail('');
    } else {
      setEmailError(true);
    }
  };

  const deleteEmail = (emailToDelete: string): void => {
    const updatedEmails = emails.filter(e => e !== emailToDelete);
    setSoc2Data((prev) => ({
      ...prev,
      soc2_checks: {
        ...prev.soc2_checks,
        [soc2CheckKey]: {
          ...prev.soc2_checks[soc2CheckKey],
          email: updatedEmails,
        },
      },
    }));
  };

  return (
    <>
      <div>
        <Input
          type="email"
          label="REQUIRED: Enter email to receive SOC2 Alerts"
          placeholder="Email"
          value={email}
          setValue={(x) => {
            setEmail(x);
            setEmailError(false);
          }}
          width="60%"
          error={emailError && "Please enter a valid email"}
        />
        <Spacer inline x={0.5} />
        <Button onClick={addEmail} width="10%">
          Add Email
        </Button>
      </div>
      <Spacer y={1} />
      <div>
        {emails.length > 0 && <Text color="helper">Subscribers: </Text>}
        {emails.map((email, index) => (
          <EmailItem key={index}>
            <Text size={13}>{email}</Text>
            <DeleteButton onClick={() => deleteEmail(email)}>
              <i className="material-icons">delete</i>
            </DeleteButton>
          </EmailItem>
        ))}
      </div>
    </>
  );
};

export default SOC2EmailComponent;


const DeleteButton = styled.div`
  display: flex;
  visibility: ${(props: { invis?: boolean }) =>
    props.invis ? "hidden" : "visible"};
  align-items: center;
  justify-content: center;
  width: 30px;
  margin-right: 15px;
  float: right;
  height: 30px;
  :hover {
    background: #ffffff11;
    border-radius: 20px;
    cursor: pointer;
  }

  > i {
    font-size: 20px;
    color: #ffffff44;
    border-radius: 20px;
  }
`;

const EmailItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px;
  margin-bottom: 5px;
  border-radius: 4px;
  max-width: 38%;

`;

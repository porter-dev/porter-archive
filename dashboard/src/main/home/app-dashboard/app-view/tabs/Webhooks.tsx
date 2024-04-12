import React, { useState } from "react";
import styled from "styled-components";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";

type Webhook = {
  step: string;
  status: string;
  url: string;
};

const stepOptions = [
  { value: "build", label: "Build" },
  { value: "deploy", label: "Deploy" },
  { value: "predeploy", label: "Predeploy" },
];

const statusOptions = [
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "canceled", label: "Canceled" },
];

const Webhooks: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);

  const addWebhook = (): void => {
    setWebhooks([
      ...webhooks,
      {
        step: "deploy",
        status: "success",
        url: "",
      },
    ]);
  };

  return (
    <StyledWebhooks>
      {webhooks.map((webhook, i) => (
        <>
          <WebhookWrapper key={i}>
            <Container row>
              <Select
                value={webhook.step}
                options={stepOptions}
                width="110px"
              />
              <Spacer x={0.5} inline />
              <Select
                value={webhook.status}
                options={statusOptions}
                width="110px"
              />
              <Spacer x={0.5} inline />
            </Container>
            <Input
              value={webhook.url}
              setValue={(url) => {
                console.log("srnt");
              }}
              placeholder="https://example.com/your-webhook"
              width="calc(100%)"
            />
            <DeleteButton
              onClick={() => {
                setWebhooks(webhooks.filter((_, index) => index !== i));
              }}
            >
              <i className="material-icons">cancel</i>
            </DeleteButton>
          </WebhookWrapper>
          {i === webhooks.length - 1 && <Spacer y={0.5} />}
        </>
      ))}
      <Button alt onClick={addWebhook}>
        <I className="material-icons">add</I> Add row
      </Button>
    </StyledWebhooks>
  );
};

export default Webhooks;

const StyledWebhooks = styled.div``;

const DeleteButton = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  margin-top: 7px;
  margin-left: 8px;
  justify-content: center;

  > i {
    font-size: 17px;
    color: #ffffff44;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    :hover {
      color: #ffffff88;
    }
  }
`;

const WebhookWrapper = styled.div`
  display: flex;
  height: 30px;
  width: 850px;
  max-width: 100%;
  margin-bottom: 10px;
`;

const I = styled.i`
  font-size: 16px;
  margin-right: 7px;
`;

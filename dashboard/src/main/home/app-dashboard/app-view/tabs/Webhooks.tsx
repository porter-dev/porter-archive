import React, { useState } from "react";
import styled from "styled-components";

import Button from "components/porter/Button";
import Checkbox from "components/porter/Checkbox";
import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

type Webhook = {
  step: string;
  status: string;
  url: string;
  secret: string;
  hasSecret: boolean;
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
        secret: "",
        hasSecret: false,
      },
    ]);
  };

  // TODO: implement
  const saveWebhooks = (): void => {};

  return (
    <StyledWebhooks>
      {webhooks.map((webhook, i) => (
        <>
          <WebhookWrapper key={i}>
            <Container row>
              <Select
                value={webhook.step}
                setValue={(value) => {
                  const newWebhooks = [...webhooks];
                  newWebhooks[i].step = value;
                  setWebhooks(newWebhooks);
                }}
                options={stepOptions}
                width="110px"
              />
              <Spacer x={0.5} inline />
              <Select
                value={webhook.status}
                setValue={(value) => {
                  const newWebhooks = [...webhooks];
                  newWebhooks[i].status = value;
                  setWebhooks(newWebhooks);
                }}
                options={statusOptions}
                width="110px"
              />
              <Spacer x={0.5} inline />
            </Container>
            <Input
              value={webhook.url}
              setValue={(url) => {
                const newWebhooks = [...webhooks];
                newWebhooks[i].url = url;
                setWebhooks(newWebhooks);
              }}
              placeholder="https://example.com/your-webhook"
              width="calc(100%)"
            />
            <Spacer x={1} inline />
            <SecretWrapper hasSecret={webhook.hasSecret}>
              <Container row style={{ minWidth: "120px" }}>
                <Checkbox
                  checked={webhook.hasSecret}
                  toggleChecked={() => {
                    const newWebhooks = [...webhooks];
                    newWebhooks[i].hasSecret = !newWebhooks[i].hasSecret;
                    newWebhooks[i].secret = "";
                    setWebhooks(newWebhooks);
                  }}
                >
                  <Text size={13}>Enable secret</Text>
                </Checkbox>
              </Container>
              {webhook.hasSecret && (
                <>
                  <Bar />
                  <Input
                    style={{
                      border: "none",
                      height: "calc(100% - 2px)",
                    }}
                    value={webhook.secret}
                    setValue={(secret) => {
                      const newWebhooks = [...webhooks];
                      newWebhooks[i].secret = secret;
                      setWebhooks(newWebhooks);
                    }}
                    placeholder="ex: your-secret-key"
                    width="100%"
                  />
                </>
              )}
            </SecretWrapper>
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
      <Container row>
        <Button alt onClick={addWebhook}>
          <I className="material-icons">add</I> Add row
        </Button>
        <Spacer x={1} inline />
        <Button onClick={saveWebhooks}>Save webhooks</Button>
      </Container>
    </StyledWebhooks>
  );
};

export default Webhooks;

const Bar = styled.div`
  width: 1px;
  height: 15px;
  background: #494b4f;
`;

const SecretWrapper = styled.div<{ hasSecret: boolean }>`
  display: flex;
  align-items: center;
  background: ${(props) => props.theme.fg};
  border: 1px solid #494b4f;
  padding-left: 8px;
  border-radius: 5px;
  height: 30px;
  justify-content: space-between;
  width: ${(props) => (props.hasSecret ? "600px" : "200px")};
  transition: all 0.2s;
`;

const StyledWebhooks = styled.div``;

const DeleteButton = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  margin-top: 8px;
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
  width: 1500px;
  max-width: 100%;
  margin-bottom: 10px;
`;

const I = styled.i`
  font-size: 16px;
  margin-right: 7px;
`;

import Helper from "components/form-components/Helper";
import React, { useContext } from "react";
import { Context } from "shared/Context";
import styled from "styled-components";

const ConnectToDatabaseInstructionsModal = () => {
  const { currentModalData } = useContext(Context);

  return (
    <Container>
      In order to get connection credentials for your RDS Postgres database,
      select <b>Load from Env Group</b> when launching or updating your
      application. Then, select the rds-credentials-{currentModalData?.name} env
      group.
      <p>
        This will set the following environment variables in your application:
      </p>
      <CodeBlock>
        <span>- PGHOST</span>
        <span>- PGPORT</span>
        <span>- PGUSER</span>
        <span>- PGPASSWORD</span>
      </CodeBlock>
      <Helper>Note: the database automatically listens on port 5432.</Helper>
    </Container>
  );
};

export default ConnectToDatabaseInstructionsModal;

const CodeBlock = styled.span`
  display: block;
  background-color: #1b1d26;
  color: white;
  border-radius: 5px;
  font-family: monospace;
  user-select: text;
  max-height: 400px;
  width: 90%;
  margin-left: 5%;
  margin-top: 20px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 10px;
  overflow-wrap: break-word;
  > span {
    display: block;
  }
`;

const Container = styled.div`
  margin-top: 30px;
  line-height: 1.3rem;
`;

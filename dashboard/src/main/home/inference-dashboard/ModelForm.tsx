import React from "react";
import { useHistory, useParams } from "react-router";
import { match } from "ts-pattern";

import Back from "components/porter/Back";
import CenterWrapper from "components/porter/CenterWrapper";
import DashboardHeader from "components/porter/DashboardHeader";

import Gpt2Form from "./TemplateForms/Gpt2Form";

const InferenceForm: React.FC = () => {
  const { templateId } = useParams<{
    templateId: string;
  }>();
  const history = useHistory();

  const renderForm = (): React.ReactElement => {
    return match(templateId)
      .returnType<JSX.Element>()
      .with("gpt-2", () => <Gpt2Form />)
      .otherwise(() => <div>Template not found</div>);
  };

  return (
    <CenterWrapper>
      <Back
        onClick={() => {
          history.push(`/inference`);
        }}
      />
      <DashboardHeader
        title={<div>Configure new {templateId} instance</div>}
        capitalize={false}
      />
      {renderForm()}
    </CenterWrapper>
  );
};

export default InferenceForm;

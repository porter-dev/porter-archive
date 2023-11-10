import React, { useState } from "react";
import styled from "styled-components";
import Modal from "main/home/modals/Modal";
import EnvEditorModal from "main/home/modals/EnvEditorModal";

import upload from "assets/upload.svg";
import { dotenv_parse } from "shared/string_utils";
import { type NewPopulatedEnvGroup } from "components/porter-form/types";
import Spacer from "components/porter/Spacer";
import { type PorterAppFormData } from "lib/porter-apps";
import { useFormContext, useFieldArray } from "react-hook-form";
import EnvVarRow from "./EnvVarRow";

export type KeyValueType = {
  key: string;
  value: string;
  hidden: boolean;
  locked: boolean;
  deleted: boolean;
};

type PropsType = {
  syncedEnvGroups?: NewPopulatedEnvGroup[];
};

const EnvVariables = ({
  syncedEnvGroups
}: PropsType) => {
  const [showEditorModal, setShowEditorModal] = useState(false);

  const { control: appControl } = useFormContext<PorterAppFormData>();

  const { append, remove, update, fields: environmentVariables } = useFieldArray({
    control: appControl,
    name: "app.env",
  });

  const isKeyOverriding = (key: string): boolean => {
    if (!syncedEnvGroups) return false;
    return syncedEnvGroups.some(envGroup =>
      key in envGroup.variables || key in envGroup?.secret_variables
    );
  };

  const invalidKey = (key: string): boolean => {
    const isValid = /^[A-Za-z]/.test(key);

    return isValid;
  };


  const readFile = (env: string) => {
    const envObj = dotenv_parse(env);
    for (const key in envObj) {
      const match = environmentVariables.find(envVar => envVar.key === key);
      if (match && !match.deleted) {
        const index = environmentVariables.indexOf(match);
        update(index, { ...match, value: envObj[key] });
      } else {
        append({
          key,
          value: envObj[key],
          hidden: false,
          locked: false,
          deleted: false,
        })
      }
    }
  };

  return (
    <>
      <StyledInputArray>
        {environmentVariables.map((entry, i) =>
          <EnvVarRow
            key={entry.id}
            entry={entry}
            index={i}
            remove={() => { remove(i); }}
            isKeyOverriding={isKeyOverriding}
            invalidKey={invalidKey}
          />
        )}
        <InputWrapper>
          <AddRowButton
            onClick={() => {
              append({
                key: "",
                value: "",
                hidden: false,
                locked: false,
                deleted: false,
              })
            }}
          >
            <i className="material-icons">add</i> Add Row
          </AddRowButton>
          <Spacer x={0.5} inline />
          <UploadButton
            onClick={() => {
              setShowEditorModal(true);
            }}
          >
            <img src={upload} alt="Upload" /> Copy from File
          </UploadButton>
        </InputWrapper>
      </StyledInputArray>
      {showEditorModal && (
        <Modal
          onRequestClose={() => { setShowEditorModal(false); }}
          width="60%"
          height="650px"
        >
          <EnvEditorModal
            closeModal={() => { setShowEditorModal(false); }}
            setEnvVariables={(envFile: string) => { readFile(envFile); }}
          />
        </Modal>
      )}
    </>
  );
};

export default EnvVariables;


const AddRowButton = styled.div`
  display: flex;
  align-items: center;
  width: 270px;
  font-size: 13px;
  color: #aaaabb;
  height: 32px;
  border-radius: 3px;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
  }

  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const UploadButton = styled(AddRowButton)`
  background: none;
  position: relative;
  border: 1px solid #ffffff55;
  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  > img {
    width: 14px;
    margin-left: 10px;
    margin-right: 12px;
  }
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
`;

const StyledInputArray = styled.div`
  margin-bottom: 15px;
  margin-top: 22px;
`;

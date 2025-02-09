import React, { useState } from "react";
import upload from "legacy/assets/upload.svg";
import { type NewPopulatedEnvGroup } from "legacy/components/porter-form/types";
import Button from "legacy/components/porter/Button";
import Image from "legacy/components/porter/Image";
import Spacer from "legacy/components/porter/Spacer";
import { type PorterAppFormData } from "legacy/lib/porter-apps";
import { dotenv_parse } from "legacy/shared/string_utils";
import { useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import EnvEditorModal from "main/home/modals/EnvEditorModal";
import Modal from "main/home/modals/Modal";

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

const EnvVariables = ({ syncedEnvGroups }: PropsType) => {
  const [showEditorModal, setShowEditorModal] = useState(false);

  const { control: appControl } = useFormContext<PorterAppFormData>();

  const {
    append,
    remove,
    update,
    fields: environmentVariables,
  } = useFieldArray({
    control: appControl,
    name: "app.env",
  });

  const isKeyOverriding = (key: string): boolean => {
    if (!syncedEnvGroups) return false;
    return syncedEnvGroups.some(
      (envGroup) =>
        key in (envGroup.variables || []) ||
        key in (envGroup.secret_variables || [])
    );
  };

  const readFile = (env: string): void => {
    const envObj = dotenv_parse(env);
    for (const key in envObj) {
      const match = environmentVariables.find((envVar) => envVar.key === key);
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
        });
      }
    }
  };

  return (
    <>
      {environmentVariables.length > 0 && (
        <List>
          {environmentVariables.map((entry, i) => (
            <EnvVarRow
              key={entry.id}
              entry={entry}
              index={i}
              remove={() => {
                remove(i);
              }}
              isKeyOverriding={isKeyOverriding}
            />
          ))}
        </List>
      )}
      <InputWrapper>
        <Button
          alt
          onClick={() => {
            append({
              key: "",
              value: "",
              hidden: false,
              locked: false,
              deleted: false,
            });
          }}
        >
          <I className="material-icons">add</I> Add row
        </Button>
        <Spacer x={0.5} inline />
        <Button
          alt
          onClick={() => {
            setShowEditorModal(true);
          }}
        >
          <Image src={upload} size={16} />
          <Spacer inline x={0.5} />
          Copy from file
        </Button>
      </InputWrapper>
      {showEditorModal && (
        <Modal
          onRequestClose={() => {
            setShowEditorModal(false);
          }}
          width="60%"
          height="650px"
        >
          <EnvEditorModal
            closeModal={() => {
              setShowEditorModal(false);
            }}
            setEnvVariables={(envFile: string) => {
              readFile(envFile);
            }}
          />
        </Modal>
      )}
    </>
  );
};

export default EnvVariables;

const List = styled.div`
  gap: 10px;
  display: flex;
  flex-direction: column;
  margin-bottom: 25px;
`;

const I = styled.i`
  font-size: 16px;
  margin-right: 7px;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`;

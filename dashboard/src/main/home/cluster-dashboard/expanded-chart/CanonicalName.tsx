import React, { useContext, useMemo, useState } from "react";
import styled from "styled-components";
import InputRow from "components/form-components/InputRow";
import SaveButton from "components/SaveButton";
import api from "shared/api";
import Color from "color";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";
import { isAlphanumeric } from "shared/common";

type Props = {
  onSave: (() => void) | (() => Promise<void>);
  release: ChartType;
};

const CanonicalName = ({ onSave, release }: Props) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [buttonStatus, setButtonStatus] = useState("");
  const [canonicalName, setCanonicalName] = useState<string>(
    release.canonical_name
  );

  const handleSave = async () => {
    setButtonStatus("loading");

    try {
      await api.updateCanonicalName(
        "<token>",
        { canonical_name: canonicalName },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: release.namespace,
          release_name: release.name,
        }
      );
      await onSave();
      setButtonStatus("successful");
    } catch (error) {
      console.log(error);
      setCurrentError(
        "We couldn't change the canonical name. Please try again."
      );
      setButtonStatus("Canonical name not changed.");
      return;
    } finally {
      setTimeout(() => {
        setButtonStatus("");
      }, 800);
    }
  };

  const shouldDisableSave = useMemo(() => {
    if (canonicalName !== release.canonical_name) {
      if (canonicalName === "") {
        return false;
      }

      return !isAlphanumeric(canonicalName) || canonicalName.length > 63;
    }

    return true;
  }, [canonicalName]);

  const saveButtonHelper = useMemo(() => {
    if (canonicalName !== release.canonical_name) {
      if (canonicalName !== "") {
        if (!isAlphanumeric(canonicalName)) {
          return "Invalid characters in the name";
        } else if (canonicalName.length > 63) {
          return "Name cannot exceed 63 characters";
        }
      }

      return "Unsaved changes";
    }

    return "";
  }, [canonicalName]);

  return (
    <>
      <InputRow
        type="text"
        value={canonicalName}
        setValue={(x: string) => setCanonicalName(x)}
        placeholder="ex: my-app"
        isRequired={true}
        width={"100%"}
      />
      <Flex
        style={{
          marginTop: "25px",
        }}
      >
        <SaveButton
          helper={saveButtonHelper}
          clearPosition
          disabled={shouldDisableSave}
          statusPosition="right"
          text="Save changes"
          onClick={() => handleSave()}
          status={buttonStatus}
        ></SaveButton>
      </Flex>
      <Br />
    </>
  );
};

const Br = styled.div`
  width: 100%;
  height: 10px;
`;

export default CanonicalName;

const Flex = styled.div`
  display: flex;
  position: relative;
`;

const Tag = styled.div<{ color: string }>`
  display: inline-flex;
  color: ${(props) => Color(props.color).darken(0.4).string() || "inherit"};
  user-select: none;
  border: 1px solid ${(props) => Color(props.color).darken(0.4).string()};
  border-radius: 5px;
  padding: 4px 8px;
  position: relative;
  margin-bottom: 20px;
  text-align: center;
  align-items: center;
  font-size: 13px;
  background-color: ${(props) => props.color || "inherit"};

  max-width: 150px;
  min-width: 60px;

  :not(:last-child) {
    margin-right: 10px;
  }

  > .material-icons {
    font-size: 16px;
    :hover {
      cursor: pointer;
    }
  }
`;

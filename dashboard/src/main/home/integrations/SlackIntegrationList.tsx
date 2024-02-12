import React, { useContext, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useFieldArray, useForm } from "react-hook-form";
import styled from "styled-components";
import { match } from "ts-pattern";
import type { IterableElement } from "type-fest";
import { z } from "zod";

import ConfirmOverlay from "components/ConfirmOverlay";
import Loading from "components/Loading";
import Button from "components/porter/Button";
import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import Dropdown from "components/porter/Dropdown";
import Error from "components/porter/Error";
import Icon from "components/porter/Icon";
import SelectableList from "components/porter/SelectableList";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import {
  emptyNotificationConfig,
  notificationConfigFormValidator,
  type NotificationConfigFormData,
} from "lib/notifications/types";

import api from "shared/api";
import { Context } from "shared/Context";
import build from "assets/build.png";
import deploy from "assets/deploy.png";
import hash from "assets/hash-02.svg";
import pre_deploy from "assets/pre_deploy.png";
import save from "assets/save-01.svg";

type SlackIntegrationListProps = {
  slackData: any[];
};

const statusOptions = [
  { value: "successful", emoji: "✅", label: "Successful" },
  { value: "failed", emoji: "⚠️", label: "Failed" },
  { value: "progressing", emoji: "🚀", label: "Progressing" },
];

const typeOptions = [
  { value: "deployment", icon: deploy, label: "Deploy" },
  { value: "pre-deploy", icon: pre_deploy, label: "Pre-deploy" },
  { value: "build", icon: build, label: "Build" },
];

const SlackIntegrationList: React.FC<SlackIntegrationListProps> = (props) => {
  const [isDelete, setIsDelete] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(-1); // guaranteed to be set when used
  const { currentProject, setCurrentError } = useContext(Context);
  const deleted = useRef(new Set());

  const handleDelete = (): void => {
    api
      .deleteSlackIntegration(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          slack_integration_id: props.slackData[deleteIndex].id,
        }
      )
      .then(() => {
        deleted.current.add(deleteIndex);
        setIsDelete(false);
      })
      .catch((err) => {
        setCurrentError(err);
      });
  };

  return (
    <>
      <ConfirmOverlay
        show={isDelete}
        message={
          deleteIndex !== -1 &&
          `Are you sure you want to delete the slack integration for team ${
            props.slackData[deleteIndex].team_name ||
            props.slackData[deleteIndex].team_id
          } in channel ${props.slackData[deleteIndex].channel}?`
        }
        onYes={handleDelete}
        onNo={() => {
          setIsDelete(false);
        }}
      />
      <StyledIntegrationList>
        {props.slackData?.length > 0 ? (
          props.slackData.map((inst, idx) => {
            if (deleted.current.has(idx)) return null;
            return (
              <>
                <SlackIntegration
                  projectID={currentProject.id}
                  key={idx.toString()}
                  idx={idx}
                  deleteIndex={(index: number) => {
                    setDeleteIndex(index);
                    setIsDelete(true);
                  }}
                  inst={inst}
                />
                <Spacer y={0.5} />
              </>
            );
          })
        ) : (
          <Placeholder>No Slack integrations set up yet.</Placeholder>
        )}
      </StyledIntegrationList>
    </>
  );
};

export default SlackIntegrationList;

type SlackIntegrationProps = {
  projectID: number;
  idx: number;
  inst: any;
  deleteIndex: (index: number) => void;
};

const SlackIntegration: React.FC<SlackIntegrationProps> = ({
  projectID,
  idx,
  inst,
  deleteIndex,
}) => {
  return (
    <Dropdown
      key={idx.toString()}
      title={inst.team_name || inst.team_id}
      tag={
        <Tag
          borderRadiusPixels={10}
          backgroundColor={"#55555555"}
          hoverColor={"#55555577"}
          borderColor={"#88888888"}
          onClick={() => {
            window.open(inst.configuration_url, "_blank");
          }}
        >
          <Container row>
            <Icon src={hash} height={"12px"} />
            <Spacer x={0.2} inline />
            <Text size={13} color="#eeeeeedd">
              {inst.channel.replace("#", "")}
            </Text>
          </Container>
        </Tag>
      }
      iconURL={inst.team_icon_url}
      deleteFunc={() => {
        deleteIndex(idx);
      }}
    >
      <SetupNotificationConfig
        projectID={projectID}
        slackIntegrationID={inst.id}
        notificationConfigID={inst.notification_config_id}
      />
    </Dropdown>
  );
};

type NotificationConfigContainerProps = {
  projectID: number;
  notificationConfigID: number;
  slackIntegrationID: number;
  existingConfig: NotificationConfigFormData;
};

const NotificationConfigContainer: React.FC<
  NotificationConfigContainerProps
> = ({
  projectID,
  notificationConfigID,
  slackIntegrationID,
  existingConfig,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const queryClient = useQueryClient();

  const notificationForm = useForm<NotificationConfigFormData>({
    resolver: zodResolver(notificationConfigFormValidator),
    reValidateMode: "onSubmit",
    defaultValues: existingConfig,
  });

  const {
    control,
    formState: { isSubmitting: isValidating, errors },
    register,
  } = notificationForm;

  const {
    append: statusAppend,
    remove: statusRemove,
    fields: statusFields,
  } = useFieldArray({
    control,
    name: "statuses",
  });

  const onAddStatuses = (
    inp: IterableElement<NotificationConfigFormData["statuses"]>
  ): void => {
    const previouslyAdded = statusFields.findIndex(
      (s) => s.status === inp.status
    );

    if (previouslyAdded === -1) {
      statusAppend(inp);
    }
  };

  const {
    append: typeAppend,
    remove: typeRemove,
    fields: typeFields,
  } = useFieldArray({
    control,
    name: "types",
  });

  const onAddTypes = (
    inp: IterableElement<NotificationConfigFormData["types"]>
  ): void => {
    const previouslyAdded = typeFields.findIndex((s) => s.type === inp.type);

    if (previouslyAdded === -1) {
      typeAppend(inp);
    }
  };

  const submitBtnStatus = useMemo(() => {
    if (isValidating || isUpdating) {
      return "loading";
    }

    if (updateError) {
      return <Error message={updateError} />;
    }

    if (isSuccessful) {
      return "success";
    }
  }, [isValidating, isUpdating, updateError, errors, isSuccessful]);

  const handleSubmit = notificationForm.handleSubmit(async (data) => {
    try {
      setIsUpdating(true);

      await api.updateNotificationConfig(
        "<token>",
        {
          slack_integration_id: slackIntegrationID,
          config: data,
        },
        {
          project_id: projectID,
          notification_config_id: notificationConfigID,
        }
      );
      await queryClient.invalidateQueries({
        queryKey: ["getNotificationConfig"],
      });
      setIsUpdating(false);
      setIsSuccessful(true);
    } catch (err) {
      setIsUpdating(false);
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setUpdateError(err.response?.data?.error);
        return;
      }
      setUpdateError(
        "An error occurred while updating your notification config. Please try again."
      );
    }
  });

  return (
    <>
      <Text>Filter notification types:</Text>
      <Spacer y={0.5} />
      <SelectableList
        scroll={false}
        listItems={typeOptions.map((option) => {
          const selectedOptionsIdx = typeFields.findIndex(
            (s) => s.type === option.value
          );
          return {
            selectable: (
              <Container row>
                <Spacer inline width="1px" />
                <Icon src={option.icon} width={"8px"} />
                <Spacer inline width="10px" />
                <Text size={12}>{option.label}</Text>
                <Spacer inline x={1} />
              </Container>
            ),
            key: option.value,
            onSelect: () => {
              onAddTypes({ type: option.value });
            },
            onDeselect: () => {
              typeRemove(selectedOptionsIdx);
            },
            isSelected: selectedOptionsIdx !== -1,
          };
        })}
      />
      <Spacer y={0.75} />
      <Text>Filter notification statuses:</Text>
      <Spacer y={0.5} />
      <SelectableList
        scroll={false}
        listItems={statusOptions.map((option) => {
          const selectedOptionsIdx = statusFields.findIndex(
            (s) => s.status === option.value
          );
          return {
            selectable: (
              <Container row>
                <Spacer inline width="1px" />
                <Text size={12}>
                  {option.emoji}
                  <Spacer inline x={0.7} />
                  {option.label}
                </Text>
                <Spacer inline x={1} />
              </Container>
            ),
            key: option.value,
            onSelect: () => {
              onAddStatuses({ status: option.value });
            },
            onDeselect: () => {
              statusRemove(selectedOptionsIdx);
            },
            isSelected: selectedOptionsIdx !== -1,
          };
        })}
      />
      <Spacer y={0.75} />
      <Text>@ Mention (only on failure):</Text>
      <Spacer y={0.5} />
      <ControlledInput
        placeholder="ex: oncall"
        type="text"
        width="300px"
        error={errors.mention?.message}
        {...register("mention")}
      />
      <Spacer y={0.75} />
      <form onSubmit={handleSubmit}>
        <Button
          type="submit"
          status={submitBtnStatus}
          loadingText={"Saving..."}
          onClick={handleSubmit}
          successText={"Saved!"}
          disabled={isUpdating}
        >
          <Icon src={save} height={"13px"} />
          <Spacer inline x={0.5} />
          Save
        </Button>
      </form>
    </>
  );
};

type SetupNotificationConfigProps = {
  projectID: number;
  notificationConfigID: number;
  slackIntegrationID: number;
};

const SetupNotificationConfig: React.FC<SetupNotificationConfigProps> = ({
  projectID,
  notificationConfigID,
  slackIntegrationID,
}) => {
  const configRes = useQuery(
    ["getNotificationConfig", projectID, notificationConfigID],
    async () => {
      if (notificationConfigID === 0) {
        return emptyNotificationConfig;
      }
      const res = await api.getNotificationConfig(
        "<token>",
        {},
        {
          project_id: projectID,
          notification_config_id: notificationConfigID,
        }
      );

      const object = await z
        .object({
          config: notificationConfigFormValidator,
        })
        .parseAsync(res.data);

      return object.config;
    }
  );

  return (
    <>
      {match(configRes)
        .with({ status: "loading" }, () => <Loading />)
        .with({ status: "success" }, ({ data }) => {
          return (
            <NotificationConfigContainer
              projectID={projectID}
              slackIntegrationID={slackIntegrationID}
              notificationConfigID={notificationConfigID}
              existingConfig={data}
            />
          );
        })
        .otherwise(() => null)}
    </>
  );
};

const Placeholder = styled.div`
  width: 100%;
  height: 250px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
  justify-content: center;
  color: #aaaabb;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
`;

const StyledIntegrationList = styled.div`
  margin-bottom: 80px;
`;

import React, { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import Helper from "components/form-components/Helper";
import Error from "components/porter/Error";
import { useQuery } from "@tanstack/react-query";
import api from "shared/api";
import {
  BUILDPACK_TO_NAME,
  Buildpack,
  DEFAULT_BUILDER_NAME,
  DEFAULT_HEROKU_STACK,
  DetectedBuildpack,
  detectedBuildpackSchema,
} from "main/home/app-dashboard/types/buildpack";
import { z } from "zod";
import Spacer from "components/porter/Spacer";
import Button from "components/porter/Button";
import BuildpackList from "./BuildpackList";
import BuildpackConfigurationModal from "./BuildpackConfigurationModal";
import { useFieldArray, useFormContext } from "react-hook-form";
import {
  BuildOptions,
  PorterAppFormData,
  SourceOptions,
} from "lib/porter-apps";

type Props = {
  projectId: number;
  build: BuildOptions & {
    method: "pack";
  };
  source: SourceOptions & { type: "github" };
  autoDetectionDisabled?: boolean;
};

const BuildpackSettings: React.FC<Props> = ({
  projectId,
  build,
  source,
  autoDetectionDisabled,
}) => {
  const [stackOptions, setStackOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableBuildpacks, setAvailableBuildpacks] = useState<Buildpack[]>(
    []
  );
  const { control, setValue } = useFormContext<PorterAppFormData>();
  const { replace } = useFieldArray({
    control,
    name: "app.build.buildpacks",
  });

  const { data, status, refetch } = useQuery(
    [
      "detectBuildpacks",
      projectId,
      source.git_repo_name,
      source.git_branch,
      build.context,
    ],
    async () => {
      const detectBuildPackRes = await api.detectBuildpack<DetectedBuildpack[]>(
        "<token>",
        {
          dir: build.context || ".",
        },
        {
          project_id: projectId,
          git_repo_id: source.git_repo_id,
          kind: "github",
          owner: source.git_repo_name.split("/")[0],
          name: source.git_repo_name.split("/")[1],
          branch: source.git_branch,
        }
      );

      const detectedBuildpacks = z
        .array(detectedBuildpackSchema)
        .parseAsync(detectBuildPackRes.data);

      return detectedBuildpacks;
    },
    {
      enabled: !autoDetectionDisabled,
    }
  );

  const errorMessage = useMemo(
    () =>
      status === "error"
        ? `Unable to detect buildpacks at path: ${build.context}. Please make sure your repo, branch, and application root path are all set correctly and attempt to detect again.`
        : "",
    [build.context]
  );

  useEffect(() => {
    if (autoDetectionDisabled) {
      // in this case, we are not detecting buildpacks, so we just populate based on the DB
      if (build.builder) {
        setValue("app.build.builder", build.builder);
        setStackOptions([{ label: build.builder, value: build.builder }]);
      }
      if (build.buildpacks.length) {
        const bps = build.buildpacks.map((bp) => ({
          name: BUILDPACK_TO_NAME[bp.buildpack] ?? bp.buildpack,
          buildpack: bp.buildpack,
        }));
        replace(bps);
      }
    } else {
      if (!data) {
        return;
      }

      if (data.length === 0) {
        return;
      }
      setStackOptions(
        data
          .flatMap((builder) => {
            return builder.builders.map((stack) => ({
              label: `${builder.name} - ${stack}`,
              value: stack.toLowerCase(),
            }));
          })
          .sort((a, b) => {
            if (a.label < b.label) {
              return -1;
            }
            if (a.label > b.label) {
              return 1;
            }
            return 0;
          })
      );

      const defaultBuilder =
        data.find(
          (builder) => builder.name.toLowerCase() === DEFAULT_BUILDER_NAME
        ) ?? data[0];

      const allBuildpacks = defaultBuilder.others.concat(
        defaultBuilder.detected
      );

      let detectedBuilder: string;
      if (
        defaultBuilder.builders.length &&
        defaultBuilder.builders.includes(DEFAULT_HEROKU_STACK)
      ) {
        setValue("app.build.builder", DEFAULT_HEROKU_STACK);
        detectedBuilder = DEFAULT_HEROKU_STACK;
      } else {
        setValue("app.build.builder", defaultBuilder.builders[0]);
        detectedBuilder = defaultBuilder.builders[0];
      }

      if (!autoDetectionDisabled) {
        setValue("app.build.builder", detectedBuilder);
        replace(
          defaultBuilder.detected.map((bp) => ({
            name: bp.name,
            buildpack: bp.buildpack,
          }))
        );
        setAvailableBuildpacks(defaultBuilder.others);
      } else {
        setValue("app.build.builder", detectedBuilder);
        setAvailableBuildpacks(
          allBuildpacks.filter(
            (bp) => !build.buildpacks.some((b) => b.buildpack === bp.buildpack)
          )
        );
      }
    }
  }, [data]);

  return (
    <BuildpackConfigurationContainer>
      {build.buildpacks.length > 0 && (
        <>
          <Helper>
            The following buildpacks were automatically detected. You can also
            manually add, remove, or re-order buildpacks here.
          </Helper>
          <BuildpackList
            build={build}
            availableBuildpacks={availableBuildpacks}
            setAvailableBuildpacks={setAvailableBuildpacks}
            showAvailableBuildpacks={false}
            isDetectingBuildpacks={status === "loading"}
            detectBuildpacksError={errorMessage}
            droppableId={"non-modal"}
          />
        </>
      )}
      {!autoDetectionDisabled && status === "error" && (
        <>
          <Spacer y={1} />
          <Error
            message={`Unable to detect buildpacks at path: ${build.context}. Please make sure your repo, branch, and application root path are all set correctly and attempt to detect again.`}
          />
        </>
      )}
      <Spacer y={1} />
      <Button
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        <I className="material-icons">add</I> Add / detect buildpacks
      </Button>
      {isModalOpen && (
        <BuildpackConfigurationModal
          build={build}
          closeModal={() => setIsModalOpen(false)}
          sortedStackOptions={stackOptions}
          availableBuildpacks={availableBuildpacks}
          setAvailableBuildpacks={setAvailableBuildpacks}
          isDetectingBuildpacks={status === "loading"}
          detectBuildpacksError={errorMessage}
          detectAndSetBuildPacks={refetch}
        />
      )}
    </BuildpackConfigurationContainer>
  );
};

export default BuildpackSettings;

const I = styled.i`
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  margin-right: 5px;
  justify-content: center;
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const BuildpackConfigurationContainer = styled.div`
  animation: ${fadeIn} 0.75s;
`;

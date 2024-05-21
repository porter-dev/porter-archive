import React from "react";
import Loading from "legacy/components/Loading";
import Container from "legacy/components/porter/Container";
import Error from "legacy/components/porter/Error";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { PorterAppFormData } from "legacy/lib/porter-apps";
import { BuildOptions } from "legacy/lib/porter-apps/build";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Buildpack } from "main/home/app-dashboard/types/buildpack";

import BuildpackCard from "./BuildpackCard";

interface Props {
  build: BuildOptions & {
    method: "pack";
  };
  availableBuildpacks: Buildpack[];
  setAvailableBuildpacks: (buildpacks: Buildpack[]) => void;
  showAvailableBuildpacks: boolean;
  isDetectingBuildpacks: boolean;
  detectBuildpacksError: string;
  droppableId: string;
}
const BuildpackList: React.FC<Props> = ({
  build,
  availableBuildpacks,
  setAvailableBuildpacks,
  showAvailableBuildpacks,
  isDetectingBuildpacks,
  detectBuildpacksError,
  droppableId,
}) => {
  const { control } = useFormContext<PorterAppFormData>();
  const { remove, append, swap } = useFieldArray({
    control,
    name: "app.build.buildpacks",
  });

  const handleRemoveBuildpack = (buildpackToRemove: string) => {
    const bpIdx = build.buildpacks.findIndex(
      (bp) => bp.buildpack === buildpackToRemove
    );
    const buildpack = build.buildpacks[bpIdx];
    if (bpIdx !== -1) {
      remove(bpIdx);
      if (buildpack) {
        setAvailableBuildpacks([...availableBuildpacks, buildpack]);
      }
    }
  };

  const handleAddBuildpack = (buildpackToAdd: string) => {
    const buildpackAdded = build.buildpacks.some(
      (bp) => bp.buildpack === buildpackToAdd
    );
    const buildpack = availableBuildpacks.find(
      (bp) => bp.buildpack === buildpackToAdd
    );
    if (!buildpackAdded && buildpack) {
      append(buildpack);
      setAvailableBuildpacks(
        availableBuildpacks.filter((bp) => bp.buildpack !== buildpackToAdd)
      );
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(build.buildpacks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    swap(result.source.index, result.destination.index);
  };

  const renderAvailableBuildpacks = () => {
    if (isDetectingBuildpacks) {
      return (
        <Container row>
          <Text color="helper">
            Detecting buildpacks in your repo from path {build.context}{" "}
          </Text>
          <Loading width="100px" />
        </Container>
      );
    }

    if (detectBuildpacksError) {
      return <Error message={detectBuildpacksError} />;
    }

    if (availableBuildpacks.length > 0) {
      return availableBuildpacks.map((buildpack, index) => {
        return (
          <BuildpackCard
            buildpack={buildpack}
            action={"add"}
            onClickFn={handleAddBuildpack}
            index={index}
            draggable={false}
            key={`${buildpack.name}-${index}-available`}
          />
        );
      });
    }

    return <Text color="helper">No available buildpacks detected.</Text>;
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {showAvailableBuildpacks && (
        <>
          <Spacer y={0.5} />
          <Text>Selected buildpacks:</Text>
          <Spacer y={0.5} />
        </>
      )}
      {build.buildpacks.length !== 0 && (
        <Droppable droppableId={droppableId}>
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {build.buildpacks.map((buildpack, index) => (
                <BuildpackCard
                  buildpack={buildpack}
                  action={"remove"}
                  onClickFn={handleRemoveBuildpack}
                  index={index}
                  draggable={true}
                  key={`${buildpack.name}-${index}-selected`}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
      {build.buildpacks.length === 0 && (
        <Text color="helper">No buildpacks selected.</Text>
      )}
      {showAvailableBuildpacks && (
        <>
          <Spacer y={0.5} />
          <Text>Available buildpacks:</Text>
          <Spacer y={0.5} />
          {renderAvailableBuildpacks()}
        </>
      )}
    </DragDropContext>
  );
};

export default BuildpackList;

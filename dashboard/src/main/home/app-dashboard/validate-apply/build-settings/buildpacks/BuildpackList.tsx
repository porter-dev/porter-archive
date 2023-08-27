import React from "react";
import BuildpackCard from "./BuildpackCard";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Loading from "components/Loading";
import Error from "components/porter/Error";
import { Droppable, DragDropContext } from "react-beautiful-dnd";
import { Buildpack } from "main/home/app-dashboard/types/buildpack";
import { useFieldArray, useFormContext } from "react-hook-form";
import { BuildOptions, PorterAppFormData } from "lib/porter-apps";

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
      return <Loading />;
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

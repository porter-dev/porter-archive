import React from "react";
import { PorterApp } from "../types/porterApp";
import { Buildpack } from "./BuildpackStack";
import BuildpackCard from "./BuildpackCard";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Loading from "components/Loading";
import Error from "components/porter/Error";
import { Droppable, DragDropContext } from "react-beautiful-dnd";

interface Props {
    porterApp: PorterApp,
    updatePorterApp: (attrs: Partial<PorterApp>) => void,
    selectedBuildpacks: Buildpack[],
    availableBuildpacks: Buildpack[],
    setSelectedBuildpacks: (buildpacks: Buildpack[]) => void,
    setAvailableBuildpacks: (buildpacks: Buildpack[]) => void,
    showAvailableBuildpacks: boolean,
    isDetectingBuildpacks: boolean,
    detectBuildpacksError: string,
    droppableId: string,
}
const BuildpackList: React.FC<Props> = ({
    porterApp,
    updatePorterApp,
    selectedBuildpacks,
    availableBuildpacks,
    setSelectedBuildpacks,
    setAvailableBuildpacks,
    showAvailableBuildpacks,
    isDetectingBuildpacks,
    detectBuildpacksError,
    droppableId,
}) => {
    const handleRemoveBuildpack = (buildpackToRemove: string) => {
        if (porterApp.buildpacks.includes(buildpackToRemove)) {
            updatePorterApp({ buildpacks: porterApp.buildpacks.filter(bp => bp !== buildpackToRemove) });
            const buildpack = selectedBuildpacks.find(bp => bp.buildpack === buildpackToRemove) as Buildpack;
            if (buildpack != null) {
                setAvailableBuildpacks([...availableBuildpacks, buildpack]);
                setSelectedBuildpacks(selectedBuildpacks.filter(bp => bp.buildpack !== buildpackToRemove));
            }
        }
    };

    const handleAddBuildpack = (buildpackToAdd: string) => {
        if (porterApp.buildpacks.find((bp) => bp === buildpackToAdd) == null) {
            updatePorterApp({ buildpacks: [...porterApp.buildpacks, buildpackToAdd] });
            const buildpack = availableBuildpacks.find((bp) => bp.buildpack === buildpackToAdd);
            if (buildpack != null) {
                setSelectedBuildpacks([...selectedBuildpacks, buildpack]);
                setAvailableBuildpacks(availableBuildpacks.filter((bp) => bp.buildpack !== buildpackToAdd));
            }
        }
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) {
            return;
        }
        const oldSelected = [...selectedBuildpacks];
        const [removed] = oldSelected.splice(result.source.index, 1);
        oldSelected.splice(result.destination.index, 0, removed);
        setSelectedBuildpacks(oldSelected);
        updatePorterApp({ buildpacks: oldSelected.map((bp) => bp.buildpack) });
    };

    const renderAvailableBuildpacks = () => {
        if (isDetectingBuildpacks) {
            return (
                <Loading />
            )
        }

        if (detectBuildpacksError) {
            return (
                <Error message={detectBuildpacksError} />
            )
        }

        if (availableBuildpacks.length > 0) {
            return (
                <>
                    <Spacer y={0.5} />
                    <Text>Available buildpacks:</Text>
                    <Spacer y={0.5} />
                    {availableBuildpacks.map((buildpack, index) => {
                        return (
                            <BuildpackCard
                                buildpack={buildpack}
                                action={"add"}
                                onClickFn={handleAddBuildpack}
                                index={index}
                                draggable={false}
                            />
                        )
                    })
                    }
                </>
            )
        }

        return (
            <>
                <Spacer y={0.5} />
                <Text color="helper">No buildpacks detected. Click 'Detect buildpacks' below to scan your repository for available buildpacks.</Text>
            </>
        )
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            {showAvailableBuildpacks &&
                <>
                    <Spacer y={0.5} />
                    <Text>Selected buildpacks:</Text>
                    <Spacer y={0.5} />
                </>
            }
            <Droppable droppableId={droppableId}>
                {provided => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                    >
                        {selectedBuildpacks?.map((buildpack, index) => (
                            <BuildpackCard
                                buildpack={buildpack}
                                action={"remove"}
                                onClickFn={handleRemoveBuildpack}
                                index={index}
                                draggable={true}
                                key={index}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
            {showAvailableBuildpacks && renderAvailableBuildpacks()}
        </DragDropContext>
    );
};

export default BuildpackList;
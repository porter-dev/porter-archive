import React, { Component } from "react";

import Heading from "../../form-components/Heading";
import InputRow from "../../form-components/InputRow";
import MultiSelect from "./MultiSelect";

type PropsType = {};

type StateType = {
  name: string;
  excludeNamespaces: string[];
  excludeResources: string[];
  includeNamespaces: string[];
  includeResources: string[];
  storageLocation: string;
  volumeSnapshotLocations: string[];
};

export default class VeleroForm extends Component<PropsType, StateType> {
  state = {
    name: "",
    excludeNamespaces: [] as string[],
    excludeResources: [] as string[],
    includeNamespaces: [] as string[],
    includeResources: [] as string[],
    storageLocation: "",
    volumeSnapshotLocations: [] as string[],
  };

  render() {
    return (
      <>
        <Heading>Create a Bakup</Heading>
        <InputRow
          placeholder="ex: my-backup"
          type="text"
          width="300px"
          value={this.state.name}
          setValue={(x: string) => this.setState({ name: x })}
          label="Name"
        />
        <MultiSelect />
      </>
    );
  }
}

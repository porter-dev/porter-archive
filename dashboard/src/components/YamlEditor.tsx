import React, { Component } from 'react';
import styled from 'styled-components';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/theme-monokai';

type PropsType = {
  value: string,
  onChange: (e: any) => void,
}

type StateType = {
}

class YamlEditor extends Component<PropsType, StateType> {

  // Uses the yaml-lint library to determine if a given string is valid yaml.
  // If the code is invalid, it returns an error message detailing what went wrong.
  checkYaml = () => {
    /*
    yamlLint.lint(y).then(() => {
      alert('Valid YAML file.');
    }).catch((error) => {
      alert(error.message);
    });
    */
  }

  // Calls checkYaml and passes in the value from the textarea
  handleChange = (e: any) => {
    this.setState({ yaml: e });
  }

  handleSubmit = (e: any) => {
    this.checkYaml();
    e.preventDefault();
  }

  render() {
    return (
      <Holder>
        <Editor onSubmit={this.handleSubmit}>
          <AceEditor
            mode='yaml'
            value={this.props.value}
            theme='monokai'
            onChange={this.props.onChange}
            name='codeEditor'
            editorProps={{ $blockScrolling: true }}
            width='100%'
            style={{ borderRadius: '5px' }}
          />
        </Editor>
      </Holder>
    );
  }
}

export default YamlEditor;

const Editor = styled.form`
  margin-top: 0px;
  margin-bottom: 12px;
  width: calc(100% - 0px);
  border-radius: 5px;
  border: 1px solid #ffffff22;
  height: 295px;
  overflow: auto;
`;

const Holder = styled.div`
`;